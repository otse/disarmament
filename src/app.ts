import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import points from "./lib/pts.js";
import hunt from "./hunt.js";

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

	export var mobile = false
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

		hooks.call('AppBoot', null);
		await hunt.boot();

		mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		function onmousemove(e) {
			pos[0] = e.clientX;
			pos[1] = e.clientY;
		}

		function onmousedown(e) {
			mb[e.button] = 1;
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
				mb[0] = KEY.PRESSED;
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
			document.querySelectorAll('hunt-stats')[0].innerHTML = message;
		}
		if (mobile) {
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
		loop();
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
	export var af

	async function sleep() {
		return new Promise(requestAnimationFrame);
	}

	export async function loop() {
		do {
		await sleep();
		//await new Promise(resolve => setTimeout(resolve, 16.6)); // 60 fps mode
		const now = (performance || Date).now();
		delta = (now - last) / 1000;
		last = now;
		await hunt.loop(delta);
		wheel = 0;
		post_keys();
		post_mouse_buttons();
		} while (1);
	}

	export function fluke_set_innerhtml(selector, html) {
		let element = document.querySelectorAll(selector)[0];
		element.innerHTML = html;
	}

	export function fluke_set_style(selector, style, property) {
		let element = document.querySelectorAll(selector)[0];
		element.style[style] = property;
	}
}

window['App'] = app;

export default app;