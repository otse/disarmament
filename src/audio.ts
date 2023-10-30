import hunt from "./hunt.js";
import renderer from "./renderer.js";

namespace audio {

	var listener

	let gestured = false

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

	export var buffers: any = {
	}

	export function gesture() {
		if (gestured)
			return;
		load();
		gestured = true;
	}

	export function boot() {
		
		hunt.hunt_instructions.addEventListener('click', function () {
			console.log('create gesture');
			gesture();
		});
	}

	export function load() {
		listener = new THREE.AudioListener();
		renderer.camera.add(listener);

		console.log('audio load');

		let loads: string[] = [];
		loads = loads.concat(cardboard, plastic, metal);

		const loader = new THREE.AudioLoader();
		for (let path of loads) {
			let filename = path.replace(/^.*[\\/]/, '');
			filename = filename.split('.')[0];
			loader.load(path, function (buffer) {
				buffers[filename] = buffer;
			});
		}
	}

	export function playOnce(id: string, volume: number = 1) {
		const buffer = buffers[id];
		if (!buffer )
			return;

		let positional = new THREE.PositionalAudio(listener);
		positional.setBuffer(buffer);
		
		positional.setLoop(false);
		volume = hunt.clamp(volume, 0, 0.2);
		positional.setVolume(volume);
		positional.play();

		return positional;
	}
}

export default audio;