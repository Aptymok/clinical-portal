import { HttpError } from './errors'
export function requireSameOrigin(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new HttpError('Origen no permitido.',403,'FORBIDDEN')
}
