
// inspired by gmod lua !

// it is useful to prevent circular dependencies
// and or import hell


module hooks {
	export type func = (any) => void
}

export class hooks<T = never> {
	static readonly hooks: { [name: string]: hooks.func[] }
	list: hooks.func[] = []
	static register(name: string, f: hooks.func) {
		if (!hooks[name])
			hooks[name] = [];
		hooks[name].push(f);
	}
	static unregister(name: string, f: hooks.func) {
		hooks[name] = hooks[name].filter(e => e != f);
	}
	static call(name: string, x: any) {
		if (!hooks[name])
			return;
		for (let i = hooks[name].length; i--;)
			if (hooks[name][i](x))
				return;
	}
}

export default hooks;