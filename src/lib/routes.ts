// getStaticPaths for sidene med parameter, felles for norske og engelske ruter i src/pages/.
import { getPosts, relatedPosts, allTags } from './posts';
import { areas } from './areas';
import { urls, type Lang } from '../i18n';

export async function postPaths(lang: Lang) {
  const posts = await getPosts(lang);
  // Listen er nyeste først: det eldre innlegget kommer etter, det nyere før
  return posts.map((p, i) => ({
    params: { id: p.id },
    props: { post: p, related: relatedPosts(p, posts), older: posts[i + 1], newer: posts[i - 1] },
  }));
}

// Områdene har norsk ID i norske adresser og engelsk navn i engelske (src/i18n/urls.ts)
export function areaPaths(lang: Lang) {
  return areas.map((a) => ({ params: { id: urls(lang).areaSlug(a.id) }, props: { lang, id: a.id } }));
}

export async function tagPaths(lang: Lang) {
  const tags = allTags(await getPosts(lang));
  return tags.map((tag) => ({ params: { id: tag.id }, props: { lang, tag } }));
}
