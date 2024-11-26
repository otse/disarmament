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
    function clear() {
        for (const tunnel of tunnels_1.tunnels)
            tunnel.cleanup();
        tunnels_1.tunnels = [];
        tunnels_1.currentTunnel = undefined;
    }
    tunnels_1.clear = clear;
    function loop() {
        for (const tunnel of tunnels_1.tunnels) {
            if (tunnel.check())
                break;
        }
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
            __dirtyConvertContainedToSpanning(tunnel);
        }
    }
    tunnels_1.findMakeTunnels = findMakeTunnels;
    tunnels_1.tunnels = [];
    class tunnel extends toggle {
        object;
        name;
        static visibleTunnels = new Set();
        aabb;
        expandedAabb;
        // Props that are fully contained within this tunnel's bounding box
        containedObjects = [];
        // Objects that intersect but are not fully contained within this tunnel's bounding box
        spanningObjects = [];
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
            this.gatherContainedProps();
        }
        measure() {
            this.aabb = new THREE.Box3().setFromObject(this.object, true);
            this.expandedAabb = this.aabb.clone().expandByScalar(arbitrary_expand);
        }
        findAdjacentTunnels() {
            for (const tunnel of tunnels_1.tunnels) {
                if (this === tunnel)
                    continue;
                if (this.expandedAabb.intersectsBox(tunnel.expandedAabb))
                    this.adjacentTunnels.push(tunnel);
            }
        }
        gatherContainedProps() {
            // Gather props that are either fully contained within or intersect with this tunnel
            for (const prop of props.props) {
                if (prop.aabb && this.aabb.intersectsBox(prop.aabb)) {
                    if (this.aabb.containsBox(prop.aabb)) {
                        this.containedObjects.push(prop);
                    }
                    else {
                        this.spanningObjects.push(prop);
                    }
                }
            }
            console.log(this.name, 'collected', this.containedObjects.length, 'props', this.containedObjects);
        }
        cleanup() {
        }
        show() {
            if (this.on()) {
                console.warn(`Oops: Tunnel ${this.name} is already showing.`);
                return;
            }
            tunnel.visibleTunnels.add(this);
            this.object.visible = true;
            for (const prop of this.containedObjects) {
                prop.show();
            }
            for (const prop of this.spanningObjects) {
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
            for (const prop of this.containedObjects) {
                prop.hide();
            }
            for (const prop of this.spanningObjects) {
                // If no visible tunnel has this ambiguous prop, hide it
                if (!Array.from(tunnel.visibleTunnels).some(tunnel => tunnel.spanningObjects.includes(prop))) {
                    console.log('no visible tunnel has this spanning object prop', prop);
                    prop.hide();
                }
            }
        }
        check() {
            const playerAABB = garbage.gplayer.aabb;
            let checkme = this.expandedAabb.containsBox(playerAABB);
            if (!tunnels_1.currentTunnel)
                checkme = this.expandedAabb.intersectsBox(playerAABB);
            if (checkme) {
                if (tunnels_1.currentTunnel !== this) {
                    const currentTunnels = tunnels_1.currentTunnel ? [tunnels_1.currentTunnel, ...tunnels_1.currentTunnel.adjacentTunnels] : [];
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
                    tunnels_1.currentTunnel = this;
                }
                return true;
            }
            return false;
        }
    }
    tunnels_1.tunnel = tunnel;
    function __dirtyConvertContainedToSpanning(tunnel) {
        for (const prop of [...tunnel.containedObjects]) {
            // Check if any other tunnel also contains this prop
            const otherTunnel = tunnels_1.tunnels.find(otherTunnel => otherTunnel !== tunnel &&
                otherTunnel.containedObjects.includes(prop));
            if (otherTunnel) {
                console.warn(' Prop Overlap ', prop.type);
                // Remove from contained objects of both tunnels
                tunnel.containedObjects = tunnel.containedObjects.filter(p => p !== prop);
                otherTunnel.containedObjects = otherTunnel.containedObjects.filter(p => p !== prop);
                // Add to spanning objects of both tunnels if not already there
                if (!tunnel.spanningObjects.includes(prop)) {
                    tunnel.spanningObjects.push(prop);
                }
                if (!otherTunnel.spanningObjects.includes(prop)) {
                    otherTunnel.spanningObjects.push(prop);
                }
            }
        }
    }
})(tunnels || (tunnels = {}));
export default tunnels;
