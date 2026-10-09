// Estados de la orden de reparación (mismos valores que el backend: models/RepairOrder.js)
export const ORDER_STATUSES = [
  { value: 'RECIBIDO', label: 'Recibido', color: 'blue-grey', icon: 'move_to_inbox' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico', color: 'info', icon: 'troubleshoot' },
  { value: 'EN_REPARACION', label: 'En reparación', color: 'accent', icon: 'build' },
  { value: 'ESPERANDO_REPUESTOS', label: 'Esperando repuestos', color: 'warning', icon: 'hourglass_top' },
  { value: 'FINALIZADO', label: 'Finalizado', color: 'positive', icon: 'task_alt' },
  { value: 'ENTREGADO', label: 'Entregado', color: 'primary', icon: 'local_shipping' },
]

export const ACTIVE_STATUSES = ['RECIBIDO', 'DIAGNOSTICO', 'EN_REPARACION', 'ESPERANDO_REPUESTOS', 'FINALIZADO']
export const CLOSED_STATUSES = ['FINALIZADO', 'ENTREGADO']

export const statusInfo = (value) =>
  ORDER_STATUSES.find((s) => s.value === value) || { value, label: value, color: 'grey', icon: 'help' }
