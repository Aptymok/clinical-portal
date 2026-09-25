import type { MetadataRoute } from 'next'
import { canonicalSiteUrl } from '@/config/public-physician'

export default function robots(): MetadataRoute.Robots {
  const base = canonicalSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/dr-jesus-guillermo-espinoza-contreras'],
      disallow: [
        '/dashboard',
        '/patients',
        '/appointments',
        '/encounters',
        '/documents',
        '/api/'
      ]
    },
    sitemap: `${base}/sitemap.xml`
  }
}
