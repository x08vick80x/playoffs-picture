import { dataVersion } from '@/utils/data-version';

export const GET = () => new Response(JSON.stringify({ version: dataVersion }), {
    headers: { 'Content-Type': 'application/json' },
});
