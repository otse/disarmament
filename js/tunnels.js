// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility
import common from "./common.js";
import garbage from "./garbage.js";
import toggle from "./lib/toggle.js";
import props from "./props.js";
import renderer from "./renderer.js";
var tunnels;
(function (tunnels_1) {
    function clear() {
        for (const tunnel of tunnels)
            tunnel.cleanup();
        tunnels = [];
    }
    tunnels_1.clear = clear;
    function loop() {
        for (const tunnel of tunnels) {
            if (tunnel.check())
                break;
        }
    }
    tunnels_1.loop = loop;
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
        for (const tunnel of tunnels)
            tunnel.findAdjacentTunnels();
    }
    tunnels_1.find_make_tunnels = find_make_tunnels;
    var tunnels = [];
    class tunnel extends toggle {
        object;
        name;
        aabb;
        aabb2;
        props = [];
        adjacentTunnels = [];
        debugBox;
        constructor(object, name) {
            super();
            this.object = object;
            this.name = name;
            tunnels.push(this);
            this.measure();
            this.debugBox = new common.debug_box(this, 'green', true);
            renderer.scene.add(this.debugBox.mesh);
            this.collect_props();
            this.hide();
        }
        measure() {
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
        collect_props() {
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
        show_aggregate() {
            this.show();
            for (const tunnel of this.adjacentTunnels) {
                tunnel.show();
            }
        }
        hide_aggregate() {
            this.hide();
            for (const tunnel of this.adjacentTunnels) {
                tunnel.hide();
            }
        }
        check() {
            const playerAABB = garbage.gplayer.aabb;
            if (this.aabb.intersectsBox(playerAABB)) {
                if (tunnels_1.corridor !== this) {
                    console.log('woo we are in tunnel', this.name);
                    tunnels_1.corridor?.hide_aggregate?.();
                    tunnels_1.corridor = this;
                    tunnels_1.corridor.show_aggregate();
                }
                return true;
            }
            else if (this.aabb.intersectsBox(playerAABB)) {
                //console.log('intersecting');
                // we are intersecting, but not containing
            }
            // No intersection
        }
        cleanup() {
            // tunnels.splice(tunnels.indexOf(this), 1);
        }
    }
    tunnels_1.tunnel = tunnel;
})(tunnels || (tunnels = {}));
export default tunnels;
