import fs from 'node:fs';

const controller = fs.readFileSync(new URL('./green-lore-book-controller.js', import.meta.url), 'utf8');
const stylesheet = fs.readFileSync(new URL('./green-lore-book-controller.css', import.meta.url), 'utf8');

const requiredControllerMarkers = [
    "const APP_VERSION = '20260627-toggle7'",
    'function normalizeWheelDelta',
    'function handlePanelWheel',
    "panel.addEventListener('wheel', handlePanelWheel",
    'function scrollGroupIntoView',
    'scrollGroupIntoView(group)',
];

const missingController = requiredControllerMarkers.filter(marker => !controller.includes(marker));
if (missingController.length) {
    throw new Error(`Missing scroll support in controller: ${missingController.join(', ')}`);
}

const requiredCssMarkers = [
    'overscroll-behavior:contain',
    'scrollbar-gutter:stable',
];

const missingCss = requiredCssMarkers.filter(marker => !stylesheet.includes(marker));
if (missingCss.length) {
    throw new Error(`Missing scroll support in stylesheet: ${missingCss.join(', ')}`);
}

console.log('scroll support markers ok');
