import type { MetadataRoute } from 'next'
import { canonicalSiteUrl, publicPhysician } from '@/config/public-physician'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = canonicalSiteUrl()

  return [
    {
      url: base,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${base}/${publicPhysician.slug}`,
      changeFrequency: 'weekly',
      priority: 0.9
    }
  ]
}
