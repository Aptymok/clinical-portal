export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function getStatusText(status?: string | null) {
  const map: Record<string, string> = {
    SCHEDULED: 'Programada',
    CANCELLED: 'Cancelada',
    COMPLETED: 'Completada',
    NO_SHOW: 'No asistió',
    PLANNED: 'Planeada',
    IN_PROGRESS: 'En curso',
    FINISHED: 'Finalizada',
    ACTIVE: 'Activa',
    DRAFT: 'Borrador'
  }
  return map[status ?? ''] ?? status ?? '—'
}
