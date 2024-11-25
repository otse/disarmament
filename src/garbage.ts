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
import tunnels from "./tunnels.js";
import common from "./common.js";

glob.developer = true;

namespace garbage {
	export const inch = 0.0254
	export const inchMeter = (1 / 0.0254) // 39.3700787
	export const spaceMultiply = inchMeter;
	export const timeStep = (1 / 60);

	export var main, locker
	
	export var frameTime = 0

	export var gplayer: player

	export function sample(a) {
		return a[Math.floor(Math.random() * a.length)];
	}

	export function clamp(val, min, max) {
		return val > max ? max : val < min ? min : val;
	}

	export async function boot() {
		console.log('day setting up');

		locker = document.querySelector('garbage-instructions')! as HTMLElement;
		main = document.querySelector('garbage-body');

		glob.level = 'gen2';
		glob.wireframes = false;
		glob.propAxes = false;
		glob.gripRays = false;

		common.boot();
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
		frameTime = delta;
		if (frameTime > 1.0)
			frameTime = 1;
		if (app.proompt('f2')) {
			garbage.locker.style.display = 'none';
		}
		vr.loop();
		gplayer?.loop(frameTime);
		tunnels.loop();
		physics.loop(garbage.timeStep);
		props.loop();
		await sketchup.loop();
		renderer.loop_and_render();
	}
}

(function () {
	console.log('iife');

})()

export default garbage;