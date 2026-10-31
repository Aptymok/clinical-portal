import { afterEach, expect, it, vi } from 'vitest'
import { upsertGenericBusy } from './generic-webhook'
const source={id:'third',config:{writeUrl:'https://calendar.example.test/events'}} as any
const event={canonicalKey:'appointment:qa',providerRef:'qa',startsAt:new Date('2030-01-01T16:00:00Z'),endsAt:new Date('2030-01-01T16:30:00Z'),timezone:'America/Mexico_City',status:'BUSY'} as any
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('refuses to send without a signing secret',async()=>{vi.stubEnv('THIRD_CALENDAR_WEBHOOK_SECRET','');vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({ok:true})));await expect(upsertGenericBusy(source,event)).rejects.toThrow('signing secret')})
it('does not confirm arbitrary HTTP success',async()=>{vi.stubEnv('THIRD_CALENDAR_WEBHOOK_SECRET','qa-only');vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({ok:true})));await expect(upsertGenericBusy(source,event)).rejects.toThrow('receipt')})
it('requires the exact observed event state',async()=>{vi.stubEnv('THIRD_CALENDAR_WEBHOOK_SECRET','qa-only');vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({canonicalKey:event.canonicalKey,action:'UPSERT_BUSY',observed:true,startsAt:event.startsAt.toISOString(),endsAt:event.endsAt.toISOString(),status:'BUSY'})));await expect(upsertGenericBusy(source,event)).resolves.toHaveProperty('observedState.observed',true)})
