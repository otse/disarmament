/// Paint vertices to transition two textures
import { hooks } from "../lib/hooks.js";
var attribrush;
(function (attribrush) {
    const privateProp = 'Zuc';
    attribrush.componentName = 'AttriBrush Component';
    async function boot() {
        console.log(' AttriBrush Boot ');
        hooks.registerIndex('levelLoaded', 0, loaded);
        hooks.registerIndex('levelWipe', 0, clear);
        hooks.registerIndex('levelLoop', 0, loop);
    }
    attribrush.boot = boot;
    async function loaded() {
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
