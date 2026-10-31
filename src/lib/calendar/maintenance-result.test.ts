import { expect,it } from 'vitest'
import { maintenanceResult } from './maintenance-result'
it('no presenta ausencia de fuentes ni errores parciales como una ejecución completa',()=>{
 expect(maintenanceResult(0,[],[])).toBe('NOT_OBSERVED')
 expect(maintenanceResult(1,['GOOGLE_WATCH_FAILED'],[])).toBe('PARTIAL')
 expect(maintenanceResult(1,[],[{state:'FAILED'}])).toBe('PARTIAL')
 expect(maintenanceResult(1,[],[{state:'SKIPPED'}])).toBe('PARTIAL')
 expect(maintenanceResult(1,[],[{state:'CONFIRMED'}])).toBe('COMPLETED')
})
