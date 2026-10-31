import type { Metadata } from 'next'
import { requireStaffPage } from '@/lib/staff-access'
export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage()
  return <>{children}</>
}
