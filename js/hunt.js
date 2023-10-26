import audio from "./audio.js";
import glob from "./glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./props.js";
import points from "./pts.js";
import renderer from "./renderer.js";
import sketchup from "./sketchup.js";
import viewport from "./viewport.js";
glob.developer = true;
var hunt;
(function (hunt) {
    hunt.inch = 0.0254;
    hunt.inchMeter = (1 / 0.0254);
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
    function boot() {
        console.log('day setting up');
        hunt.gviewport = new viewport;
        hunt.hunt_instructions = document.querySelector('hunt-instructions');
        hunt.hunt_main = document.querySelector('hunt-main');
        points.add([0, 0], [1, 1]);
        physics.boot();
        props.boot();
        renderer.boot();
        sketchup.boot();
        audio.boot();
        hunt.gplayer = new player();
        // new physics.simple_box();
    }
    hunt.boot = boot;
    function loop(delta) {
        hunt.dt = delta;
        hunt.gplayer.loop(delta);
        physics.loop(hunt.timeStep);
        props.loop();
        renderer.render();
    }
    hunt.loop = loop;
})(hunt || (hunt = {}));
(function () {
    console.log('iife');
})();
export default hunt;
