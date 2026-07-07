import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const baseArticlesDirectory = path.join(process.cwd(), 'data-articles');

export interface ArticleData {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  description: string;
  content: string;
  audioUrl: string;
  genre: string;
  views?: number;
  likes?: number;
  imageUrl?: string;
}

export function getAllArticles(genre: string): ArticleData[] {
  const articlesDirectory = path.join(baseArticlesDirectory, genre);
  
  if (!fs.existsSync(articlesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(articlesDirectory);
  const allArticlesData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(articlesDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      const matterResult = matter(fileContents);

      const audioField = matterResult.data.audio || slug + '.mp3';
      const finalAudioUrl = audioField.startsWith('http') ? audioField : `/audio/${genre}/${audioField}`;

      return {
        slug,
        title: matterResult.data.title || 'No Title',
        date: matterResult.data.date || 'Unknown',
        category: matterResult.data.category || 'その他',
        tags: matterResult.data.tags || [],
        description: matterResult.data.description || '',
        content: matterResult.content,
        audioUrl: finalAudioUrl,
        genre: genre,
        imageUrl: matterResult.data.image || '/og-image.png',
      };
    });

  return allArticlesData.sort((a, b) => {
    if (a.date < b.date) return 1;
    return -1;
  });
}

export function getAllArticlesGlobal(): ArticleData[] {
  let genres: string[] = [];
  if (fs.existsSync(baseArticlesDirectory)) {
    genres = fs.readdirSync(baseArticlesDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }
  let allArticles: ArticleData[] = [];
  for (const genre of genres) {
    allArticles = allArticles.concat(getAllArticles(genre));
  }
  return allArticles.sort((a, b) => {
    if (a.date < b.date) return 1;
    return -1;
  });
}

export function getArticleBySlug(genre: string, slug: string): ArticleData | undefined {
  const articles = getAllArticles(genre);
  const decodedSlug = decodeURIComponent(slug);
  return articles.find(article => article.slug === decodedSlug || article.slug === slug);
}
