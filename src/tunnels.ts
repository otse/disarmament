// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility

import common from "./common.js";
import garbage from "./garbage.js";
import toggle from "./lib/toggle.js";
import props from "./props.js";
import renderer from "./renderer.js";

namespace tunnels {
	export var corridor: tunnel;

	export function clear() {
		for (const tunnel of tunnels)
			tunnel.cleanup();
		tunnels = [];
	}

	export function loop() {

		for (const tunnel of tunnels) {
			if (tunnel.check())
				break;
		}
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

		for (const tunnel of tunnels)
			tunnel.findAdjacentTunnels();
	}

	var tunnels: tunnel[] = [];

	export class tunnel extends toggle {
		aabb
		expandedAabb
		containedObjects: props.prop[] = []
		adjacentTunnels: tunnel[] = []
		debugBox
		constructor(public readonly object, public readonly name) {
			super();
			this.object.visible = false;
			tunnels.push(this);
			this.measure();
			this.debugBox = new common.debug_box(this, 'green', true);
			renderer.scene.add(this.debugBox.mesh);
			this.collect_props();
		}
		protected measure() {
			this.object.updateMatrix();
			this.object.updateMatrixWorld();
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.object, true);
			this.expandedAabb = new THREE.Box3().copy(this.aabb);
			this.expandedAabb.expandByScalar(0.1);
		}
		findAdjacentTunnels() {
			for (const tunnel of tunnels) {
				if (this === tunnel)
					continue;
				if (this.expandedAabb.intersectsBox(tunnel.expandedAabb))
					this.adjacentTunnels.push(tunnel);
			}
		}
		private collect_props() {
			for (const prop of props.collection) {
				if (prop.aabb && this.aabb.intersectsBox(prop.aabb)) {
					this.containedObjects.push(prop);
				}
			}
			console.log(this.name, 'collected', this.containedObjects.length, 'props', this.containedObjects);

		}
		show() {
			if (this.on()) {
				console.warn(`Oops: Tunnel ${this.name} is already showing.`);
				return;
			}
			this.object.visible = true;
			for (const prop of this.containedObjects) {
				prop.show();
			}
		}
		hide() {
			if (this.off()) {
				console.warn(`Oops: Tunnel ${this.name} is already hidden.`);
				return;
			}
			this.object.visible = false;
			for (const prop of this.containedObjects) {
				prop.hide();
			}
		}
		check() {
			const playerAABB = garbage.gplayer.aabb;

			if (this.expandedAabb.containsBox(playerAABB)) {
				if (corridor !== this) {					
					// Collect current active tunnels
					const currentTunnels = corridor ? [corridor, ...corridor.adjacentTunnels] : [];

					// Collect new candidate tunnels
					const newTunnels = [this, ...this.adjacentTunnels];

					// Hide all current tunnels that are not in the new set
					currentTunnels.forEach(tunnel => {
						if (!newTunnels.includes(tunnel)) {
							tunnel.hide();
						}
					});

					// Show all new tunnels that were not already visible
					newTunnels.forEach(tunnel => {
						if (!currentTunnels.includes(tunnel)) {
							tunnel.show();
						}
					});
					corridor = this;
				}
				return true;
			} else if (this.aabb.intersectsBox(playerAABB)) {
				//console.log('intersecting');

				// we are intersecting, but not containing
			}
			// No intersection
		}
		cleanup() {
			// tunnels.splice(tunnels.indexOf(this), 1);
		}
	}
}

export default tunnels;