import fs from 'node:fs';
import { deriveGroups, entryUid, isLockedEntry } from './green-lore-book-controller-core.js';

const worldPath = process.argv[2];
if (!worldPath) {
    console.error('Usage: node green_book/verify-toggle-model.mjs <worldbook.json>');
    process.exit(2);
}

const before = fs.readFileSync(worldPath, 'utf8');
const book = JSON.parse(before);
const groups = deriveGroups(book);
const entries = Object.values(book.entries ?? {});
const locked = entries.filter(isLockedEntry);
const batchUids = new Set(groups.flatMap(group => group.unlockedUids));

if (entries.length !== 119) {
    throw new Error(`Expected 119 entries in current football fixture, got ${entries.length}`);
}

for (const entry of locked) {
    const uid = entryUid(entry);
    if (batchUids.has(uid)) {
        throw new Error(`Locked entry ${uid} was included in batch toggle set`);
    }
}

const requiredGroups = ['timeline', 'league', 'club', 'career', 'position', 'national', 'city', 'award', 'system'];
for (const id of requiredGroups) {
    if (!groups.some(group => group.id === id)) {
        throw new Error(`Missing derived group: ${id}`);
    }
}

const after = fs.readFileSync(worldPath, 'utf8');
if (after !== before) {
    throw new Error('Verification mutated the world book file');
}

console.log(JSON.stringify({
    entries: entries.length,
    groups: groups.map(group => ({
        id: group.id,
        total: group.totalCount,
        enabled: group.enabledCount,
        disabled: group.disabledCount,
        unlocked: group.unlockedCount,
    })),
    locked: locked.map(entryUid),
}, null, 2));
