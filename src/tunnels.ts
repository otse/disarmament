// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility

import common from "./common.js";
import garbage from "./garbage.js";
import renderer from "./renderer.js";

namespace tunnels {
	export var currentTunnel;

	export function clear() {
		for (const tunnel of tunnels)
			tunnel.cleanup();
		tunnels = [];
	}

	export function find_make_tunnels(scene) {
		function finder(object) {
			// ugly guard clause
			if (!object.name)
				return;
			const [kind, name, hint] = object.name?.split('_');
			if (kind === 'tunnel')
				new tunnel(object, name);
		}
		scene.traverse(finder);
	}

	var tunnels: tunnel[] = []

	export class tunnel {
		aabb
		vdb
		constructor(public readonly object, public readonly name) {
			tunnels.push(this);
			this.measure();
			this.vdb = new common.visual_debug_box(this, 'green', true);
			renderer.scene.add(this.vdb.mesh);
		}
		protected measure() {
			this.object.updateMatrix();
			this.object.updateMatrixWorld();			
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.object, true);
		}
		cleanup() {
			// tunnels.splice(tunnels.indexOf(this), 1);
		}
	}

	export function loop() {
		const aabb = garbage.gplayer.aabb;

		for (const tunnel of tunnels) {
			if (tunnel.aabb.intersectsBox(aabb)) {
				console.log('we are in tunnel', tunnel.name);
				break;				
			}
		}
	}
}

export default tunnels;