import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'

export async function GET() {
  try {
    await requireStaffApi()
    const items = await prisma.document.findMany({
      include: { patient: { include: { person: true } } },
      orderBy: { uploadedAt: 'desc' }
    })
    return jsonSuccess(items)
  } catch (e) {
    return jsonErrorResponse(e)
  }
}
