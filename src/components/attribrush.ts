/// Paint vertices to transition two textures

import { hooks } from "../lib/hooks.js";
import mycomponent from "../lib/component.js";
import tunnels from "./tunnels.js";

namespace attribrush {
	const privateProp = 'Zuc';

	export var componentName = 'AttriBrush Component';

	export async function boot() {
		console.log(' AttriBrush Boot ');
		hooks.placeListener('levelLoaded', 0, loaded);
		hooks.placeListener('levelWipe', 0, clear);
		hooks.placeListener('garbageStep', 0, loop);
	}

	async function loaded(scene) {
		console.log(`AttriBrush: There are ${tunnels.tunnels.length} tunnels.`);
		function findTunnels(object) {
			console.log('child objects');
		}
		for (const tunnel of tunnels.tunnels) {
			const { object } = tunnel;
		}
		scene.traverse(findTunnels);
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