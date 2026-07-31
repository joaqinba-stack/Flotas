# Plataforma Flotas

Sistema de gestión y administración integral de parque automotor institucional.
Cubre los requerimientos del pliego "Objeto del Servicio": control por roles y organigrama,
tablero de flota en vivo e histórico, inventario (combustible, neumáticos, activos auxiliares),
legajos de personal y proveedores, planificación de jornadas, incidencias, auditoría de
combustible, reportes, telemetría GPS con alertas automáticas y mesa de asistencia 24/7.

**Stack:** Next.js (App Router, TypeScript) · PostgreSQL · Prisma · Auth.js (JWT) ·
Traccar (telemetría GPS self-hosted) · Docker Compose.

---

## 1. Estado de cumplimiento vs. pliego

El software implementa **las 7 fases** del pliego. Mapa requisito → módulo:

| Requisito del pliego | Dónde está implementado |
|---|---|
| Ámbitos delimitados por actor; cada interviniente accede solo a su competencia | `middleware.ts`, `lib/auth/scope.ts`, `lib/data/*` (repositorios con scope obligatorio; regla ESLint prohíbe importar Prisma fuera de esa capa; `tests/integration/scope.integration.test.ts` lo verifica) |
| Registros consolidados de flota: ubicación, disponibilidad, histórico trazable | `app/mapa`, `lib/data/positions.ts`, modelo `PositionSnapshot` |
| Legajo operativo por unidad (identificación, asignación, estado) | `app/(admin)/flota`, `Vehicle` + `VehicleStatusHistory` |
| Combustible: verificación previa, anomalías/duplicados, vínculo a unidad/responsable/actividad | `lib/validation/fuel-load-rules.ts`, `app/(admin)/combustible`, `FuelLoad.jornadaId` |
| Neumáticos: seguimiento, rotación, historial de movimientos | `app/(admin)/neumaticos`, `Tire` + `TireMovement` |
| Activos auxiliares: identificación patrimonial y vínculo operativo | `app/(admin)/activos`, `AuxiliaryAsset` |
| Legajos de conductores con visibilidad exclusiva de su propia información | `app/(driver)`, `DriverPerformanceRecord` |
| Proveedores ven solo sus órdenes / intervenciones | `app/(supplier)`, `SupplierServiceOrder` (filtro duro `supplierId`) |
| Jornada operativa: ciclo completo (viáticos, permisos, novedades, consumos) auditable | `lib/data/jornadas.ts`, `JornadaOperativa` + FKs |
| Incidencias vinculadas a la jornada, con urgencia, estado, notas y adjuntos | `app/(admin)/incidentes`, `Incident` + `IncidentNote` + `IncidentAttachment` |
| Reportes por evento o período, personalizables | `app/(admin)/reportes`, `lib/reports/*` (PDF/XLSX/CSV) |
| Alertas automáticas: exceso de velocidad, zonas, desconexión, traslado no autorizado | `lib/validation/alert-rules.ts`, `lib/jobs/evaluate-alert-rules.ts`, webhook de Traccar |
| Registro no se interrumpe por falla eléctrica/sin señal (buffer offline reconciliado) | `lib/traccar/normalize.ts` (`isBuffered`), `lib/jobs/poll-traccar-positions.ts` |
| Umbral de supervisión configurable por el cliente (dispara alerta de desconexión) | `TraccarDevice.monitoringIntervalSeconds`, `lib/jobs/evaluate-alert-rules.ts` |
| Alineación con el organigrama (divisiones, departamentos, bases logísticas) | `OrgUnit` con materialized path, `app/(admin)/organigrama` |
| Mesa de asistencia operativa 24/7 | `app/(desk)`, `DeskTicket` + `DeskTicketNote` |
| Autogestión total del personal del cliente | Principio transversal: toda acción administrativa está disponible en la UI |

### Puntos a corregir / tener en cuenta

- **Notificaciones de alerta (stub):** hoy se registran en `AlertNotificationLog` (no envían
  email/SMS reales). Suficiente para la demo; producción requiere conectar SMTP/SMS.
- **Intervalo de reporte del GPS:** `monitoringIntervalSeconds` define el **umbral de alerta de
  desconexión**, no la cadencia de reporte del hardware. Reconfigurar remotamente cada cuánto
  reporta el equipo (comando `positionPeriodic` de Traccar) depende del modelo de GPS y no está
  implementado en el MVP.
