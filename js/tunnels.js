// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility
import common from "./common.js";
import garbage from "./garbage.js";
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
            const [kind, name, hint] = object.name?.split('_');
            if (kind === 'tunnel')
                new tunnel(object, name);
        }
        scene.traverse(finder);
    }
    tunnels_1.find_make_tunnels = find_make_tunnels;
    var tunnels = [];
    class tunnel {
        object;
        name;
        aabb;
        vdb;
        constructor(object, name) {
            this.object = object;
            this.name = name;
            tunnels.push(this);
            this.measure();
            this.vdb = new common.visual_debug_box(this, 'green', true);
            renderer.scene.add(this.vdb.mesh);
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
    function loop() {
        const aabb = garbage.gplayer.aabb;
        for (const tunnel of tunnels) {
            if (tunnel.aabb.intersectsBox(aabb)) {
                console.log('we are in tunnel', tunnel.name);
                break;
            }
        }
    }
    tunnels_1.loop = loop;
})(tunnels || (tunnels = {}));
export default tunnels;
