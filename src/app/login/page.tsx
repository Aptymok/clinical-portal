"use client"

import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

function callbackFromLocation() {
  if (typeof window === 'undefined') return '/dashboard'
  const target = new URLSearchParams(window.location.search).get('callbackUrl') || '/dashboard'
  return target.startsWith('/') && !target.startsWith('//') && !target.includes('\\\\') ? target : '/dashboard'
}

export default function LoginPage() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    const callbackUrl = callbackFromLocation()

    try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl
    })

    setSubmitting(false)

    if (!result || result.error) {
      setError('No fue posible iniciar sesión. Verifica tus credenciales.')
      return
    }

    window.location.href = result.url || callbackUrl
    } catch {
      setSubmitting(false)
      setError('No se pudo establecer conexión. Inténtalo de nuevo.')
    }
  }

  return <div className="public-site"><PublicHeader/><main className="public-login-wrap"><div className="public-shell public-login-grid"><section className="public-login-intro"><p className="public-section-kicker">INMUNOCLINIC · ACCESO RESTRINGIDO</p><h1>La continuidad clínica comienza con un registro confiable.</h1><p>Acceso profesional a agenda maestra, consultas y seguimiento. Sólo personal autorizado del consultorio.</p><div className="public-login-points"><div><strong>Agenda maestra</strong><span>Eventos, conflictos y procedencia de calendarios.</span></div><div><strong>Expediente clínico</strong><span>Información reservada para el equipo de atención.</span></div><div><strong>Acceso protegido</strong><span>Las credenciales no se solicitan por teléfono ni redes sociales.</span></div></div><Link href="/">← Volver al sitio público</Link></section><section className="public-glass public-login-panel"><p className="public-section-kicker">PORTAL PROFESIONAL</p><h2>Iniciar sesión</h2><p>Utiliza las credenciales asignadas por la administración del consultorio.</p><form onSubmit={submit} className="public-login-form"><label htmlFor="clinic-email">Correo electrónico</label><input id="clinic-email" name="email" type="email" autoComplete="email" required placeholder="nombre@dominio.com"/><label htmlFor="clinic-password">Contraseña</label><input id="clinic-password" name="password" type="password" autoComplete="current-password" required placeholder="Tu contraseña"/>{error?<p role="alert" className="public-login-error">{error}</p>:null}<button className="public-cta" type="submit" disabled={submitting}>{submitting?'Verificando acceso…':'Entrar al Hub clínico →'}</button></form><p className="public-login-note">¿Problemas para acceder? Contacta directamente a la administración del consultorio. No compartas tu contraseña.</p><Link href="/aviso-de-privacidad">Aviso de privacidad</Link></section></div></main><PublicFooter/></div>
}
