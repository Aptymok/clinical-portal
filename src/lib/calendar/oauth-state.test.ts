import {afterEach,expect,it,vi} from 'vitest'
import {signCalendarOAuthState,verifyCalendarOAuthState} from './oauth-state'
afterEach(()=>vi.unstubAllEnvs())
it('uses the configured Auth.js secret consistently',()=>{vi.stubEnv('AUTH_SECRET','qa-auth-only');vi.stubEnv('NEXTAUTH_SECRET','');const state=signCalendarOAuthState({sourceId:'qa',issuedAt:Date.now()});expect(verifyCalendarOAuthState(state).sourceId).toBe('qa')})
it('rejects expiry and tampering',()=>{vi.stubEnv('AUTH_SECRET','qa-auth-only');vi.stubEnv('NEXTAUTH_SECRET','qa-auth-only');const state=signCalendarOAuthState({sourceId:'qa',issuedAt:Date.now()-3600000});expect(()=>verifyCalendarOAuthState(state)).toThrow('Expired');expect(()=>verifyCalendarOAuthState(state+'x')).toThrow()})
