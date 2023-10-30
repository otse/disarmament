import app from "./app.js";
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

namespace hunt {
	export const inch = 0.0254
	export const inchMeter = (1 / 0.0254)
	export const timeStep = (1 / 60)

	export var hunt_main, hunt_instructions
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

		hunt_instructions = document.querySelector('hunt-instructions')! as HTMLElement;
		hunt_main = document.querySelector('hunt-main');

		points.add([0, 0], [1, 1]);

		physics.boot();
		props.boot();
		renderer.boot();
		sketchup.boot();
		audio.boot();

		gplayer = new player();

		// new physics.simple_box();

	}

	export function loop(delta: number) {

		dt = delta;

		glob.w = app.proompt('w');
		glob.s = app.proompt('s');
		glob.a = app.proompt('a');
		glob.d = app.proompt('d');
		glob.shift = app.proompt('shift');
		glob.space_bar = app.proompt(' ');
		glob.x = app.proompt('x');
		glob.z = app.proompt('z');
		glob.v = app.proompt('v');
		glob.h = app.proompt('h');

		gplayer.loop(delta);
		physics.loop(hunt.timeStep);
		props.loop();
		sketchup.loop();
		renderer.render();

	}
}

(function () {
	console.log('iife');

})()

export default hunt;