const roots = ['/dashboard', '/portal', '/patients', '/appointments', '/encounters', '/documents']
export function safeCallback(value: string | null | undefined) {
  if (!value || /[\\\s%]/.test(value)) return '/dashboard'
  return roots.some(root => value === root || value.startsWith(root + '/') || value.startsWith(root + '?')) ? value : '/dashboard'
}
