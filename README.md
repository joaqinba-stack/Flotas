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
del pliego) es una tarea de compra/logística, independiente del software. Al comprar, confirmar:
soporte del protocolo en Traccar, reconfiguración remota del intervalo de reporte y buffer local
para operar sin señal.

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
