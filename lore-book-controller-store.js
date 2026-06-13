function normalizeUid(uid) {
    return String(uid ?? '').trim();
}

function getEntry(data, uid) {
    const normalizedUid = normalizeUid(uid);
    const entries = data?.entries;

    if (!normalizedUid || !entries) {
        return null;
    }

    if (!Array.isArray(entries) && entries[normalizedUid]) {
        return entries[normalizedUid];
    }

    return Object.values(entries).find(entry => normalizeUid(entry?.uid) === normalizedUid) ?? null;
}

function getEntryState(data, uid) {
    const entry = getEntry(data, uid);
    return entry ? entry.disable !== true : null;
}

function getOriginalEntry(data, uid) {
    const normalizedUid = normalizeUid(uid);
    const entries = data?.originalData?.entries;

    if (!normalizedUid || !Array.isArray(entries)) {
        return null;
    }

    return entries.find(entry => normalizeUid(entry?.uid ?? entry?.id) === normalizedUid) ?? null;
}

export function createLoreBookStore({ bookName, loadWorldInfo, saveWorldInfo }) {
    let data = null;
    let loadPromise = null;
    let writeQueue = Promise.resolve();

    async function load({ force = false } = {}) {
        if (force) {
            data = null;
            loadPromise = null;
        }

        if (data) {
            return data;
        }

        if (!loadPromise) {
            loadPromise = Promise.resolve(loadWorldInfo(bookName))
                .then(result => {
                    if (!result?.entries) {
                        throw new Error(`World book not found: ${bookName}`);
                    }
                    data = result;
                    return data;
                })
                .finally(() => {
                    loadPromise = null;
                });
        }

        return loadPromise;
    }

    function peekState(uid) {
        return getEntryState(data, uid);
    }

    async function getStates(uids, options) {
        const worldBook = await load(options);
        return new Map(uids.map(uid => [normalizeUid(uid), getEntryState(worldBook, uid)]));
    }

    function setStates(uids, enable) {
        const normalizedUids = [...new Set(uids.map(normalizeUid).filter(Boolean))];

        writeQueue = writeQueue.catch(() => undefined).then(async () => {
            const worldBook = await load();
            const beforeChange = structuredClone(worldBook);
            const changed = [];
            const missing = [];

            for (const uid of normalizedUids) {
                const entry = getEntry(worldBook, uid);
                if (!entry) {
                    missing.push(uid);
                    continue;
                }

                const nextDisabled = !enable;
                const originalEntry = getOriginalEntry(worldBook, uid);
                const canonicalChanged = entry.disable !== nextDisabled;
                const originalChanged = originalEntry && originalEntry.enabled !== enable;

                if (canonicalChanged || originalChanged) {
                    entry.disable = nextDisabled;
                    if (originalEntry) {
                        originalEntry.enabled = enable;
                    }
                    changed.push(uid);
                }
            }

            if (changed.length) {
                try {
                    await saveWorldInfo(bookName, structuredClone(worldBook), true, { refreshEditor: true });
                } catch (error) {
                    data = beforeChange;
                    throw error;
                }
            }

            return { changed, missing };
        });

        return writeQueue;
    }

    return {
        getStates,
        load,
        peekState,
        setState: (uid, enable) => setStates([uid], enable),
        setStates,
    };
}
