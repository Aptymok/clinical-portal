'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { slotState, type CalendarDisplayEvent } from '@/lib/calendar/slot-view'

const labels = { BUSY:'Ocupado', FREE:'Libre verificado', UNKNOWN:'Sin verificar', CONFLICT:'Conflicto', CLOSED:'Fuera de horario' }
const format = new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',weekday:'short',day:'numeric',month:'short'})
const full = new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})
export default function CalendarSlotGrid({ startDate, events, verifiedUntil, pending, observedAt }: { startDate:string; events:CalendarDisplayEvent[]; verifiedUntil:number; pending:boolean; observedAt:number }) {
  const router = useRouter()
  const [week,setWeek] = useState(0)
  const [selected,setSelected] = useState<string | null>(null)
  const [now,setNow] = useState(observedAt)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()),30000); return () => clearInterval(timer) }, [])
  const dates = Array.from({length:7},(_,index)=>new Date(Date.parse(startDate+'T00:00:00-06:00')+(week*7+index)*86400000).toISOString().slice(0,10))
  const times = Array.from({length:24},(_,index)=>`${String(8+Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}`)
  const detail = selected ? slotState(selected,events,verifiedUntil,pending,now) : null
  return <section className="card slot-calendar" aria-label="Calendario por horarios">
    <div className="slot-toolbar"><div><h2>Consulta un horario</h2><p>Toca un bloque de 30 minutos para ver su estado y procedencia. Hora de Aguascalientes.</p></div><button className="btn" onClick={()=>{setNow(Date.now());router.refresh()}}>Actualizar agenda</button></div>
    <div className="slot-toolbar"><button className="btn" disabled={week===0} onClick={()=>{setWeek(0);setSelected(null)}}>← Primera semana</button><strong>{format.format(new Date(dates[0]+'T12:00:00-06:00'))} — {format.format(new Date(dates[6]+'T12:00:00-06:00'))}</strong><button className="btn" disabled={week===1} onClick={()=>{setWeek(1);setSelected(null)}}>Segunda semana →</button></div>
    <div className="slot-legend">{Object.entries(labels).map(([state,label])=><span key={state} className={'slot-key slot-'+state}>{label}</span>)}</div>
    <p>Un bloque sin verificar no está confirmado como libre. El sábado requiere confirmar el horario con el consultorio.</p>
    <p><small>Datos consultados: {full.format(new Date(observedAt))}. Usa «Actualizar agenda» para releer las citas.</small></p>
    <div className="slot-scroll"><table className="slot-table"><caption className="sr-only">Próximos catorce días; selecciona un horario</caption><thead><tr><th scope="col">Hora</th>{dates.map(date=><th scope="col" key={date}>{format.format(new Date(date+'T12:00:00-06:00'))}</th>)}</tr></thead><tbody>{times.map(time=><tr key={time}><th scope="row">{time}</th>{dates.map(date=>{
      const timestamp=date+'T'+time+':00-06:00'
      const result=slotState(timestamp,events,verifiedUntil,pending,now)
      return <td key={date}><button type="button" aria-pressed={selected===timestamp} className={'slot-button slot-'+result.status} aria-label={`${format.format(new Date(timestamp))}, ${time}: ${labels[result.status]}`} onClick={()=>setSelected(timestamp)}>{labels[result.status]}</button></td>
    })}</tr>)}</tbody></table></div>
    <div className="slot-details" role="status" aria-live="polite">{detail ? <><h3>{full.format(new Date(selected))}</h3><strong>{labels[detail.status]}</strong>{detail.events.length ? <ul>{detail.events.map(event=><li key={event.id}><strong>{event.title}</strong><p>{event.source} · {full.format(new Date(event.startsAt))} — {full.format(new Date(event.endsAt))}</p>{event.href ? <Link href={event.href}>Abrir cita →</Link>:null}</li>)}</ul> : <p>{detail.status==='FREE'?'Sin ocupación observada en las fuentes verificadas. La disponibilidad se volverá a comprobar al guardar una cita.':detail.status==='CLOSED'?'Fuera del horario público de consulta del doctor.':'No hay una reserva registrada en este bloque, pero falta confirmar cobertura, vigencia, horario o entregas pendientes.'}</p>}</> : <p>Selecciona un horario en la cuadrícula para consultar sus detalles.</p>}</div>
  </section>
}
