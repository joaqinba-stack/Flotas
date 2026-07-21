# Plataforma Flotas — Plan de Implementación

## Contexto

El cliente emitió un pliego de especificaciones técnicas para la contratación de un servicio de gestión y administración integral del parque automotor institucional (44 unidades). El pliego describe requisitos funcionales (no técnicos) que el sistema debe garantizar: control de acceso por roles, tablero de flota en tiempo real e histórico, control de inventario (combustible, neumáticos, activos auxiliares), legajos de personal, planificación de jornadas operativas, gestión de incidencias, auditoría de combustible, reportes, telemetría GPS con alertas automáticas, alineación con el organigrama institucional, una mesa de asistencia operativa 24/7, y autogestión total por parte del personal del cliente.

El repositorio `Flotas` está completamente vacío (sin commits). Este plan define la arquitectura y hoja de ruta para construir la plataforma desde cero.

**Decisiones ya tomadas (no reabrir):**
- Stack: **Next.js (App Router) full-stack en TypeScript + PostgreSQL**, ORM **Prisma**, repo único.
- Capa GPS/telemetría: **Traccar self-hosted** (servidor de rastreo open-source); la plataforma consume su API/WebSocket en vez de reimplementar protocolos de dispositivos.
- Priorización: **MVP primero**, rollout interno por fases (aunque el pliego exige operatividad plena "desde el día 1" como compromiso contractual — ver Riesgos).
- Choferes y proveedores **tienen login individual propio** desde la Fase 1 (visibilidad exclusiva de su propia información).
- Hosting: se asume **cloud estándar** (AWS o similar) como default de diseño; documentar migración a on-premise como posibilidad futura si el contrato lo exige.

---

## 1. Modelo de datos (Prisma)

Agrupado por dominio — campos representativos, no exhaustivos.

**Identidad y organización**
- `OrgUnit` (árbol auto-referenciado: divisiones/departamentos/bases logísticas), con `path` de materialized path para scoping eficiente.
- `User`: role (ADMIN, SUPERVISOR, DRIVER, SUPPLIER, DESK_AGENT), orgUnitId, driverId?, supplierId?.

**Flota**
- `Vehicle` ("Legajo operativo"): placa, estado, orgUnitId, currentDriverId. El vínculo con el GPS es la relación 1:1 inversa `TraccarDevice.vehicleId` (la FK vive en `TraccarDevice`, no en `Vehicle`).
- `VehicleStatusHistory`, `Driver`, `DriverPerformanceRecord` (legajo histórico append-only), `Supplier`, `SupplierServiceOrder`.

**Inventario**
- `FuelLoad` (litros, odómetro, jornadaId, validationFlags/validationStatus), `Tire` + `TireMovement` (montaje/rotación/baja), `AuxiliaryAsset` + `AuxiliaryAssetMovement`.

**Planificación — "jornada operativa" (columna vertebral de trazabilidad)**
- `JornadaOperativa`: vehicleId, driverId, orgUnitId, planned/actual start-end, status.
- `Viatico`, `Permit`, `Novedad` — todos con FK a `JornadaOperativa`.
- `FuelLoad.jornadaId` e `Incident.jornadaId` también enlazan aquí, cumpliendo el requisito de "ciclo completo de la operación" auditable.

**Incidencias**
- `Incident` (urgencia, estado, jornadaId, vehicleId) + `IncidentNote` (timeline de avances/soluciones) + `IncidentAttachment`.
- `SupplierServiceOrder.incidentId` conecta incidencias con despacho a proveedores.

**Telemetría / Traccar**
- `TraccarDevice` (1:1 con Vehicle, monitoringIntervalSeconds configurable por cliente).
- `PositionSnapshot` (copia durable de posiciones, con `isBuffered` para detectar reconciliación offline).
- `Geofence`, `Alert` (SPEEDING, GEOFENCE_ENTER/EXIT, DEVICE_DISCONNECTED, UNAUTHORIZED_MOVEMENT), `AlertNotificationLog`.

**Reportes**
- `ReportDefinition` (config JSON de filtros/columnas, validado con Zod), `ReportRun` (PDF/XLSX/CSV, async vía job).

