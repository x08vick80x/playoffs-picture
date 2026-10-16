import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Shared by the rendered page and the static freshness endpoint.
export const dataVersion = createHash('sha256')
    .update(readFileSync('./src/data/standings.json'))
    .update(readFileSync('./src/data/playoff-picture.json'))
    .update(readFileSync('./src/data/schedule.json'))
    .digest('hex');
