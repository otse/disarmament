import hooks from "./lib/hooks.js";
import garbage from "./garbage.js";
import renderer from "./renderer.js";

class asd {
	readonly bluh
}


namespace audio {

	var listener

	let gestured = false

	export var allDone = false

	export const cardboard = [
		'./assets/sound/cardboard/cardboard_box_impact_hard1.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard2.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard3.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard4.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard5.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard6.wav',
		'./assets/sound/cardboard/cardboard_box_impact_hard7.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft1.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft2.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft3.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft4.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft5.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft6.wav',
		'./assets/sound/cardboard/cardboard_box_impact_soft7.wav'
	]

	export const plastic = [
		'./assets/sound/plastic/plastic_box_impact_hard1.wav',
		'./assets/sound/plastic/plastic_box_impact_hard2.wav',
		'./assets/sound/plastic/plastic_box_impact_hard3.wav',
		'./assets/sound/plastic/plastic_box_impact_hard4.wav',
		'./assets/sound/plastic/plastic_box_impact_soft1.wav',
		'./assets/sound/plastic/plastic_box_impact_soft2.wav',
		'./assets/sound/plastic/plastic_box_impact_soft3.wav',
		'./assets/sound/plastic/plastic_box_impact_soft4.wav'
	]

	export const metal = [
		'./assets/sound/metal/metal_solid_impact_hard1.wav',
		'./assets/sound/metal/metal_solid_impact_hard4.wav',
		'./assets/sound/metal/metal_solid_impact_hard5.wav',
		'./assets/sound/metal/metal_solid_impact_soft1.wav',
		'./assets/sound/metal/metal_solid_impact_soft2.wav',
		'./assets/sound/metal/metal_solid_impact_soft3.wav',
	]

	export const environment = [
		'./assets/sound/env/computalk2.wav',
		'./assets/sound/env/drone4lp.wav',
		'./assets/sound/env/quiet_cellblock_amb.wav',
		'./assets/sound/env/sewer_air1.wav',
	];

	export const other = [
		'./assets/sound/other/whoosh.wav',
	];

	export const footsteps = [
		'./assets/sound/other/whoosh.wav',
	];

	export var buffers: any = {
	}

	export function boot() {

		garbage.locker.addEventListener('click', function () {
			console.log('create gesture');
			gesture();
		});
	}

	function gesture() {
		if (gestured)
			return;
		load();
		gestured = true;
	}

	let queue = 0;
	let loaded = 0;
	function load() {
		listener = new THREE.AudioListener();
		renderer.camera.add(listener);

		console.log('audio load');

		let loads: string[] = [];
		loads = loads.concat(other, cardboard, plastic, metal, environment);
		queue = loads.length;

		const loader = new THREE.AudioLoader();
		for (let path of loads) {
			let basename = path.replace(/^.*[\\/]/, '');
			basename = basename.split('.')[0];
			loader.load(path,
				function (buffer) {
					buffers[basename] = buffer;
					loaded++;
					if (loaded == queue) {
						console.log( ' done loading audios ', loaded);
						hooks.call('audioGestured', 1);
					}

				},
				function () { },
				function () {
					console.warn(' hunt audio cannot load ', basename);
				});
		}
		allDone = true;
		//setTimeout(() => hooks.call('audioGestured', 1), 2000);
	}

	export function playOnce(id: string, volume: number = 1, loop = false) {
		const buffer = buffers[id];
		if (!buffer) {
			console.warn(' sound doesnt exist ', id);
			return;
		}

		let positional = new THREE.PositionalAudio(listener);
		positional.setBuffer(buffer);

		positional.setLoop(loop);
		positional.setVolume(volume);
		positional.play();

		return positional;
	}
}

export default audio;