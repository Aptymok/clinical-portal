import { expect, it } from 'vitest'
import { requireSameOrigin } from './same-origin'
it('rejects browser mutations from other origins or without an origin',()=>{
 expect(()=>requireSameOrigin(new Request('https://inmunoclinic.com/api/appointments',{method:'POST',headers:{origin:'https://evil.test'}}))).toThrow()
 expect(()=>requireSameOrigin(new Request('https://inmunoclinic.com/api/appointments',{method:'POST'}))).toThrow()
 expect(()=>requireSameOrigin(new Request('https://inmunoclinic.com/api/appointments',{method:'POST',headers:{origin:'https://inmunoclinic.com'}}))).not.toThrow()
})
