import { prisma } from '@/lib/prisma'
import { sourceConfig, type GoogleSourceConfig } from '@/lib/calendar/source-config'
import { syncGoogleSource } from '@/lib/calendar/google'
import { processPropagationJobs } from '@/lib/calendar/propagation'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const url = new URL(request.url)
  const sourceId = url.searchParams.get('sourceId')
  if (!sourceId) return new Response(null, { status: 404 })

  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } })
  if (!source || source.providerType !== 'GOOGLE_CALENDAR') return new Response(null, { status: 404 })

  const config = sourceConfig<GoogleSourceConfig>(source.config)
  const channelId = request.headers.get('x-goog-channel-id')
  const channelToken = request.headers.get('x-goog-channel-token')

  if (!channelId || channelId !== config.watchChannelId || !channelToken || channelToken !== config.watchToken) {
    return new Response(null, { status: 401 })
  }

  try {
    await syncGoogleSource(sourceId)
    await processPropagationJobs({ limit: 50 })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Google calendar webhook sync failed', error)
    return new Response(null, { status: 500 })
  }
}
