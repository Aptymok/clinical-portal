"use client";
import Link from 'next/link';

export default function Header(){
  return (
    <header className="site-header">
      <div className="container">
        <div className="brand">
          <div className="logo" aria-hidden />
          <div>
            <h1>PORTAL CLÍNICO</h1>
            <div style={{fontSize:12,color:'var(--white)',opacity:0.9}}>Gestión Integral de Salud</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/">Inicio</Link>
          <Link href="/patients">Pacientes</Link>
          <Link href="/dashboard">Profesionales</Link>
          <Link href="/appointments">Citas</Link>
          <Link href="/encounters">Consultas</Link>
          <Link href="/documents">Documentos</Link>
        </nav>
        <div style={{marginLeft:12}}>
          <Link href="/login"><button className="btn">Iniciar sesión</button></Link>
        </div>
      </div>
    </header>
  )
}
