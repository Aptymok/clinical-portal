export function maintenanceResult(sources: number, errors: string[], jobs: Array<{state:string}>) {
  if (errors.length || jobs.some(job=>['FAILED','SKIPPED','SENT','PENDING'].includes(job.state))) return 'PARTIAL'
  return sources ? 'COMPLETED' : 'NOT_OBSERVED'
}
