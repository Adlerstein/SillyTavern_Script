import fs from 'node:fs';
import { compareEntriesForDisplay } from './green-lore-book-controller-core.js';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');
const stylesheet = fs.readFileSync(new URL('./green-lore-book-controller.css', import.meta.url), 'utf8');

if (!controller.includes("const APP_VERSION = '20260627-toggle9'")) {
    throw new Error('Controller version should be 20260627-toggle9');
}

if (controller.includes('glbc-entry-meta') || controller.includes('${esc(prefix)}')) {
    throw new Error('Entry rows should only show titles, not uid/prefix metadata');
}

const sorted = [
    { uid: 1, comment: '[timeline] low priority display first', order: 90, displayIndex: 1 },
    { uid: 2, comment: '[timeline] high priority display later', order: 10, displayIndex: 2 },
].sort(compareEntriesForDisplay);

if (sorted[0]?.uid !== 2) {
    throw new Error('Entries should sort by priority/order before uid or display index');
}

if (!stylesheet.includes('grid-template-columns:repeat(auto-fit,minmax(118px,1fr))')) {
    throw new Error('Category tabs should use a wrapping grid layout');
}

const entriesRule = stylesheet.match(/\.glbc-entries\{[^}]+\}/)?.[0] ?? '';
if (!entriesRule.includes('gap:6px')) {
    throw new Error('Entry list should keep readable spacing between rows');
}

const entryRowRule = stylesheet.match(/\.glbc-entry-row\{[^}]+\}/)?.[0] ?? '';
if (!entryRowRule.includes('border-radius:8px')) {
    throw new Error('Entry rows should render as distinct controls');
}

if (stylesheet.includes('.glbc-entry-meta')) {
    throw new Error('Stylesheet should not keep entry metadata styling');
}

console.log('category polish markers ok');
