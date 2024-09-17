// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility

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
			const [kind, preset, hint] = object.name?.split('_');
			if (kind === 'tunnel')
				new tunnel(object);
		}
		scene.traverse(finder);
	}

	var tunnels: tunnel[] = []

	export class tunnel {
		aabb
		wiremesh
		constructor(public readonly object) {
			console.log(' new tunnel ');

			tunnels.push(this);
			this.measure();
			this.wiremesh = new frame(this);
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

	export class frame {
		mesh
		constructor(public tunnel: tunnel) {
			this.build();
		}
		build() {
			const size = new THREE.Vector3();
			this.tunnel.aabb.getSize(size);
			//size.multiplyScalar(garbage.spaceMultiply);
			const material = new THREE.MeshBasicMaterial({
				color: 'green',
				wireframe: true
			});
			const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
			this.mesh = new THREE.Mesh(boxGeometry, material);
			// this.mesh.position.copy(this.tunnel.aabb.min);
			this.tunnel.aabb.getCenter(this.mesh.position);
			renderer.scene.add(this.mesh);
		}
	}
}

export default tunnels;