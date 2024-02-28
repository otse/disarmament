import app from "./app.js";
import audio from "./audio.js";
import glob from "./lib/glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./props.js";
import points from "./lib/pts.js";
import renderer from "./renderer.js";
import sketchup from "./sketchup.js";
import viewport from "./viewport.js";

glob.developer = true;

namespace hunt {
	export const inch = 0.0254
	export const inchMeter = (1 / 0.0254) // 39.3700787
	export const timeStep = (1 / 60)

	export var main, locker
	export var dt = 0

	export var gviewport: viewport
	export var gplayer: player

	export function sample(a) {
		return a[Math.floor(Math.random() * a.length)];
	}

	export function clamp(val, min, max) {
		return val > max ? max : val < min ? min : val;
	}

	export async function boot() {
		console.log('day setting up');

		gviewport = new viewport;

		locker = document.querySelector('hunt-instructions')! as HTMLElement;
		main = document.querySelector('hunt-main');

		points.add([0, 0], [1, 1]);

		physics.boot();
		props.boot();
		renderer.boot();
		await sketchup.boot();
		audio.boot();

		gplayer = new player();

		// new physics.simple_box();
	}

	export async function loop(delta: number) {
		dt = delta;

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

		gplayer?.loop(delta);
		physics.loop(hunt.timeStep);
		props.loop();
		await sketchup.loop();
		//if (!glob.xr)
		renderer.render();
	}
}

(function () {
	console.log('iife');

})()

export default hunt;