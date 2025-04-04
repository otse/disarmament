import app from "./app.js";
import audio from "./audio.js";
import glob from "./lib/glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./components/props.js";
import renderer from "./renderer.js";
import vr from "./vr/vr.js";
import sketchup from "./sketchup.js";
import tunnels from "./components/tunnels.js";
import common from "./common.js";
import attribrush from "./components/attribrush.js";
import { hooks } from "./lib/hooks.js";
glob.developer = true;
var garbage;
(function (garbage) {
    garbage.inch = 0.0254;
    garbage.inchMeter = (1 / 0.0254); // 39.3700787
    garbage.spaceMultiply = garbage.inchMeter;
    garbage.timeStep = (1 / 60);
    garbage.frameTime = 0;
    function sample(a) {
        return a[Math.floor(Math.random() * a.length)];
    }
    garbage.sample = sample;
    function clamp(val, min, max) {
        return val > max ? max : val < min ? min : val;
    }
    garbage.clamp = clamp;
    async function boot() {
        console.log(' day setting up '); // Day is the name of the joke game that started it
        garbage.locker = document.querySelector('garbage-instructions');
        garbage.main = document.querySelector('garbage-body');
        glob.level = 'gen2';
        glob.wireframes = false;
        glob.propAxes = false;
        glob.gripRays = false;
        renderer.boot();
        vr.boot();
        common.boot();
        physics.boot();
        attribrush.boot();
        props.boot();
        tunnels.boot();
        await sketchup.boot();
        audio.boot();
        vr.start();
        garbage.gplayer = new player();
        // new physics.simple_box();
    }
    garbage.boot = boot;
    async function loop(delta) {
        garbage.frameTime = delta;
        if (garbage.frameTime > 1.0)
            garbage.frameTime = 1;
        if (app.proompt('f2')) {
            garbage.locker.style.display = 'none';
        }
        vr.loop();
        garbage.gplayer?.loop(garbage.frameTime);
        hooks.emit('garbageStep', 0);
        physics.loop(garbage.timeStep);
        await sketchup.loop();
        renderer.loop_and_render();
    }
    garbage.loop = loop;
})(garbage || (garbage = {}));
(function () {
    console.log('iife');
})();
export default garbage;
