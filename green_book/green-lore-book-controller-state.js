export function createGreenLoreBookTreeState({ storage, scriptId, bookFile, defaultSubsectionTitle, uidKey, subsectionFromComment }) {
    const subsectionStorageKey = `${scriptId}:subsections:${bookFile}`;
    const placementStorageKey = `${scriptId}:subsection-placements:${bookFile}`;

    function readJson(key) {
        try {
            const parsed = JSON.parse(storage.getItem(key) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    function writeJson(key, value) {
        storage.setItem(key, JSON.stringify(value));
    }

    function readSubsections() {
        return readJson(subsectionStorageKey);
    }

    function writeSubsections(config) {
        writeJson(subsectionStorageKey, config);
    }

    function readPlacements() {
        return readJson(placementStorageKey);
    }

    function writePlacements(config) {
        writeJson(placementStorageKey, config);
    }

    function configuredSubsections(parentModuleId) {
        const items = readSubsections()[uidKey(parentModuleId)];
        return Array.isArray(items) ? items.filter(Boolean) : [];
    }

    function addSubsection(parentModuleId, title) {
        const cleanTitle = String(title ?? '').trim();
        const key = uidKey(parentModuleId);
        if (!key || !cleanTitle) return false;
        const config = readSubsections();
        const items = Array.isArray(config[key]) ? config[key] : [];
        if (!items.includes(cleanTitle)) items.push(cleanTitle);
        config[key] = items;
        writeSubsections(config);
        return true;
    }

    function moveSubsection(parentModuleId, title, targetTitle = '', insertAfter = false) {
        const key = uidKey(parentModuleId);
        const cleanTitle = String(title ?? '').trim();
        if (!key || !cleanTitle) return;
        const config = readSubsections();
        const items = (Array.isArray(config[key]) ? config[key] : []).filter(item => item && item !== cleanTitle);
        const cleanTarget = String(targetTitle ?? '').trim();
        const targetIndex = cleanTarget ? items.indexOf(cleanTarget) : -1;
        if (targetIndex >= 0) items.splice(targetIndex + (insertAfter ? 1 : 0), 0, cleanTitle);
        else items.push(cleanTitle);
        config[key] = items;
        writeSubsections(config);
    }

    function removeSubsection(parentModuleId, title) {
        const key = uidKey(parentModuleId);
        const cleanTitle = String(title ?? '').trim();
        if (!key || !cleanTitle) return;
        const config = readSubsections();
        const items = Array.isArray(config[key]) ? config[key].filter(item => item !== cleanTitle) : [];
        if (items.length) config[key] = items;
        else delete config[key];
        writeSubsections(config);
    }

    function setPlacement(uid, parentModuleId, title) {
        const key = uidKey(uid);
        const cleanTitle = String(title ?? '').trim();
        const config = readPlacements();
        if (!key || !cleanTitle || cleanTitle === defaultSubsectionTitle) delete config[key];
        else config[key] = { parentModuleId, title: cleanTitle };
        writePlacements(config);
    }

    function removePlacement(uid) {
        const config = readPlacements();
        delete config[uidKey(uid)];
        writePlacements(config);
    }

    function placementForEntry(entry) {
        const uid = uidKey(entry?.uid ?? entry?.id);
        const placement = readPlacements()[uid];
        if (placement?.parentModuleId && placement.title) return placement;
        const legacy = subsectionFromComment(entry?.comment);
        return legacy?.title ? { parentModuleId: legacy.parentModuleId, title: legacy.title } : null;
    }

    function subsectionTitlesFor(parentModuleId, entries = []) {
        const parent = uidKey(parentModuleId);
        const titles = new Set(configuredSubsections(parent));
        for (const placement of Object.values(readPlacements())) {
            if (placement?.parentModuleId === parent && placement.title) titles.add(placement.title);
        }
        for (const entry of entries) {
            const subsection = subsectionFromComment(entry?.comment);
            if (subsection?.parentModuleId === parent && subsection.title) titles.add(subsection.title);
        }
        return [...titles];
    }

    return {
        configuredSubsections,
        addSubsection,
        moveSubsection,
        removeSubsection,
        setPlacement,
        removePlacement,
        placementForEntry,
        subsectionTitlesFor,
    };
}
