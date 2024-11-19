import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import points from "./lib/pts.js";
import garbage from "./garbage.js";

namespace app {

	export enum KEY {
		UNPRESSED, PRESSED, REPEAT_DELAY, REPEAT, RELEASED
	}

	export enum MB {
		UP = - 1, OFF, DOWN, STILL
	}

	const keys: { [key: string]: number } = {}
	const mb = {}
	var pos: vec2 = [0, 0]

	export var wheel = 0

	export function onkeys(event) {
		const key = event.key.toLowerCase();
		if ('keydown' == event.type)
			keys[key] = keys[key]
				? KEY.REPEAT : KEY.PRESSED;
		else if ('keyup' == event.type)
			keys[key] = KEY.RELEASED;
		if (event.keyCode == 114)
			event.preventDefault();
	}

	export function proompt(k: string) {
		return keys[k] || KEY.UNPRESSED;
	}

	export async function boot(version: string) {

		console.log(' app boot ');

		hooks.call('appBoot', null);

		if ('xr' in navigator)
			await (navigator as any).xr.isSessionSupported( 'immersive-vr' ).then(x => glob.hasHeadset = x);

		await garbage.boot();

		glob.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		function onmousemove(e) {
			pos[0] = e.clientX;
			pos[1] = e.clientY;
		}

		function onmousedown(e) {
			mb[e.button] = MB.DOWN;
			if (e.button == 1)
				return false;
		}

		function onmouseup(e) {
			mb[e.button] = MB.UP;
		}

		function onwheel(e) {
			wheel = e.deltaY < 0 ? 1 : -1;
		}

		let touchStart: vec2 = [0, 0];
		function ontouchstart(e) {
			//message("ontouchstart");
			touchStart = [e.pageX, e.pageY];
			pos[0] = e.pageX;
			pos[1] = e.pageY;
			mb[2] = MB.UP;
		}

		function ontouchmove(e) {
			pos[0] = e.pageX;
			pos[1] = e.pageY;
			if (!mb[0])
				mb[0] = MB.DOWN;
			e.preventDefault();
			return false;
		}

		function ontouchend(e) {
			const touchEnd: vec2 = [e.pageX, e.pageY];
			mb[0] = MB.UP;
			mb[2] = MB.UP;

			if (points.equals(touchEnd, touchStart) /*&& buttons[2] != MOUSE.STILL*/) {
				mb[2] = MB.DOWN;
			}/*
			else if (!pts.equals(touchEnd, touchStart)) {
				buttons[2] = MOUSE.UP;
			}
			//message("ontouchend");*/
			//return false;
		}

		function onerror(message) {
			document.querySelectorAll('garbage-stats')[0].innerHTML = message;
		}
		if (glob.mobile) {
			document.ontouchstart = ontouchstart;
			document.ontouchmove = ontouchmove;
			document.ontouchend = ontouchend;
		}
		else {
			document.onkeydown = document.onkeyup = onkeys;
			document.onmousemove = onmousemove;
			document.onmousedown = onmousedown;
			document.onmouseup = onmouseup;
			document.onwheel = onwheel;
		}
		window.onerror = onerror;
		if (!glob.hasHeadset)
			blockable = trick_animation_frame(base_loop);
	}

	function post_keys() {
		for (let i in keys) {
			if (keys[i] == KEY.PRESSED)
				keys[i] = KEY.REPEAT_DELAY;
			else if (keys[i] == KEY.RELEASED)
				keys[i] = KEY.UNPRESSED;
		}
	}

	function post_mouse_buttons() {
		for (let b of [0, 1, 2])
			if (mb[b] == MB.DOWN)
				mb[b] = MB.STILL;
			else if (mb[b] == MB.UP)
				mb[b] = MB.OFF;
	}

	export var delta = 0
	export var last = 0

	export async function base_loop() {
		//await new Promise(resolve => setTimeout(resolve, 16.6)); // 60 fps mode
		const now = (performance || Date).now();
		delta = (now - last) / 1000;
		last = now;
		await garbage.loop(delta);
		wheel = 0;
		post_keys();
		post_mouse_buttons();
	}

	async function sleep() {
		return new Promise(requestAnimationFrame);
	}

	export var blockable

	export async function trick_animation_frame(callback) {
		let run = true;
		do {
			await sleep();
			await callback();
		} while (run);
		return {
			runs: () => run,
			stop: () => run = false,
		};
	}

	export function selector_innerhtml(selector, html) {
		let element = document.querySelectorAll(selector)[0];
		element.innerHTML = html;
	}

	export function selector_style(selector, style, property) {
		let element = document.querySelectorAll(selector)[0];
		element.style[style] = property;
	}
}

window['App'] = app;

export default app;