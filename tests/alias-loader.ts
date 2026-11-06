import type { ResolveHook } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '../src');

// Mirrors the "@/" alias declared in tsconfig.json so src modules load under plain Node.
export const resolve: ResolveHook = (specifier, context, nextResolve) => {
    if (specifier.startsWith('@/')) {
        return nextResolve(pathToFileURL(path.join(SRC, specifier.slice(2))).href, context);
    }
    return nextResolve(specifier, context);
}