**Mesa 24/7**
- `DeskTicket` (channel, linkedIncidentId), `DeskTicketNote`.

---

## 2. Modelo de autorización / scoping

**Patrón: claims en sesión JWT + capa centralizada de repositorios con scope, no Postgres RLS puro (por ahora).**

- Sesión (Auth.js v5, Credentials provider, JWT): `userId`, `role`, `orgUnitId`, `driverId?`, `supplierId?`.
- Scoping por jerarquía organizacional vía **materialized path** en `OrgUnit` (`ltree` o string con índice) → `WHERE orgUnit.path <@ :miPath`.
- **Regla estructural clave**: ninguna Route Handler / Server Action / Server Component puede importar `@prisma/client` directamente para entidades con scope — solo a través de `lib/data/*` (repositorios que reciben la sesión como primer argumento obligatorio e inyectan el filtro). Se refuerza con una regla de ESLint (`no-restricted-imports`) para que una fuga de datos entre roles sea estructuralmente difícil, no solo una cuestión de diligencia por endpoint. Esto es crítico dado que es un sistema gubernamental.
- Reglas concretas por rol:
  - `ADMIN`: sin filtro.
  - `SUPERVISOR` / `DESK_AGENT`: filtro por `orgUnit.path` (org-scoped).
  - `DRIVER`: filtro duro `driverId = session.driverId` (nunca por organigrama).
  - `SUPPLIER`: filtro duro `supplierId = session.supplierId`, visibilidad derivada solo a través de sus propias órdenes.
- Postgres RLS se documenta como capa de defensa adicional para una fase de hardening posterior, una vez validadas las reglas a nivel de aplicación — no se construye en el MVP.
- `middleware.ts` maneja el guard grueso por ruta (ej. `/proveedor/*` requiere role=SUPPLIER); la lógica fina de scoping vive siempre en `lib/data`.

---

## 3. Integración con Traccar

- Traccar corre self-hosted (Docker), con su propia base de datos separada de la de la app — se integra solo vía API, nunca compartiendo esquema.
- **Ingesta híbrida**: webhook de eventos de Traccar (`deviceOnline/Offline`, `geofenceEnter/Exit`, alarmas) hacia `app/api/traccar/webhook`, + conector WebSocket server-side para posiciones en vivo (republicadas a los clientes vía SSE o Postgres `LISTEN/NOTIFY`, filtradas por scope del viewer), + job de polling periódico como respaldo de reconciliación.
- Cada posición recibida se normaliza y persiste en `PositionSnapshot` (copia durable, no solo proxy en vivo) — sostiene el requisito de historial auditable independiente de la retención propia de Traccar.
- **Alertas nativas de Traccar** (desconexión, geocercas, exceso de velocidad si el dispositivo lo soporta) se traducen directo a `Alert`. **Movimiento no autorizado** requiere una capa de reglas propia: se dispara si hay movimiento con ignición encendida sin una `JornadaOperativa` activa para esa unidad/horario.
- **Reconciliación offline**: se compara `recordedAt` (hora del dispositivo) vs `receivedAt` (ingesta); un gap grande marca `isBuffered = true`, preservando una línea de tiempo operativa precisa aun con cortes de señal/eléctricos, tal como exige el pliego.
- El intervalo de monitoreo configurable por el cliente (`monitoringIntervalSeconds`) define el **umbral de alerta de desconexión** (un dispositivo se marca desconectado si no reporta por más de N veces su intervalo — ver `lib/jobs/evaluate-alert-rules.ts`). El polling de reconciliación corre a una cadencia fija (`POLL_INTERVAL_MS` en `scripts/worker.ts`), independiente de este valor. El control remoto real del intervalo de reporte del hardware (comando `positionPeriodic` de Traccar) depende del modelo de dispositivo GPS que se adquiera (ver Riesgos) y no está implementado en el MVP.

---

## 4. Fases de implementación

**Fase 0 — Scaffolding**: repo Next.js, Prisma schema base (OrgUnit/User/Role), Auth.js con claims JWT, layout con nav por rol, Docker Compose (Postgres app + Traccar + Traccar DB), seed de org units y usuarios de prueba por rol, CI (lint/typecheck/test).

