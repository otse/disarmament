// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility

import common from "./common.js";
import garbage from "./garbage.js";
import toggle from "./lib/toggle.js";
import props from "./props.js";
import renderer from "./renderer.js";

namespace tunnels {
	const arbitrary_expand = 0.1;

	export var currentTunnel: tunnel | undefined;

	export function clear() {
		for (const tunnel of tunnels)
			tunnel.cleanup();
		tunnels = [];
		currentTunnel = undefined;
	}

	export function loop() {
		for (const tunnel of tunnels) {
			if (tunnel.check())
				break;
		}
	}

	export function findMakeTunnels(scene) {
		function finder(object) {
			if (!object.name)
				return;
			const [kind, name, hint] = object.name?.split('_');
			if (kind === 'tunnel')
				new tunnel(object, name);
		}
		scene.traverse(finder);
		for (const tunnel of tunnels) {
			tunnel.findAdjacentTunnels();
		}
	}

	export var tunnels: tunnel[] = [];

	export class tunnel extends toggle {
		private static visibleTunnels: Set<tunnel> = new Set();
		aabb;
		expandedAabb;
		// Single array for all props that intersect with this tunnel
		props: props.prop[] = [];
		adjacentTunnels: tunnel[] = [];
		debugBox;

		constructor(public readonly object, public readonly name) {
			super();
			this.object.visible = false;
			this.object.frustumCulled = true;
			tunnels.push(this);
			this.measure();
			this.debugBox = new common.debug_box(this, 'green', true);
			this.gatherProps();
		}

		private gatherProps() {
			for (const prop of props.props) {
				if (prop.aabb && this.aabb.intersectsBox(prop.aabb)) {
					this.props.push(prop);
				}
			}
			console.log(this.name, 'collected', this.props.length, 'props');
		}

		show() {
			if (this.on()) {
				console.warn(`Oops: Tunnel ${this.name} is already showing.`);
				return;
			}
			tunnel.visibleTunnels.add(this);
			this.object.visible = true;
			
			for (const prop of this.props) {
				prop.show();
			}
		}

		hide() {
			if (this.off()) {
				console.warn(`Oops: Tunnel ${this.name} is already hidden.`);
				return;
			}
			this.object.visible = false;
			tunnel.visibleTunnels.delete(this);

			for (const prop of this.props) {
				// Only hide if no other visible tunnel has this prop
				if (!Array.from(tunnel.visibleTunnels).some(t => t.props.includes(prop))) {
					prop.hide();
				}
			}
		}

		protected measure() {
			this.aabb = new THREE.Box3().setFromObject(this.object, true);
			this.expandedAabb = this.aabb.clone().expandByScalar(arbitrary_expand);
		}
		findAdjacentTunnels() {
			for (const tunnel of tunnels) {
				if (this === tunnel)
					continue;
				if (this.expandedAabb.intersectsBox(tunnel.expandedAabb))
					this.adjacentTunnels.push(tunnel);
			}
		}
		cleanup() {

		}
		check() {
			const playerAABB = garbage.gplayer.aabb;
			let checkme = this.expandedAabb.containsBox(playerAABB);
			if (!currentTunnel)
				checkme = this.expandedAabb.intersectsBox(playerAABB);

			if (checkme) {
				if (currentTunnel !== this) {
					const currentTunnels = currentTunnel ? [currentTunnel, ...currentTunnel.adjacentTunnels] : [];
					const newTunnels = [this, ...this.adjacentTunnels];

					for (const tunnel of currentTunnels) {
						if (!newTunnels.includes(tunnel)) {
							tunnel.hide();
						}
					}

					for (const tunnel of newTunnels) {
						if (!currentTunnels.includes(tunnel)) {
							tunnel.show();
						}
					}

					currentTunnel = this;
				}
				return true;
			}
			return false;
		}
	}
}

export default tunnels;