// inspired by gmod lua
export class hooks {
    static hooks = {};
    static create(name) {
        if (!(name in this.hooks))
            this.hooks[name] = [];
    }
    static register(name, f) {
        this.create(name);
        this.hooks[name].push(f);
    }
    static registerIndex(name, index, f) {
        this.create(name);
        if (this.hooks[name][index] !== undefined)
            console.error(`Error: Hook '${name}' already has a function registered at index ${index}`);
        this.hooks[name][index] = f;
    }
    static unregister(name, f) {
        this.hooks[name] = this.hooks[name].filter(e => e != f);
    }
    static async call(name, x) {
        if (!this.hooks[name])
            return;
        for (let i = this.hooks[name].length; i--;)
            if (await (hooks[name][i]?.(x)))
                return;
    }
}
export default hooks;
