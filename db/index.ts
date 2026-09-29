import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Database is unavailable');return env.DB}
export function bucket(){if(!env.BUCKET)throw new Error('Media storage is unavailable');return env.BUCKET}
