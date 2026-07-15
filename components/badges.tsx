const STYLES: Record<string, { label: string; tone: string }> = {
  // VehicleStatus
  ACTIVE: { label: "Activo", tone: "green" },
  IN_MAINTENANCE: { label: "En mantenimiento", tone: "yellow" },
  OUT_OF_SERVICE: { label: "Fuera de servicio", tone: "red" },
  // DriverStatus
  INACTIVE: { label: "Inactivo", tone: "gray" },
  SUSPENDED: { label: "Suspendido", tone: "red" },
  // DeviceConnectionStatus
  ONLINE: { label: "En línea", tone: "green" },
  OFFLINE: { label: "Desconectado", tone: "red" },
  UNKNOWN: { label: "Sin datos", tone: "gray" },
  // JornadaStatus
  PLANNED: { label: "Planificada", tone: "blue" },
  IN_PROGRESS: { label: "En curso", tone: "green" },
  COMPLETED: { label: "Completada", tone: "gray" },
  CANCELLED: { label: "Cancelada", tone: "red" },
  // Validación de combustible
  PENDING: { label: "Pendiente", tone: "yellow" },
  VALID: { label: "Válida", tone: "green" },
  FLAGGED: { label: "Observada", tone: "red" },
  REJECTED: { label: "Rechazada", tone: "red" },
  // Incidencias
  OPEN: { label: "Abierta", tone: "red" },
  WAITING_SUPPLIER: { label: "Esperando proveedor", tone: "yellow" },
  RESOLVED: { label: "Resuelta", tone: "green" },
  CLOSED: { label: "Cerrada", tone: "gray" },
  LOW: { label: "Baja", tone: "gray" },
  MEDIUM: { label: "Media", tone: "blue" },
  HIGH: { label: "Alta", tone: "yellow" },
  CRITICAL: { label: "Crítica", tone: "red" },
  // Órdenes de servicio
  DRAFT: { label: "Borrador", tone: "gray" },
  SENT: { label: "Enviada", tone: "blue" },
  ACCEPTED: { label: "Aceptada", tone: "blue" },
  // Neumáticos / activos
  IN_STOCK: { label: "En depósito", tone: "gray" },
  MOUNTED: { label: "Montado", tone: "green" },
  IN_REPAIR: { label: "En reparación", tone: "yellow" },
  DISCARDED: { label: "De baja", tone: "red" },
  ASSIGNED: { label: "Asignado", tone: "green" },
  RETIRED: { label: "De baja", tone: "red" },
  // Viáticos / permisos
  REQUESTED: { label: "Solicitado", tone: "yellow" },
  APPROVED: { label: "Aprobado", tone: "green" },
  PAID: { label: "Pagado", tone: "gray" },
  // Alertas
  NEW: { label: "Nueva", tone: "red" },
  ACKNOWLEDGED: { label: "Reconocida", tone: "yellow" },
  INFO: { label: "Informativa", tone: "blue" },
  WARNING: { label: "Advertencia", tone: "yellow" },
  SPEEDING: { label: "Exceso de velocidad", tone: "red" },
  GEOFENCE_ENTER: { label: "Ingreso a geocerca", tone: "blue" },
  GEOFENCE_EXIT: { label: "Salida de geocerca", tone: "blue" },
  DEVICE_DISCONNECTED: { label: "Dispositivo desconectado", tone: "red" },
  UNAUTHORIZED_MOVEMENT: { label: "Movimiento no autorizado", tone: "red" },
  // Reportes
  QUEUED: { label: "En cola", tone: "blue" },
  RUNNING: { label: "Generando", tone: "yellow" },
  FAILED: { label: "Falló", tone: "red" },
};

export function StatusBadge({ value }: { value: string }) {
  const s = STYLES[value] ?? { label: value, tone: "gray" };
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}
