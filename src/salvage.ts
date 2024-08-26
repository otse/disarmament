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

namespace salvage {
	export const inch = 0.0254
	export const inchMeter = (1 / 0.0254) // 39.3700787
	export const timeStep = (1 / 60)

	export var main, locker
	export var dt = 0

	export var gplayer: player

	export function sample(a) {
		return a[Math.floor(Math.random() * a.length)];
	}

	export function clamp(val, min, max) {
		return val > max ? max : val < min ? min : val;
	}

	export async function boot() {
		console.log('day setting up');

		locker = document.querySelector('salvage-instructions')! as HTMLElement;
		main = document.querySelector('salvage-body');

		points.add([0, 0], [1, 1]);

		physics.boot();
		props.boot();
		renderer.boot();
		vr.boot();
		await sketchup.boot();
		audio.boot();

		vr.start();

		gplayer = new player();

		// new physics.simple_box();
	}

	export async function loop(delta: number) {
		dt = delta;

		if (app.proompt('f2')) {
			salvage.locker.style.display = 'none';
		}

		//gplayer?.loop(delta);
		physics.loop(salvage.timeStep);
		props.loop();
		await sketchup.loop();
		vr.loop();
		renderer.loop_and_render();
	}
}

(function () {
	console.log('iife');

})()

export default salvage;