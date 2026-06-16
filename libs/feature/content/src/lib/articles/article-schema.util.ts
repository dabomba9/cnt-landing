import { IArticle, IAuthor } from './articles.types';

/** All article hero images are exported at this canonical size by the
 *  importer. Hard-coded so the schema + OG meta don't lie. */
export const ARTICLE_IMAGE_WIDTH = 1270;
export const ARTICLE_IMAGE_HEIGHT = 840;

const ORG = {
  '@type': 'Organization' as const,
  name: 'CurbNTurf',
  url: 'https://www.curbnturf.com',
  logo: {
    '@type': 'ImageObject' as const,
    url: 'https://www.curbnturf.com/assets/images/CNT_Logo_V_Orange.svg',
  },
};

/** Approximate word count by stripping tags and splitting on whitespace.
 *  Schema.org `wordCount` expects an integer; rough is fine. */
function wordCount(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

/** Build a schema.org Article payload for a single article. Pure
 *  function; safe to call in SSR. `absUrl` converts project-relative
 *  paths to absolute URLs (typically `SeoService.absUrl`). */
export function buildArticleSchema(
  article: IArticle,
  author: IAuthor | null,
  absUrl: (path: string) => string,
): object {
  const url = absUrl(`/article/${article.id}/${article.slug}`);
  const image = absUrl(article.heroImage);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: {
      '@type': 'ImageObject',
      url: image,
      width: ARTICLE_IMAGE_WIDTH,
      height: ARTICLE_IMAGE_HEIGHT,
    },
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Person',
      name: author?.name ?? article.author,
      ...(author?.bio ? { description: author.bio } : {}),
    },
    publisher: ORG,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: article.categoryLabel,
    wordCount: wordCount(article.body),
    inLanguage: 'en-US',
    url,
  };
}

/** Build a schema.org CollectionPage payload for the per-category
 *  landing page. The ItemList enumerates the articles in display order. */
export function buildCollectionSchema(
  categoryLabel: string,
  description: string,
  articles: IArticle[],
  absUrl: (path: string) => string,
  pageUrl: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryLabel} | Room2Roam`,
    description,
    url: absUrl(pageUrl),
    publisher: ORG,
    inLanguage: 'en-US',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absUrl(`/article/${a.id}/${a.slug}`),
        name: a.title,
      })),
    },
  };
}
