import app from "./app.js";
import audio from "./audio.js";
import glob from "./lib/glob.js";
import physics from "./physics.js";
import player from "./player.js";
import props from "./components/props.js";
import points from "./lib/pts.js";
import renderer from "./renderer.js";
import vr from "./vr/vr.js";
import sketchup from "./sketchup.js";
import tunnels from "./components/tunnels.js";
import common from "./common.js";
import attribrush from "./components/attribrush.js";
import { hooks } from "./lib/hooks.js";

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
		console.log(' day setting up '); // Day is the name of the joke game that started it

		locker = document.querySelector('garbage-instructions')! as HTMLElement;
		main = document.querySelector('garbage-body');

		glob.level = 'gen2';
		glob.wireframes = false;
		glob.propAxes = false;
		glob.gripRays = false;

		common.boot();
		physics.boot();
		attribrush.boot();
		props.boot();
		tunnels.boot();
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
		//tunnels.loop();
		//props.loop();
		physics.loop(garbage.timeStep);
		hooks.call('levelLoop', 0);
		await sketchup.loop();
		renderer.loop_and_render();
	}
}

(function () {
	console.log('iife');

})()

export default garbage;