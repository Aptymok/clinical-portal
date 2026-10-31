'use client'
import Link from 'next/link'
export default function ErrorPage({ reset }: {reset:()=>void}) {
  return <main className="container clinic-workspace"><p className="eyebrow">INMUNOCLINIC</p><h1>No pudimos cargar esta información.</h1><p>El servicio o su conexión de datos no está disponible en este momento. No se muestran cifras ni resultados sustitutos.</p><button className="btn" onClick={reset}>Volver a intentar</button><p><Link href="/">Ir al sitio público</Link></p></main>
}
