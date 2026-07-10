import { NextResponse } from 'next/server'
import { getAllArticlesGlobal } from '@/lib/articles'

export async function GET() {
  const allArticles = getAllArticlesGlobal()
  const baseUrl = 'https://share-map-bubble.site'
  
  // RSS XML ヘッダーとチャンネル情報
  let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AI CONTENT PORTAL - Bubble-Share</title>
    <link>${baseUrl}</link>
    <language>ja</language>
    <copyright>Copyright © Bubble-Share</copyright>
    <itunes:author>Bubble-Share AI</itunes:author>
    <description>読む・聴く・AIと創る。毎日新しいミステリー、旅行記、笑える話、人生訓を音声付きで配信する無限のAIコンテンツポータル。</description>
    <itunes:type>episodic</itunes:type>
    <itunes:owner>
      <itunes:name>Bubble-Share</itunes:name>
      <itunes:email>support@share-map-bubble.site</itunes:email>
    </itunes:owner>
    <itunes:image href="${baseUrl}/og-image.png"/>
    <itunes:category text="Society &amp; Culture"/>
    <itunes:category text="Fiction"/>
    <itunes:explicit>no</itunes:explicit>
`

  // エピソード（各記事）の追加
  for (const article of allArticles) {
    const articleUrl = `${baseUrl}/${article.genre}/${article.slug}`
    const pubDate = article.date ? new Date(article.date).toUTCString() : new Date().toUTCString()
    
    // 音声ファイルのURL
    const audioUrl = article.audioUrl.startsWith('http') 
      ? article.audioUrl 
      : `${baseUrl}${article.audioUrl}`

    const itunesDuration = "03:00" // おおよその再生時間
    
    rssXml += `    <item>
      <title>${escapeXml(article.title)}</title>
      <description>${escapeXml(article.description || "Bubble-Shareでこの記事を読もう")}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <enclosure url="${audioUrl}" length="3000000" type="audio/mpeg"/>
      <itunes:author>${escapeXml(article.category)}</itunes:author>
      <itunes:subtitle>${escapeXml(article.description || "")}</itunes:subtitle>
      <itunes:summary>${escapeXml(article.content.substring(0, 500))}</itunes:summary>
      <itunes:image href="${article.imageUrl ? (article.imageUrl.startsWith('http') ? article.imageUrl : baseUrl + article.imageUrl) : baseUrl + '/og-image.png'}"/>
      <itunes:duration>${itunesDuration}</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
    </item>
`
  }

  rssXml += `  </channel>
</rss>`

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
