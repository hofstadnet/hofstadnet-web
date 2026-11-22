// RSS med de engelske innleggene: /en/rss.xml
import type { APIContext } from 'astro';
import { feed } from '../../lib/rss';

export const GET = (context: APIContext) => feed(context, 'en');
