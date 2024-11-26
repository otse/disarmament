// this is the lod
// every other tunnel is culled
// works intensively with the props system to group props and handle visibility
import common from "./common.js";
import garbage from "./garbage.js";
import toggle from "./lib/toggle.js";
import props from "./props.js";
var tunnels;
(function (tunnels_1) {
    const arbitrary_expand = 0.1;
    const currentTunnels = new Set();
    function clear() {
        for (const tunnel of tunnels_1.tunnels)
            tunnel.clear();
        tunnels_1.tunnels = [];
    }
    tunnels_1.clear = clear;
    function loop() {
        check();
    }
    tunnels_1.loop = loop;
    function findMakeTunnels(scene) {
        function finder(object) {
            if (!object.name)
                return;
            const [kind, name, hint] = object.name?.split('_');
            if (kind === 'tunnel')
                new tunnel(object, name);
        }
        scene.traverse(finder);
        for (const tunnel of tunnels_1.tunnels) {
            tunnel.findAdjacentTunnels();
        }
    }
    tunnels_1.findMakeTunnels = findMakeTunnels;
    function check() {
        // Get all tunnels we're currently inside
        const activeTunnels = tunnels_1.tunnels.filter(t => t.expandedAabb.intersectsBox(garbage.gplayer.aabb));
        // Get all adjacent tunnels to our active set
        const newTunnels = [...new Set([
                ...activeTunnels,
                ...activeTunnels.flatMap(t => t.adjacentTunnels)
            ])];
        // Compare against currently visible tunnels
        for (const t of currentTunnels) {
            if (!newTunnels.includes(t)) {
                t.hide(newTunnels);
            }
        }
        for (const t of newTunnels) {
            if (!currentTunnels.has(t)) {
                t.show();
            }
        }
        return true;
    }
    tunnels_1.check = check;
    tunnels_1.tunnels = [];
    class tunnel extends toggle {
        object;
        name;
        aabb;
        expandedAabb;
        // Single array for all props that intersect with this tunnel
        props = [];
        adjacentTunnels = [];
        debugBox;
        constructor(object, name) {
            super();
            this.object = object;
            this.name = name;
            this.object.visible = false;
            this.object.frustumCulled = true;
            tunnels_1.tunnels.push(this);
            this.measure();
            this.debugBox = new common.debug_box(this, 'green', true);
            this.gatherProps();
        }
        measure() {
            this.aabb = new THREE.Box3().setFromObject(this.object, true);
            this.expandedAabb = this.aabb.clone().expandByScalar(arbitrary_expand);
        }
        gatherProps() {
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
            currentTunnels.add(this);
            this.object.visible = true;
            for (const prop of this.props) {
                prop.show();
            }
        }
        hide(newTunnels) {
            if (this.off()) {
                console.warn(`Oops: Tunnel ${this.name} is already hidden.`);
                return;
            }
            this.object.visible = false;
            currentTunnels.delete(this);
            for (const prop of this.props) {
                // Only hide if no new tunnel has this prop
                if (!Array.from(newTunnels).some(t => t.props.includes(prop))) {
                    prop.hide();
                }
            }
        }
        findAdjacentTunnels() {
            for (const tunnel of tunnels_1.tunnels) {
                if (this === tunnel)
                    continue;
                if (this.expandedAabb.intersectsBox(tunnel.expandedAabb))
                    this.adjacentTunnels.push(tunnel);
            }
        }
    }
    tunnels_1.tunnel = tunnel;
})(tunnels || (tunnels = {}));
export default tunnels;