**Fase 1 — Núcleo** (requisitos #1, #2 parcial, #10, #12 parcial, #14): CRUD de vehículos ("Legajo operativo"), CRUD de choferes con asignación, gestión de organigrama, provisión de `TraccarDevice` + mapa en vivo + historial básico de posiciones. Incluye rutas `(admin)`, `(driver)`, `(supplier)` desde el inicio (login individual para choferes/proveedores).

**Fase 2 — Inventario y combustible** (#3, #7): carga de combustible con motor de validación (duplicados/anomalías/capacidad), seguimiento de neumáticos, registro de activos auxiliares. Requiere una versión mínima de `JornadaOperativa` como dependencia compartida (id, vehículo, chofer, rango de fecha) para poder vincular las cargas de combustible.

**Fase 3 — Planificación y legajo de personal** (#4, #5): jornada operativa completa, viáticos, permisos, novedades, legajo histórico de desempeño de choferes, vista de auditoría por jornada.

**Fase 4 — Incidencias y portal de proveedores** (#4 proveedores, #6): intake/clasificación/notas/adjuntos de incidencias, portal de proveedores con sus propias órdenes, flujo de despacho incidencia → orden de servicio.

**Fase 5 — Motor de alertas** (#9, lado software): reglas de exceso de velocidad/geocercas/desconexión/movimiento no autorizado, gestión de geocercas, notificaciones (email/SMS/push), flujo de reconocimiento de alertas.

**Fase 6 — Reportes** (#8): constructor de definiciones de reporte (filtros/columnas configurables vía JSON+Zod, siempre pasando por los repositorios con scope para no filtrar datos entre roles), generación async, export PDF/XLSX.

**Fase 7 — Mesa 24/7** (#11): cola de tickets omnicanal, vinculación a incidencias y jornadas, herramienta de planificación de viajes/insumos basada en históricos. El canal de voz queda como pregunta abierta (ver Riesgos) — probablemente arranca con un agente humano cargando manualmente en la misma cola.

**Transversal desde la Fase 1**: la autogestión del cliente (#12) no es un módulo aparte — es un principio de diseño: toda acción administrativa debe estar disponible en la UI sin pasos exclusivos del contratista.

---

## 5. Estructura del proyecto

```
flotas/
  app/
    (auth)/           -- login, recuperar, restablecer (recuperación de contraseña)
    (admin)/          -- panel, flota, conductores, organigrama, usuarios, datos (catálogos),
                          combustible, neumaticos, activos, jornadas, incidentes, ordenes,
                          proveedores, alertas, geocercas, reportes
    (driver)/conductor/
    (supplier)/proveedor/
    (desk)/desk/
    mapa/
    api/               -- vehicles, drivers, org-units, fuel-loads, tires, jornadas, incidents,
                          supplier-orders, alerts, geofences, report-definitions, report-runs,
                          desk-tickets, traccar/webhook, positions/[vehicleId], positions/latest,
                          positions/stream (SSE), auth/[...nextauth]
  lib/
    data/              -- repositorios con scope, ÚNICA capa que puede importar @prisma/client
    auth/              -- config.ts, session.ts (requireSession), scope.ts (buildOrgScopeWhere), index.ts
    traccar/           -- client.ts, websocket-connector.ts, normalize.ts
    catalogs/          -- registry.ts (valores y etiquetas por defecto de catálogos/enums)
    jobs/              -- proceso worker (scripts/worker.ts) con WebSocket + setInterval:
                          poll-traccar-positions, evaluate-alert-rules, generate-report,
                          send-alert-notifications, raise-alert
                          (una cola persistente tipo pg-boss/graphile-worker queda como
                          hardening futuro; hoy son intervalos en memoria)
    validation/        -- fuel-load-rules.ts, alert-rules.ts, geofence-geometry.ts,
                          trip-planning.ts, inputs.ts (Zod), alert-rules, fuel-load-rules
    reports/           -- definitions.ts, datasets.ts, pdf-export.ts, xlsx-export.ts, csv-export.ts
    mailer.ts, storage.ts, format.ts
  prisma/schema.prisma, migrations/, seed.ts (admin), seed-demo.ts (dataset completo)
  components/          -- badges, sidebar, *-form, map/ (live-map, history-map)
  scripts/worker.ts    -- proceso de background (telemetría/alertas/reportes)
  tests/               -- unitarios (puros) + integration/ (scoping con DB de test)
  docker-compose.yml   -- app-db postgres, traccar, traccar-db, migrate, app, worker
  middleware.ts
```

Convenciones a fijar en Fase 0: regla de ESLint que prohíbe `@prisma/client` fuera de `lib/data/**`, `lib/jobs/**`, `prisma/**` y `tests/integration/**` (seeds, migraciones y fixtures de test sí pueden usar el cliente crudo); toda Route Handler/Server Action empieza con `requireSession()`; timestamps en UTC, mostrados en la zona horaria configurada.

---

## 6. Verificación

- **Fase 0**: login funcional para cada rol, navegación con guard por rol funcionando, `docker compose up` levanta app + Postgres + Traccar sin errores.
- **Cada fase siguiente**: probar el flujo end-to-end en navegador con al menos un usuario por rol relevante (ej. Fase 1: crear vehículo como ADMIN, verificar que un DRIVER no vea vehículos fuera de su asignación, verificar que el mapa en vivo reciba posiciones reales de un dispositivo Traccar de prueba).
- Verificar específicamente que el scoping por rol funcione mediante pruebas manuales/automatizadas que confirmen que un usuario DRIVER o SUPPLIER no puede acceder a datos fuera de su alcance vía la capa de datos (no solo ocultos en la UI). **Implementado**: `tests/integration/scope.integration.test.ts` golpea `lib/data` con la sesión de cada rol contra una base dedicada (`npm run test:integration`).
- Tests unitarios de reglas puras (`lib/validation/*`: combustible, alertas, geocercas, planificación) y de `lib/auth/scope.ts` en `tests/*.test.ts` (`npm test`), más los de integración de scoping sobre `lib/data/*`, dado que son los puntos de mayor riesgo de negocio.

---

## 7. Riesgos y preguntas abiertas para el cliente/stakeholder (no bloquean el inicio, pero deben resolverse pronto)

1. **Modelo de hardware GPS**: el requisito de instalación en 30 días depende del modelo de dispositivo a adquirir — confirma soporte de protocolo en Traccar, si permite reconfiguración remota del intervalo de reporte, y su capacidad de buffer local offline.
2. **Canal de voz de la mesa 24/7**: ¿alcanza con un agente humano cargando manualmente los tickets, o se requiere integración de telefonía/IVR (ej. Twilio Voice)? Cambia el alcance de la Fase 7.
3. **Punto de corte contractual de "día uno"**: el pliego exige operatividad plena desde el inicio; el roadmap interno es por fases. Se necesita definir con el cliente/área legal qué fase se presenta como "go-live" y si es aceptable un período de convivencia con el proceso actual.
4. **Umbrales de validación de combustible**: "detección de anomalías/duplicados" (#7) requiere reglas de negocio concretas (litros máximos vs. capacidad de tanque, tiempo/km mínimo entre cargas) que debe definir el área de operaciones de flota del cliente.
5. **Retención de reportes/datos**: confirmar si existe un período mínimo de retención legal (registros públicos/auditoría) que condicione el diseño de archivado de `PositionSnapshot`/`ReportRun`.
6. **Soporte operativo de Traccar**: confirmar quién asume el mantenimiento continuo de la instancia Traccar (parches, nuevos protocolos de dispositivos) como scope de infraestructura separado del desarrollo de la plataforma.

---

## Archivos críticos

- `prisma/schema.prisma` — modelo de datos completo, fuente única de verdad.
- `lib/auth/scope.ts` — lógica de scoping por organigrama + rol (`buildOrgScopeWhere`).
- `lib/data/jornadas.ts` — repositorio de `JornadaOperativa`, columna vertebral de trazabilidad.
- `lib/traccar/normalize.ts` — mapeo de payloads de Traccar y detección de datos bufferizados/offline.
- `middleware.ts` — primera línea de guard por rol.
