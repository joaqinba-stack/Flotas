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
| Ámbitos delimitados por actor; cada interviniente accede solo a su competencia | `middleware.ts`, `lib/auth/scope.ts`, `lib/data/*` (repositorios con scope obligatorio; regla ESLint prohíbe importar Prisma fuera de esa capa) |
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
| Intervalo de supervisión configurable por el cliente | `TraccarDevice.monitoringIntervalSeconds` |
| Alineación con el organigrama (divisiones, departamentos, bases logísticas) | `OrgUnit` con materialized path, `app/(admin)/organigrama` |
| Mesa de asistencia operativa 24/7 | `app/(desk)`, `DeskTicket` + `DeskTicketNote` |
| Autogestión total del personal del cliente | Principio transversal: toda acción administrativa está disponible en la UI |

### Puntos a corregir / tener en cuenta

- **Notificaciones de alerta (stub):** hoy se registran en `AlertNotificationLog` (no envían
  email/SMS reales). Suficiente para la demo; producción requiere conectar SMTP/SMS.
- **Secretos:** `AUTH_SECRET`, `TRACCAR_WEBHOOK_SECRET`, `SEED_PASSWORD` y la contraseña de Traccar
  vienen con valores de ejemplo. **Regenerarlos antes de exponer el VPS a Internet.**
- **Canal de voz de la mesa 24/7:** hoy un agente humano carga los tickets manualmente; integración
  de telefonía/IVR queda como alcance a definir con el cliente.
- **Hardware GPS y plazo de 30 días:** es una tarea de compra/instalación, no de software. Ver §4.

---

## 2. Instalar en un VPS (demo)

Requisitos del VPS: Linux con **Docker** y **Docker Compose v2**. 2 vCPU / 4 GB RAM alcanzan.

```bash
git clone <URL_DEL_REPO> flotas
cd flotas
git checkout claude/github-software-demo-readiness-3yh982

cp .env.example .env
# Editar .env y como mínimo cambiar:
#   AUTH_SECRET            -> openssl rand -base64 32
#   TRACCAR_WEBHOOK_SECRET -> un valor propio (y reflejarlo en docker/traccar/traccar.xml)
#   SEED_PASSWORD          -> la contraseña con la que entrarán los usuarios de demo

docker compose up -d --build
```

`docker compose up` levanta todo en orden: Postgres, Traccar, corre migraciones + seed
(servicio `migrate`), luego la app (`:3000`) y el worker de background.

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

> Nota: si cambiás `TRACCAR_WEBHOOK_SECRET` en `.env`, actualizá el mismo valor en
> `docker/traccar/traccar.xml` (`event.forward.header`) y reiniciá: `docker compose restart traccar`.

---

## 3. Acceder al software

Ir a `http://IP_DEL_VPS:3000`. Usuarios de demo (contraseña = el valor de `SEED_PASSWORD`):

| Rol | Email | Qué ve |
|---|---|---|
| Administración | `admin@flotas.local` | Todo el sistema, sin filtro |
| Supervisor | `supervisor@flotas.local` | Su rama del organigrama |
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
   - **Device identifier:** el `uniqueId` del dispositivo del vehículo. El seed ya trae uno
     (`356938035643809`) ligado a la unidad **AB123CD**. También podés dar de alta uno nuevo desde
     la web en *Flota → (vehículo) → Dispositivo* y usar ese identificador.
   - **Frequency:** p. ej. 30 s.
3. Activar el servicio ("Service status: ON"). Al moverse, el celular reporta a Traccar; el worker
   ingiere las posiciones y aparecen en **Mapa** (se refresca cada 5 s) y el dispositivo pasa a
   **ONLINE**. Mover el celular = mover la unidad en el mapa.

> El seed provisiona el dispositivo en Traccar automáticamente (el worker lo sincroniza). Si Traccar
> no lo reconoce, verificá que el **Device identifier** del celular sea exactamente el `uniqueId`
> registrado en la web.

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
npx prisma migrate deploy && npm run db:seed
npm run dev        # app en http://localhost:3000
npm run worker     # en otra terminal: worker de telemetría/alertas/reportes
```

Calidad (lo que corre CI): `npm run lint && npm run typecheck && npm test && npx next build`.
