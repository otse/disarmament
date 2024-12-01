/// Paint vertices to transition two textures
import { hooks } from "../lib/hooks.js";
import tunnels from "./tunnels.js";
var attribrush;
(function (attribrush) {
    const privateProp = 'Zuc';
    attribrush.componentName = 'AttriBrush Component';
    async function boot() {
        console.log(' AttriBrush Boot ');
        hooks.placeListener('levelLoaded', 0, loaded);
        hooks.placeListener('levelWipe', 0, clear);
        hooks.placeListener('garbageStep', 0, loop);
    }
    attribrush.boot = boot;
    async function loaded(scene) {
        console.log(`AttriBrush: There are ${tunnels.tunnels.length} tunnels.`);
        function findTunnels(object) {
            console.log('child objects');
        }
        for (const tunnel of tunnels.tunnels) {
            const { object } = tunnel;
        }
        scene.traverse(findTunnels);
        return false;
    }
    async function clear() {
        return false;
    }
    async function loop() {
        return false;
    }
})(attribrush || (attribrush = {}));
const validate = attribrush;
export default attribrush;
