import audio from "./audio.js";
import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import hunt from "./hunt.js";
import physics from "./physics.js";
import renderer from "./renderer.js";

namespace props {

	export function factory(object: any) {
		let prop: prop | undefined;
		if (!object.name)
			return;
		const [kind, preset] = object.name.split('_');
		switch (kind) {
			case 'prop':
			case 'box':
				console.log(' new pbox ', kind, preset);
				prop = new pbox(object, {});
				break;
			case 'env':
			case 'sound':
				prop = new psound(object, {});
				break;
			case 'light':
				prop = new plight(object, {});
				break;
			case 'spotlight':
				prop = new pspotlight(object, {});
				break;
			case 'wall':
			case 'solid':
				prop = new pwallorsolid(object, {});
				break;
			case 'door':
				prop = new pdoor(object, {});
				break;
			case 'fan':
				prop = new pfan(object, {});
				break;
			default:
		}
		if (prop) {
			prop.kind = kind;
			prop.preset = preset;
		}
		return prop;
	}

	export function boot() {

	}

	export function loop() {
		for (let prop of all)
			prop.loop();
	}

	export function take_collada_prop(prop: prop) {
		// the prop is sitting in a rotated, scaled scene graph
		// set it apart
		prop.group = new THREE.Group();

		prop.object.matrixWorld.decompose(
			prop.group.position,
			prop.group.quaternion,
			prop.group.scale);

		prop.object.position.set(0, 0, 0);
		prop.object.rotation.set(0, 0, 0);
		prop.object.quaternion.identity();
		prop.object.updateMatrix();
		prop.object.updateMatrixWorld();

		prop.group.add(prop.object);
		prop.group.updateMatrix();
		prop.group.updateMatrixWorld();

		renderer.propsGroup.add(prop.group);

		function traversal(object) {
			object.geometry?.computeBoundingBox();
		}
		prop.object.traverse(traversal);
	}

	export var all: prop[] = []
	export var walls: psound[] = []
	export var sounds: psound[] = []
	export var boxes: psound[] = []
	export var lights: plight[] = []

