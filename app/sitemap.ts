import type {MetadataRoute} from 'next';
import {SITE, SITE_URL} from '@/lib/site-content';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1,
      images: [`${SITE_URL}/opengraph-image`],
    },
    {
      url: `${SITE_URL}${SITE.docsPath}`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
