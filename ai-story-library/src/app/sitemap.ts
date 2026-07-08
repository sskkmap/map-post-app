import type { MetadataRoute } from 'next'
import { getAllArticlesGlobal } from '@/lib/articles'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://share-map-bubble.site' // 本番URL

  // 1. 固定ページ
  const staticPaths: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/post`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/listen`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // 2. ジャンル一覧ページ
  const genres = ['mystery', 'smile', 'trip', 'emotion', 'life', 'knowledge']
  const genrePaths: MetadataRoute.Sitemap = genres.map(genre => ({
    url: `${baseUrl}/${genre}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // 3. 全自動生成記事ページ (Markdownから動的にスキャン)
  const articles = getAllArticlesGlobal()
  const articlePaths: MetadataRoute.Sitemap = articles.map(article => ({
    url: `${baseUrl}/${article.genre}/${article.slug}`,
    lastModified: article.date ? new Date(article.date) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticPaths, ...genrePaths, ...articlePaths]
}
