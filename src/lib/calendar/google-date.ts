export function googleDateValue(value?:{dateTime?:string;date?:string},timezone='America/Mexico_City') {
 if(value?.dateTime)return value.dateTime
 if(!value?.date)return null
 const midnight=Date.parse(`${value.date}T00:00:00Z`)
 let instant=midnight
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})
 for(let i=0;i<3;i++) {
   const parts=Object.fromEntries(fmt.formatToParts(new Date(instant)).map(part=>[part.type,part.value]))
   const localAsUtc=Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`)
   instant+=midnight-localAsUtc
 }
 return new Date(instant).toISOString()
}
