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
		aabb2
		props: props.prop[] = []
		adjacentTunnels: tunnel[] = []
		debugBox
		constructor(public readonly object, public readonly name) {
			super();
			tunnels.push(this);
			this.measure();
			this.debugBox = new common.debug_box(this, 'green', true);
			renderer.scene.add(this.debugBox.mesh);
			this.collect_props();
			this.hide();
		}
		protected measure() {
			this.object.updateMatrix();
			this.object.updateMatrixWorld();
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.object, true);
			this.aabb2 = new THREE.Box3().copy(this.aabb);
			this.aabb2.expandByScalar(0.1);
		}
		findAdjacentTunnels() {
			for (const tunnel of tunnels) {
				if (this === tunnel)
					continue;
				if (this.aabb2.intersectsBox(tunnel.aabb2))
					this.adjacentTunnels.push(tunnel);
			}
		}
		private collect_props() {
			for (const prop of props.collection) {
				if (prop.aabb && this.aabb.intersectsBox(prop.aabb)) {
					this.props.push(prop);
				}
			}
			console.log(this.name, 'collected', this.props.length, 'props', this.props);

		}
		show() {
			if (this.on()) {
				console.warn(`Oops: Tunnel ${this.name} is already showing.`);
				return;
			}
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
			for (const prop of this.props) {
				prop.hide();
			}
		}
		private show_aggregate() {
			this.show();
			for (const tunnel of this.adjacentTunnels) {
				tunnel.show();
			}
		}
		private hide_aggregate() {
			this.hide();
			for (const tunnel of this.adjacentTunnels) {
				tunnel.hide();
			}
		}
		check() {
			const playerAABB = garbage.gplayer.aabb;

			if (this.aabb.intersectsBox(playerAABB)) {
				if (corridor !== this) {
					console.log('woo we are in tunnel', this.name);
					corridor?.hide_aggregate?.();
					corridor = this;
					corridor.show_aggregate();
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