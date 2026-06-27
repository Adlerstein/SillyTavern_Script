import fs from 'node:fs';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');

const forbidden = [
    'data-action="batch"',
    "action === 'batch'",
    'toggleGroup(',
    '全开',
    '全关',
];

const found = forbidden.filter(text => controller.includes(text));
if (found.length) {
    throw new Error(`Batch controls should not be exposed by the green book controller: ${found.join(', ')}`);
}

console.log('no batch actions exposed');