- **Secretos:** `AUTH_SECRET`, `TRACCAR_WEBHOOK_SECRET`, `SEED_PASSWORD` y la contraseña de Traccar
  vienen con valores de ejemplo. **Regenerarlos antes de exponer el VPS a Internet.**
- **Canal de voz de la mesa 24/7:** hoy un agente humano carga los tickets manualmente; integración
  de telefonía/IVR queda como alcance a definir con el cliente.
- **Hardware GPS y plazo de 30 días:** es una tarea de compra/instalación, no de software. Ver §4.

---

## 2. Instalar en un VPS

Requisitos del VPS: Linux con **Docker** y **Docker Compose v2**. 2 vCPU / 4 GB RAM alcanzan.

```bash
git clone https://github.com/joaqinba-stack/Flotas.git flotas
cd flotas          # rama por defecto: main

cp .env.example .env
# Editar .env y como mínimo cambiar:
#   AUTH_SECRET            -> openssl rand -base64 32
#   TRACCAR_WEBHOOK_SECRET -> un valor propio (y reflejarlo en docker/traccar/traccar.xml)
#   SEED_PASSWORD          -> la contraseña con la que entrarán los usuarios
#   TRACCAR_PASSWORD       -> la contraseña de la cuenta de servicio de Traccar

docker compose up -d --build
```

`docker compose up` levanta todo en orden: Postgres, Traccar, corre migraciones + seed
(servicio `migrate`), luego la app (`:3000`) y el worker de background.

El servicio `migrate` corre `npm run db:seed`, que crea **solo la cuenta de administración**
(`admin@flotas.local`). El sistema arranca vacío: el organigrama, la flota, los conductores y
todo lo demás se cargan desde la propia aplicación (autogestión). Ese es el estado correcto para
producción.

**Para una demo poblada** (dataset completo con todos los módulos cargados), corré además:

```bash
docker compose exec app npm run db:seed:demo
```

Comprobar que quedó arriba:

```bash
docker compose ps          # app, worker, traccar, app-db, traccar-db "running/healthy"
docker compose logs -f app # ver arranque de Next.js
```

**Abrir en el firewall del VPS** (o security group del proveedor cloud):

| Puerto | Uso |
|---|---|
| `3000/tcp` | Aplicación web |
| `8082/tcp` | Consola web de Traccar (opcional, para verificar dispositivos) |
| `5055/tcp` | Recepción de posiciones GPS desde el celular (app Traccar Client) |
| `5023/tcp` · `5013/tcp` | Protocolos de trackers cableados (teltonika / h02); abrir según hardware |

> Nota: si cambiás `TRACCAR_WEBHOOK_SECRET` en `.env`, actualizá el mismo valor en
> `docker/traccar/traccar.xml` (`event.forward.header`) y reiniciá: `docker compose restart traccar`.

---

## 3. Acceder al software

Ir a `http://IP_DEL_VPS:3000`.

- **Instalación limpia:** entrá con `admin@flotas.local` (contraseña = `SEED_PASSWORD`) y cargá el
  organigrama, la flota y los usuarios desde la UI.
- **Demo poblada** (si corriste `npm run db:seed:demo`): hay un usuario por rol
  (contraseña = `SEED_PASSWORD`):

| Rol | Email | Qué ve |
|---|---|---|
| Administración | `admin@flotas.local` | Todo el sistema, sin filtro |
| Supervisor | `supervisor@flotas.local` | Su rama del organigrama (Depto. de Operaciones) |
| Conductor | `chofer@flotas.local` | Solo sus jornadas, legajo y cargas |
| Proveedor | `proveedor@flotas.local` | Solo sus órdenes de servicio |
| Mesa 24/7 | `mesa@flotas.local` | Tickets, planificación, alertas |

**Recorrido sugerido para la demo:** Panel → Flota (legajo operativo) → Mapa en vivo →
Jornada operativa → Combustible (mostrar validación de anomalías) → Incidencia → Orden a proveedor
(entrar como proveedor y ver que solo ve la suya) → Alertas → generar Reporte PDF → Mesa 24/7.

