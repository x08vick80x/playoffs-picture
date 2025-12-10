import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_DIR = path.join(__dirname, 'src/images/logos');
const OUTPUT_FILE = path.join(__dirname, 'public/sprites.svg');

const files = fs.readdirSync(LOGO_DIR);

let symbols = '';

files.forEach(file => {
    if (path.extname(file) !== '.svg') return;

    const id = path.basename(file, '.svg').toLowerCase();
    const content = fs.readFileSync(path.join(LOGO_DIR, file), 'utf8');

    // Extract inner content of SVG
    const svgMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const viewBoxMatch = content.match(/viewBox="([^"]*)"/i);

    if (svgMatch) {
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
        symbols += `<symbol id="${id}" viewBox="${viewBox}">${svgMatch[1]}</symbol>`;
    }
});

const template = `
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
    <defs>
        ${symbols}
    </defs>
</svg>
`;

fs.writeFileSync(OUTPUT_FILE, template);
console.log(`Spritemap generated at ${OUTPUT_FILE}`);
