// Tekstene for skriptene i nettleseren, fra de samme ordbøkene som sidene. Språket leses fra <html lang>, som settes
// av Base.astro. Bare «client»-delen av ordbøkene tas med i skriptene.
import { client as nb } from './nb';
import { client as en } from './en';

export const strings = () => (document.documentElement.lang === 'en' ? en : nb);
