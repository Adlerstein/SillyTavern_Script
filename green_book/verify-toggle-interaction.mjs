import { setGroupOpen } from './green-lore-book-controller-core.js';

class FakeGroup {
    constructor() {
        this.dataset = {};
        this.tools = { hidden: false };
        this.list = { hidden: false };
        this.head = {
            attributes: {},
            setAttribute(name, value) {
                this.attributes[name] = String(value);
            },
        };
    }

    querySelector(selector) {
        if (selector === '.glbc-group-head') return this.head;
        return null;
    }

    querySelectorAll(selector) {
        if (selector === '.glbc-group-tools,.glbc-entry-list') return [this.tools, this.list];
        return [];
    }
}

const group = new FakeGroup();

setGroupOpen(group, false);
if (group.dataset.open !== 'false') throw new Error('Expected closed group data-open=false');
if (group.head.attributes['aria-expanded'] !== 'false') throw new Error('Expected closed group aria-expanded=false');
if (!group.tools.hidden || !group.list.hidden) throw new Error('Expected closed group contents to be hidden');

setGroupOpen(group, true);
if (group.dataset.open !== 'true') throw new Error('Expected open group data-open=true');
if (group.head.attributes['aria-expanded'] !== 'true') throw new Error('Expected open group aria-expanded=true');
if (group.tools.hidden || group.list.hidden) throw new Error('Expected open group contents to be visible');

console.log('toggle interaction model ok');
