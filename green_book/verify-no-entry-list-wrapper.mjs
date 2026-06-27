import fs from 'node:fs';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');
const stylesheet = fs.readFileSync(new URL('./green-lore-book-controller.css', import.meta.url), 'utf8');

if (controller.includes('glbc-entry-list') || stylesheet.includes('glbc-entry-list')) {
    throw new Error('Entry rows should be rendered in the active category list without a glbc-entry-list wrapper');
}

console.log('entry rows render in active category list without wrapper');
