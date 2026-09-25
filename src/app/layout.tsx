import type { Metadata } from 'next'
import Providers from './providers'
import '../styles/globals.css'
import '../styles/public.css'

export const metadata: Metadata = {
  title: {
    default: 'Inmunoclinic | Dr. Jesús Guillermo Espinoza Contreras',
    template: '%s | Inmunoclinic',
  },
  description: 'Alergología, inmunología clínica y medicina interna en Aguascalientes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
