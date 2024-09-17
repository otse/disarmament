// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility
import renderer from "./renderer.js";
var tunnels;
(function (tunnels_1) {
    function clear() {
        for (const tunnel of tunnels)
            tunnel.cleanup();
        tunnels = [];
    }
    tunnels_1.clear = clear;
    function find_make_tunnels(scene) {
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
    tunnels_1.find_make_tunnels = find_make_tunnels;
    var tunnels = [];
    class tunnel {
        object;
        aabb;
        wiremesh;
        constructor(object) {
            this.object = object;
            console.log(' new tunnel ');
            tunnels.push(this);
            this.measure();
            this.wiremesh = new frame(this);
        }
        measure() {
            this.object.updateMatrix();
            this.object.updateMatrixWorld();
            this.aabb = new THREE.Box3();
            this.aabb.setFromObject(this.object, true);
        }
        cleanup() {
            // tunnels.splice(tunnels.indexOf(this), 1);
        }
    }
    tunnels_1.tunnel = tunnel;
    class frame {
        tunnel;
        mesh;
        constructor(tunnel) {
            this.tunnel = tunnel;
            this.build();
        }
        build() {
            const size = new THREE.Vector3();
            const material = new THREE.MeshBasicMaterial({
                color: 'green',
                wireframe: true
            });
            this.mesh = new THREE.Mesh(undefined, material);
            this.tunnel.aabb.getSize(size);
            this.tunnel.aabb.getCenter(this.mesh.position);
            this.mesh.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            // this.mesh.position.copy(this.tunnel.aabb.min);
            renderer.scene.add(this.mesh);
        }
    }
    tunnels_1.frame = frame;
})(tunnels || (tunnels = {}));
export default tunnels;
