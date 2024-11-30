// inspired by gmod lua

// hooks run in descending order

namespace hooks {
	export type func = (any) => Promise<boolean>
}

export class hooks<T = never> {
	static readonly hooks: { [name: string]: hooks.func[] } = {}
	static create(name: string) {
		if (!(name in this.hooks)) this.hooks[name] = [];
	}
	static register(name: string, f: hooks.func) {
		this.create(name);
		this.hooks[name].push(f);
	}
	static registerIndex(name: string, index: number, f: hooks.func) {
		this.create(name);
		if (this.hooks[name][index] !== undefined)
			console.error(`Error: Hook '${name}' already has a function registered at index ${index}`);
		this.hooks[name][index] = f;
	}
	static unregister(name: string, f: hooks.func) {
		this.hooks[name] = this.hooks[name].filter(e => e != f);
	}
	static async call(name: string, x: any) {
		if (!this.hooks[name]) return;
		for (let i = this.hooks[name].length; i--;)
			if (await (hooks[name][i]?.(x))) return;
	}
}

export default hooks;