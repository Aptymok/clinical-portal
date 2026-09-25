"use client"

import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'

function callbackFromLocation() {
  if (typeof window === 'undefined') return '/dashboard'
  return new URLSearchParams(window.location.search).get('callbackUrl') || '/dashboard'
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
  }

  return (
    <main className="container page" style={{ maxWidth: 520 }}>
      <h1>Acceso profesional</h1>
      <p>Ingresa con la cuenta autorizada del consultorio.</p>

      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Correo
          <input name="email" type="email" autoComplete="email" required />
        </label>

        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required minLength={12} />
        </label>

        {error ? <p role="alert">{error}</p> : null}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  )
}
