import app from "./app.js";
import audio from "./audio.js";
import glob from "./glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./props.js";
import points from "./pts.js";
import renderer from "./renderer.js";
import viewport from "./viewport.js";

glob.developer = true;

namespace hunt {
	export const inch = 0.0254
	export const inchMeter = (1 / 0.0254)
	export const timeStep = (1 / 60)

	export var day_main, day_instructions
	export var dt = 0

	export var gviewport: viewport
	export var gplayer: player

	export function sample(a) {
		return a[Math.floor(Math.random() * a.length)];
	}

	export function clamp(val, min, max) {
		return val > max ? max : val < min ? min : val;
	}

	export function boot() {
		console.log('day setting up');

		gviewport = new viewport;

		day_instructions = document.querySelector('day-instructions')! as HTMLElement;
		day_main = document.querySelector('day-main');

		points.add([0, 0], [1, 1]);

		physics.boot();
		props.boot();
		renderer.boot();
		audio.boot();

		gplayer = new player();

		// new physics.simple_box();

	}

	export function loop(delta: number) {

		dt = delta;

		gplayer.loop(delta);
		physics.loop(hunt.timeStep);
		props.loop();
		renderer.render();

	}
}

(function () {
	console.log('iife');

})()

export default hunt;