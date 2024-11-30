/// Paint vertices to transition two textures

import { hooks } from "../lib/hooks.js";
import mycomponent from "../lib/component.js";

namespace attribrush {
	const privateProp = 'Zuc';

	export var componentName = 'AttriBrush Component';

	export async function boot() {
		console.log(' AttriBrush Boot ');
		hooks.registerIndex('levelLoaded', 0, loaded);
		hooks.registerIndex('levelWipe', 0, clear);
		hooks.registerIndex('garbageStep', 0, loop);
	}

	async function loaded() {
		return false;
	}

	async function clear() {
		return false;
	}

	async function loop() {
		return false;
	}
}

const validate: mycomponent = attribrush;

export default attribrush;