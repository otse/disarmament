import app from "./app.js";
import audio from "./audio.js";
import glob from "./lib/glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./props.js";
import points from "./lib/pts.js";
import renderer from "./renderer.js";
import vr from "./vr/vr.js";
import sketchup from "./sketchup.js";
glob.developer = true;
var salvage;
(function (salvage) {
    salvage.inch = 0.0254;
    salvage.inchMeter = (1 / 0.0254); // 39.3700787
    salvage.spaceMultiply = salvage.inchMeter;
    salvage.timeStep = (1 / 60);
    salvage.dt = 0;
    function sample(a) {
        return a[Math.floor(Math.random() * a.length)];
    }
    salvage.sample = sample;
    function clamp(val, min, max) {
        return val > max ? max : val < min ? min : val;
    }
    salvage.clamp = clamp;
    async function boot() {
        console.log('day setting up');
        salvage.locker = document.querySelector('garbage-instructions');
        salvage.main = document.querySelector('garbage-body');
        points.add([0, 0], [1, 1]);
        physics.boot();
        props.boot();
        renderer.boot();
        vr.boot();
        await sketchup.boot();
        audio.boot();
        vr.start();
        salvage.gplayer = new player();
        // new physics.simple_box();
    }
    salvage.boot = boot;
    async function loop(delta) {
        salvage.dt = delta;
        if (app.proompt('f2')) {
            salvage.locker.style.display = 'none';
        }
        salvage.gplayer?.loop(delta);
        physics.loop(salvage.timeStep);
        props.loop();
        await sketchup.loop();
        vr.loop();
        renderer.loop_and_render();
    }
    salvage.loop = loop;
})(salvage || (salvage = {}));
(function () {
    console.log('iife');
})();
export default salvage;