### Requisitos del equipo desde el que se accede

Casi todo se renderiza en el servidor, así que el puesto de trabajo exige poco: cualquier PC,
tablet o celular de 2015 en adelante con 2 GB de RAM. Lo único que corre pesado en el cliente es
Leaflet. Lo que sí es obligatorio:

- Navegador actual (Chrome, Edge, Firefox, Safari) con **EventSource / SSE**: el mapa en vivo se
  alimenta por stream, no por polling. Internet Explorer queda afuera.
- **Salida a Internet hacia `tile.openstreetmap.org`.** Los tiles no están self-hosted; en una red
  que bloquee la salida el mapa aparece en blanco aunque el resto del sistema funcione.
- Cookies habilitadas (la sesión de Auth.js es un JWT en cookie) y alcance al puerto `3000` del VPS.
- Poder descargar archivos, para los reportes en PDF / XLSX / CSV.

---

## 4. Dispositivos en los móviles (unidades)

### Para la demo hoy: un celular como tracker (sin comprar hardware)

Usar la app gratuita **Traccar Client** (Android / iOS) en un teléfono dentro de la unidad:

1. Instalar **Traccar Client** desde la tienda de apps.
2. En la app configurar:
   - **Server URL:** `http://IP_DEL_VPS:5055`
   - **Device identifier:** el `uniqueId` del dispositivo del vehículo. El seed demo trae uno
     (`356938035643809`) ligado a la unidad **AB123CD**. También podés dar de alta uno nuevo desde
     la web en *Flota → (vehículo) → Dispositivo* y usar ese identificador.
   - **Frequency:** p. ej. 30 s.
3. Activar el servicio ("Service status: ON"). Al moverse, el celular reporta a Traccar; el worker
   ingiere las posiciones y aparecen en **Mapa** (se refresca cada 5 s) y el dispositivo pasa a
   **ONLINE**. Mover el celular = mover la unidad en el mapa.

> El dispositivo del seed demo se registra en la app con `traccarId` null; el worker lo sincroniza
> con Traccar en el primer ciclo de polling. Si Traccar no lo reconoce, verificá que el **Device
> identifier** del celular sea exactamente el `uniqueId` registrado en la web. El detalle del
> vehículo muestra el estado de sincronización (Sincronizado / Sin sincronizar).

### En producción: trackers GPS cableados

Cualquier equipo soportado por Traccar, p. ej. **Teltonika** (protocolo `teltonika`, puerto `5023`,
ya expuesto) o un equipo **H02** (puerto `5013`). Se instala uno por unidad, apuntando a
`IP_DEL_VPS:<puerto del protocolo>`. La elección del modelo (y el plazo de instalación de 30 días
del pliego) es una tarea de compra/logística, independiente del software.

### Características mínimas del equipo GPS

Lo que sigue es el pliego técnico de compra visto desde el software: cada fila existe porque hay
código que la consume. Un equipo que cumple esta tabla cubre **todas** las funciones de telemetría
implementadas; lo que no está acá, el sistema no lo lee.

**Indispensable** — sin esto quedan requisitos del pliego sin cubrir:

| Requisito | Por qué |
|---|---|
| Protocolo soportado por Traccar, con su puerto publicado | Hoy están abiertos `5023` (teltonika), `5013` (h02) y `5055` (OsmAnd). Otro protocolo exige agregar el puerto en [docker-compose.yml](docker-compose.yml) y en el firewall |
| Identificador único fijo (IMEI) | Se carga en *Flota → (vehículo) → Dispositivo* (`TraccarDevice.uniqueId`). Es `@unique`: un equipo por unidad |
| Trama con latitud, longitud, velocidad y **hora del fix generada por el equipo** | [lib/traccar/normalize.ts](lib/traccar/normalize.ts) toma `fixTime ?? deviceTime ?? serverTime`. Si el equipo no fecha el fix, todo dato reconciliado se registra con la hora en que llegó y el buffer offline deja de distinguirse |
| Reporte periódico de 30 a 60 s, configurable | `monitoringIntervalSeconds` vale 60 por defecto y la alerta de desconexión salta a 3× ese valor. El worker evalúa reglas cada 30 s y hace polling cada 60 s; reportar más lento obliga a subir el umbral y las alertas llegan tarde |
| **Buffer local con reenvío al recuperar señal** | Es la mitad del requisito "el registro no se interrumpe". El software lo detecta y lo marca: si la hora del fix quedó más de 120 s por detrás de la de recepción, la posición se guarda con `isBuffered = true` (`TRACCAR_BUFFERED_GAP_SECONDS`) |
| **Batería interna de respaldo** | La otra mitad: corte eléctrico del vehículo sin corte de registro. Sin batería, quedarse sin corriente es indistinguible de que arranquen el equipo |
| Módem celular con cobertura en Paraguay y APN configurable | Conviene 4G LTE (Cat-1 o Cat-M) y no depender de 2G, en retiro |

