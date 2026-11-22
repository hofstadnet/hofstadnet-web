// RSS med de norske innleggene: /rss.xml
import type { APIContext } from 'astro';
import { feed } from '../lib/rss';

export const GET = (context: APIContext) => feed(context, 'nb');
