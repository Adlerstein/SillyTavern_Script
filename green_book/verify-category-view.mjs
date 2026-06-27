import fs from 'node:fs';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');
const stylesheet = fs.readFileSync(new URL('./green-lore-book-controller.css', import.meta.url), 'utf8');

const requiredControllerMarkers = [
    "const APP_VERSION = '20260627-toggle9'",
    'glbc-category-bar',
    'glbc-entries',
    'function renderCategoryTabs',
    'function setActiveGroup',
    "action === 'category'",
];

const missingController = requiredControllerMarkers.filter(marker => !controller.includes(marker));
if (missingController.length) {
    throw new Error(`Missing category view controller markers: ${missingController.join(', ')}`);
}

const forbiddenControllerMarkers = [
    'data-action="group"',
    'function makeGroup',
    'renderGroupRows',
    'scrollGroupIntoView',
];

const foundForbidden = forbiddenControllerMarkers.filter(marker => controller.includes(marker));
if (foundForbidden.length) {
    throw new Error(`Accordion controller markers should be gone: ${foundForbidden.join(', ')}`);
}

const requiredCssMarkers = [
    '.glbc-category-bar',
    '.glbc-category-tab',
    '.glbc-entries',
    'overflow:auto',
];

const missingCss = requiredCssMarkers.filter(marker => !stylesheet.includes(marker));
if (missingCss.length) {
    throw new Error(`Missing category view stylesheet markers: ${missingCss.join(', ')}`);
}

console.log('category view markers ok');
