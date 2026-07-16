import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Documents(){
  const documents = await prisma.document.findMany({
    include: { patient: { include: { person: true } } },
    orderBy: { uploadedAt: 'desc' }
  })

  return (
    <>
      <Header />
      <div className="container page">
        <h2>Documentos</h2>
        <div className="card">
          {documents.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Documento</th>
                  <th>Subido</th>
                  <th>Enlace</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document: any) => (
                  <tr key={document.id}>
                    <td>{document.patient?.person?.firstName} {document.patient?.person?.lastName}</td>
                    <td>{document.key}</td>
                    <td>{formatDateTime(document.uploadedAt)}</td>
                    <td>{document.url ? <a href={document.url} target="_blank" rel="noreferrer">Abrir</a> : 'Sin enlace'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No hay documentos cargados en el sistema.</p>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