	export abstract class prop {
		array: prop[] = []
		type
		kind
		preset
		oldRotation
		group
		master
		fbody: physics.fbody
		aabb
		constructor(public readonly object, public readonly parameters) {
			this.type = 'ordinary prop';
			all.push(this);
		}
		complete() {
			this.array.push(this);
			take_collada_prop(this);
			this.measure();
			this._finish();
		}
		protected _finish() { // override
		}
		protected _lod() { // override
		}
		protected _loop() { // override
		}
		loop() {
			this._loop();
		}
		lod() {
			all.splice(all.indexOf(this), 1);
			this.array.splice(this.array.indexOf(this), 1);
			this._lod();
		}
		protected measure() {
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.group, true);
		}
		correction_for_physics() {
			const size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.multiplyScalar(hunt.inchMeter);
			this.object.rotation.set(-Math.PI / 2, 0, 0);
			this.object.position.set(-size.x / 2, -size.y / 2, size.z / 2);
		}
	}

	export class pwallorsolid extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pwallorsolid';
			this.array = walls;
		}
		override _finish() {
			new physics.fbox(this);
			if (this.object.name == 'wall')
				this.object.visible = false;
		}
		override _loop() {
		}
	}

	export class pbox extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pbox';
			this.array = boxes;
		}
		override _finish() {
			new physics.fbox(this);
		}
		override _loop() {
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
			this.fbody.loop();
		}
		override _lod() {
		}
	}

	const sound_presets = {
		wind: { name: 'gorge', volume: .5, loop: true, distance: 4 },
	}

	export class psound extends prop {
		sound
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'psound';
			this.array = sounds;
			hooks.register('audioGestured', (x) => {
				console.warn('late playing');
				if (this.kind == 'env')
					this._play();
				return false;
			});
		}
		override _finish() {
			this.object.visible = false;
			this._play();
		}
		override _loop() {
		}
		_play() {
			if (!audio.loaded)
				return;
			const preset = sound_presets[this.preset];
			if (!preset)
				return;
			this.sound = audio.playOnce(preset.name, preset.volume, preset.loop);
			if (this.sound) {
				this.group.add(this.sound);

				const panner = this.sound.getOutput();
				panner.distanceModel = 'exponential';
				panner.rolloffFactor = 4;
				panner.panningModel = 'HRTF';
				this.sound?.setRefDistance(preset.distance);

				const helper = new PositionalAudioHelper(this.sound);
				this.group.add(helper);
				helper.update();
			}
		}
	}

	export class pfan extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pfan';
		}
		override _finish() {
			//this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
			const size = new THREE.Vector3();
			const center = new THREE.Vector3();
			this.aabb.getSize(size);
			this.aabb.getCenter(center);

			const temp = new THREE.Vector3(size.x, size.z, size.y);
			temp.multiplyScalar(hunt.inchMeter);
			
			size.divideScalar(2);
			size.z = -size.z;

			if (this.preset == 'y') {
			}

			if (this.preset == 'z') {
			}

			this.object.position.sub(temp.divideScalar(2));
			this.group.position.add(size);

			//size.divideScalar(2);

			//this.object.position.sub(size);

			//this.object.position.add(size);

		}
		override _loop() {
			if (this.preset == 'y')
				this.group.rotation.z += 0.005;
			if (this.preset == 'z')
				this.group.rotation.y += 0.005;
			this.group.updateMatrix();

		}
	}

	export class pdoor extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pdoor';
		}
		override _finish() {
			new physics.fdoor(this);
			//this.object.add(new THREE.AxesHelper(20));
			//this.group.add(new THREE.AxesHelper(20));
		}
		override _loop() {
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
			this.fbody.loop();
		}
	}

	const light_presets = {
		sconce: { hide: false, color: 'white', intensity: 0.1, distance: 1, offset: [0, 0, -5] },
		sconce1: { hide: true, color: 'white', intensity: 0.1, distance: 2.0, decay: 0.1 },
		openwindow: { hide: true, color: 'white', intensity: 0.5, distance: 3, decay: 0.3 },
		skylightstart: { hide: true, color: 'white', intensity: 0.3, distance: 4.0, decay: 0.5 },
		mtfanambient: { hide: true, color: 'white', intensity: 0.15, distance: 5.0, decay: 0.1 },
		skirt: { hide: true, color: 'green', intensity: 0.2, distance: 3.0, decay: 1.0 },
		alert: { hide: true, color: 'red', intensity: 0.05, distance: 1.0, decay: 0.6 },
		sewerworld: { hide: true, color: 'red', intensity: 0.1, distance: 2.0, decay: 0.1 },
		none: { hide: true, color: 'white', intensity: 0.1, distance: 10 }
	}

	export class plight extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'plight';
			this.array = lights;
		}
		override _finish() {
			//this.object.visible = false;
			const preset = light_presets[this.preset || 'none'];
			this.object.visible = !preset.hide;

			const center = new THREE.Vector3();
			this.aabb.getCenter(center);
			center.divideScalar(2.0);

			let light = new THREE.PointLight(
				preset.color,
				preset.intensity,
				preset.distance,
				preset.decay);
			light.position.fromArray(preset.offset || [0, 0, 0])
			light.position.add(center);
			//light.add(new THREE.AxesHelper(10));
			this.group.add(light);
		}
		override _loop() {
		}
	}

	const spotlight_presets = {
		sewerworld: { hide: true, color: 'red', intensity: 0.5, distance: 10.0, decay: 1.0, shadow: true, target: [0, 1, 0] },
	}

	export class pspotlight extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pspotlight';
			this.array = lights;
		}
		override _finish() {
			const preset = spotlight_presets[this.preset || 'none'];
			this.object.visible = !preset.hide;

			const size = new THREE.Vector3();
			const center = new THREE.Vector3();
			this.aabb.getSize(size);
			this.aabb.getCenter(center);
			size.multiplyScalar(hunt.inchMeter);
			//console.log('light size, center', size, center);

			let light = new THREE.SpotLight(
				preset.color,
				preset.intensity,
				preset.distance,
				preset.decay);
			light.castShadow = preset.shadow;
			light.shadow.camera.far = 1000;
			//light.angle = Math.PI / 2;
			//light.penumbra = 0.5;
			//light.decay = 0.1;
			//light.shadow.camera.near = 0.5;
			//light.position.add(size.divideScalar(2.0));
			//light.target.position.add(size.divideScalar(2.0));
			light.target.position.add(new THREE.Vector3().fromArray(preset.target).multiplyScalar(10));
			//this.group.add(new THREE.AxesHelper(10));
			this.group.add(light);
			this.group.add(light.target);
			//this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
		}
		override _loop() {
		}
	}

	export const impact_sounds = {
		'cardboard': {
			soft: [
				'cardboard_box_impact_soft1',
				'cardboard_box_impact_soft2',
				'cardboard_box_impact_soft3',
				'cardboard_box_impact_soft4',
				'cardboard_box_impact_soft5',
				'cardboard_box_impact_soft6',
				'cardboard_box_impact_soft7',],
			hard: [
				'cardboard_box_impact_hard1',
				'cardboard_box_impact_hard2',
				'cardboard_box_impact_hard3',
				'cardboard_box_impact_hard4',
				'cardboard_box_impact_hard5',
				'cardboard_box_impact_hard6',
				'cardboard_box_impact_hard7',]
		},
		'plastic': {
			soft: [
				'plastic_box_impact_soft1',
				'plastic_box_impact_soft2',
				'plastic_box_impact_soft3',
				'plastic_box_impact_soft4',],
			hard: [
				'plastic_box_impact_hard1',
				'plastic_box_impact_hard2',
				'plastic_box_impact_hard3',
				'plastic_box_impact_hard4',]
		},
		'metal': {
			soft: [
				'metal_solid_impact_soft1',
				'metal_solid_impact_soft2',
				'metal_solid_impact_soft3',],
			hard: [
				'metal_solid_impact_hard1',
				'metal_solid_impact_hard4',
				'metal_solid_impact_hard5',],

		}
	}
}

export default props;