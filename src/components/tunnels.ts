// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility

import { hooks } from "../lib/hooks.js";
import mycomponent from "../lib/component.js";
import common from "../common.js";
import garbage from "../garbage.js";
import toggle from "../lib/toggle.js";
import props from "./props.js";
import renderer from "../renderer.js";

namespace tunnels {

	const tunnelExpand = .1;

	let previousTunnels: tunnel[] = [];

	export var componentName = 'Tunnels Component';

	export async function boot() {
		console.log(' Tunnels Boot ');

		hooks.registerIndex('levelLoaded', 1, loaded);
		hooks.registerIndex('levelWipe', 1, clear);
		hooks.registerIndex('levelLoop', 2, loop);
	}

	async function clear() {
		for (const tunnel of tunnels) {
			tunnel.clear();
		}
		tunnels = [];
		return false;
	}

	async function loop() {
		check();
		return false;
	}

	async function loaded(scene) {
		function findTunnels(object) {
			if (!object.name)
				return;
			const [kind, name, hint] = object.name?.split('_');
			if (kind === 'tunnel')
				new tunnel(object, name);
		}
		scene.traverse(findTunnels);
		for (const tunnel of tunnels) {
			tunnel.mesh();
		}
		return false;
	}

	export function check() {
		// Get all tunnels we're currently inside
		const activeTunnels = tunnels.filter(t =>
			t.expandedAabb.intersectsBox(garbage.gplayer.aabb)
		);

		// We're out of bounds, keep showing current tunnels
		if (activeTunnels.length == 0)
			return;

		// Get all adjacent tunnels to our active set
		const newTunnels = [...new Set([
			...activeTunnels,
			...activeTunnels.flatMap(t => t.adjacentTunnels)
		])];

		// Hide tunnels that are no longer visible
		for (const t of previousTunnels) {
			if (!newTunnels.includes(t)) {
				t.hide(newTunnels);
			}
		}

		// Show newly visible tunnels
		for (const t of newTunnels) {
			if (!previousTunnels.includes(t)) {
				t.show();
			}
		}

		previousTunnels = newTunnels;
	}

	export var tunnels: tunnel[] = [];

	export class tunnel extends toggle {
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
		protected measure() {
			this.aabb = new THREE.Box3().setFromObject(this.object, true);
			this.expandedAabb = this.aabb.clone().expandByScalar(tunnelExpand);
		}
		private gatherProps() {
			for (const prop of props.props) {
				if (prop.aabb && this.aabb.intersectsBox(prop.aabb)) {
					this.props.push(prop);
				}
			}
			console.log(this.name, 'collected', this.props.length, 'props');
		}
		clear() { }
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
		hide(newTunnels: tunnel[]) {
			if (this.off()) {
				console.warn(`Oops: Tunnel ${this.name} is already hidden.`);
				return;
			}
			this.object.visible = false;
			for (const prop of this.props) {
				// Only hide if no new tunnel has this prop
				if (!Array.from(newTunnels).some(t => t.props.includes(prop))) {
					prop.hide();
				}
			}
		}
		mesh() {
			for (const tunnel of tunnels) {
				if (this === tunnel)
					continue;
				if (this.expandedAabb.intersectsBox(tunnel.expandedAabb))
					this.adjacentTunnels.push(tunnel);
			}
		}
	}
}

const check: mycomponent = tunnels;

export default tunnels;