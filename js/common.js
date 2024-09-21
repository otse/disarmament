/// stuff that gets reused but doesn't fit anywhere else
import glob from "./lib/glob.js";
var common;
(function (common) {
    function boot() {
    }
    common.boot = boot;
    class debug_box {
        base;
        color;
        absolute;
        mesh;
        constructor(base, color, absolute = false) {
            this.base = base;
            this.color = color;
            this.absolute = absolute;
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
            if (this.absolute) {
                this.base.aabb.getCenter(this.mesh.position);
                glob.scene.add(this.mesh);
            }
            this.mesh.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        }
    }
    common.debug_box = debug_box;
})(common || (common = {}));
export default common;