**Recomendable** — el sistema funciona sin esto, pero degradado:

| Característica | Qué habilita |
|---|---|
| Entrada de ignición cableada (ACC) | Llega como `attributes.ignition`. Sin ella, la alerta de *movimiento no autorizado* solo dispara con velocidad mayor a 5 km/h; con ella dispara con el motor encendido y la unidad detenida ([lib/validation/alert-rules.ts](lib/validation/alert-rules.ts)). Es también la columna "Encendida/Apagada" del historial |
| GNSS multiconstelación (GPS + GLONASS/Galileo), precisión de 5 a 10 m | El kilometraje descarta tramos de menos de 10 m y saltos que impliquen más de 160 km/h ([lib/telemetry/distance.ts](lib/telemetry/distance.ts)). Un receptor con mucha deriva pierde recorrido real dentro de esos filtros: en el histórico del VPS la deriva ya representa entre 16 % y 18 % de la suma cruda |
| Reconfiguración remota del intervalo de reporte (`positionPeriodic`) | Cambiar la cadencia sin ir hasta el vehículo. No está implementado en la UI del MVP: se hace desde la consola de Traccar o por SMS, según el modelo |
| Rumbo (`course`) y alarma nativa de exceso de velocidad | El rumbo se guarda en cada posición. La alarma `overspeed` se traduce a alerta `SPEEDING` en el webhook, pero es redundante: el motor propio ya calcula el exceso contra `SPEED_LIMIT_KMH` |

**No hace falta pagarlo:** sensor de combustible, lectura CAN/OBD, RFID de conductor, cámara,
botón de pánico, micrófono. Ningún módulo los consume — los `attributes` de Traccar se guardan
crudos en JSON pero no hay lectores. El combustible se carga a mano y se audita por reglas
([lib/validation/fuel-load-rules.ts](lib/validation/fuel-load-rules.ts)).

Mención aparte para el odómetro del equipo (`totalDistance`): se guarda en `odometerKm`, pero el
kilometraje **no** se calcula con él. Traccar lo obtiene sumando la distancia entre fixes, así que
arrastra la misma deriva que la suma cruda. No es criterio de compra.

### Si se usa un celular en vez de un tracker

Sirve para la demo y para rastrear al conductor (`DriverDevice`), no para cumplir el pliego: hace
falta Android/iOS con GPS, plan de datos, permiso de ubicación *siempre* y el celular excluido del
ahorro de batería para que el servicio no muera en segundo plano. Si el teléfono se apaga no hay
buffer ni respaldo eléctrico, que es justo lo que el pliego pide garantizar.

---

## 5. Desarrollo local (sin Docker para la app)

```bash
cp .env.example .env
docker compose up -d app-db traccar traccar-db   # solo la infraestructura
npm ci
npx prisma migrate deploy
npm run db:seed         # solo admin (producción)
npm run db:seed:demo    # opcional: dataset completo para probar todos los módulos
npm run dev             # app en http://localhost:3000
npm run worker          # en otra terminal: worker de telemetría/alertas/reportes
```

### Calidad

Lo que corre CI (puro, sin base de datos):

```bash
npm run lint && npm run typecheck && npm test && npx next build
```

Tests de integración de scoping por rol (requieren una base de datos dedicada; ver
`tests/integration/README.md`):

```bash
docker exec -i flotas-app-db-1 psql -U flotas -d flotas -c "CREATE DATABASE flotas_test;"
DATABASE_URL="postgresql://flotas:flotas@localhost:5432/flotas_test" npx prisma migrate deploy
npm run test:integration
```
