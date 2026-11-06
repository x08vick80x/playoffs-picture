import { register } from 'node:module';

register('./alias-loader.ts', import.meta.url);
