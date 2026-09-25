export const publicPhysician = {
  slug: 'dr-jesus-guillermo-espinoza-contreras',
  name: 'Dr. Jesús Guillermo Espinoza Contreras',
  clinicName: 'Inmunoclinic',
  specialties: ['Alergología', 'Inmunología clínica', 'Medicina interna'],
  focus: 'Inmunología clínica y alergia',
  description:
    'Médico internista, alergólogo e inmunólogo en Aguascalientes, con formación de posgrado en la UNAM y doctorado en ciencias biológicas por la UAA.',
  patients: ['Adultos', 'Niños'],
  languages: ['Español', 'Inglés'],
  credentials: [
    { label: 'Cédula profesional', value: '3763562' },
    { label: 'Cédula de especialidad', value: '7930380' },
    { label: 'Cédula de subespecialidad', value: '7730435' },
  ],
  education: [
    { institution: 'Universidad Autónoma de Chihuahua', program: 'Licenciatura en Medicina' },
    { institution: 'Universidad Nacional Autónoma de México', program: 'Especialidad en Medicina Interna' },
    { institution: 'Universidad Nacional Autónoma de México', program: 'Subespecialidad en Inmunología y Alergia' },
    { institution: 'Universidad Autónoma de Aguascalientes', program: 'Doctorado en Ciencias Biológicas' },
  ],
  conditions: [
    'Rinitis alérgica',
    'Asma',
    'Dermatitis alérgica',
    'Tiroiditis autoinmunitaria',
    'Trastornos por inmunodeficiencia',
  ],
  services: [
    'Consulta de Alergología',
    'Consulta de Inmunología',
    'Seguimiento de Alergología',
    'Pruebas alérgicas cutáneas (prick test)',
    'Evaluación de alergia a insectos',
  ],
  address: {
    streetAddress: 'Avenida Universidad 103, 1er piso, consultorio 117',
    addressLocality: 'Aguascalientes',
    addressRegion: 'Aguascalientes',
    postalCode: '20029',
    addressCountry: 'MX',
  },
  telephone: '+52 449 996 6500',
  externalProfiles: [
    'https://www.doctoralia.com.mx/perfil/jesus-guillermo-espinoza-contreras',
    'https://undoctorparati.com/alergologos-en-aguascalientes/dr-jesus-guillermo-espinoza-contreras/',
  ],
  publication: {
    title: 'Immunological markers and Helicobacter pylori in patients with stomach cancer: Expression and correlation',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7100142/',
  },
} as const

export function canonicalSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}
