import { describe, expect, it } from 'vitest'
import { calendarCoverage } from './coverage'
describe('calendar coverage',()=>{
 const fresh={id:'google',providerType:'GOOGLE_CALENDAR',readAuthority:true,lastSyncAt:new Date('2026-10-31T12:00:00Z'),webhookEnabled:true,config:{watchExpiration:String(new Date('2026-11-01').getTime())}}
 const now=new Date('2026-10-31T12:01:00Z')
 it('requires a fresh complete observation',()=>{expect(calendarCoverage([fresh],now).verified).toBe(true);expect(calendarCoverage([{...fresh,lastSyncAt:new Date('2020-01-01')}],now).verified).toBe(false)})
 it('rejects expired watch and empty external coverage',()=>{expect(calendarCoverage([{...fresh,config:{watchExpiration:'1'}}],now).verified).toBe(false);expect(calendarCoverage([],now).verified).toBe(false)})
 it('does not treat a disabled required source as absent',()=>expect(calendarCoverage([fresh,{...fresh,id:'doctoralia',providerType:'DOCPLANNER',enabled:false} as any],now).verified).toBe(false))
 it('ignores the internal portal as proof of external coverage',()=>expect(calendarCoverage([{...fresh,providerType:'CLINICAL_PORTAL'}],now).verified).toBe(false))
})
