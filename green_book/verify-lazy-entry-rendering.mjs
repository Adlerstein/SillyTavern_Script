import fs from 'node:fs';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');

const required = [
    "const APP_VERSION = '20260627-toggle6'",
    '版本 ${APP_VERSION}',
    'function renderGroupRows',
    'renderGroupRows(group)',
];

const missing = required.filter(text => !controller.includes(text));
if (missing.length) {
    throw new Error(`Missing lazy entry rendering markers: ${missing.join(', ')}`);
}

if (controller.includes('section.append(makeEntryRow')) {
    throw new Error('Groups should not pre-render entry rows before expansion');
}

console.log('lazy entry rendering markers ok');
