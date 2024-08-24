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
import viewport from "./viewport.js";
glob.developer = true;
var hunt;
(function (hunt) {
    hunt.inch = 0.0254;
    hunt.inchMeter = (1 / 0.0254); // 39.3700787
    hunt.timeStep = (1 / 60);
    hunt.dt = 0;
    function sample(a) {
        return a[Math.floor(Math.random() * a.length)];
    }
    hunt.sample = sample;
    function clamp(val, min, max) {
        return val > max ? max : val < min ? min : val;
    }
    hunt.clamp = clamp;
    async function boot() {
        console.log('day setting up');
        hunt.gviewport = new viewport;
        hunt.locker = document.querySelector('hunt-instructions');
        hunt.main = document.querySelector('hunt-main');
        points.add([0, 0], [1, 1]);
        physics.boot();
        props.boot();
        renderer.boot();
        vr.boot();
        await sketchup.boot();
        audio.boot();
        vr.start();
        hunt.gplayer = new player();
        // new physics.simple_box();
    }
    hunt.boot = boot;
    async function loop(delta) {
        hunt.dt = delta;
        glob.w = app.proompt('w');
        glob.s = app.proompt('s');
        glob.a = app.proompt('a');
        glob.d = app.proompt('d');
        glob.shift = app.proompt('shift');
        glob.space_bar = app.proompt(' ');
        glob.x = app.proompt('x');
        glob.z = app.proompt('z');
        glob.c = app.proompt('c');
        glob.v = app.proompt('v');
        glob.h = app.proompt('h');
        if (app.proompt('f2')) {
            hunt.locker.style.display = 'none';
        }
        hunt.gplayer?.loop(delta);
        physics.loop(hunt.timeStep);
        props.loop();
        await sketchup.loop();
        vr.loop();
        //if (!glob.xr)
        renderer.render();
    }
    hunt.loop = loop;
})(hunt || (hunt = {}));
(function () {
    console.log('iife');
})();
export default hunt;
