/// stuff that gets reused but doesn't fit anywhere else

import glob from "./lib/glob.js";

interface has_property_aabb {
	aabb: any
}

namespace common {
	export function boot() {

	}
	export class debug_box {
		mesh
		constructor(
			public base: has_property_aabb,
			public color,
			public absolute = false
		) {
			this.build();
		}
		lod() {
			this.mesh.parent.remove(this.mesh);
		}
		recolor(color) {
			this.mesh.material.color = new THREE.Color(color);
		}
		build() {
			const size = new THREE.Vector3();
			const material = new THREE.MeshBasicMaterial({
				color: this.color,
				wireframe: true
			});
			this.mesh = new THREE.Mesh(undefined, material);
			this.mesh.visible = glob.wireframes;
			this.base.aabb.getSize(size);
			if (this.absolute)
				this.base.aabb.getCenter(this.mesh.position);
			this.mesh.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
		}
	}
}

export default common;