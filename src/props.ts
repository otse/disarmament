import audio from "./audio.js";
import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import garbage from "./garbage.js";
import physics from "./physics.js";
import renderer from "./renderer.js";
import easings from "./easings.js";
import app from "./app.js";

namespace props {

	export const wireframe_helpers = true; // broken

	export function factory(object: any) {
		let prop: prop | undefined;
		if (!object.name)
			return;
		const [kind, preset, hint] = object.name.split('_');
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
				prop = new ppointlight(object, {});
				break;
			case 'spotlight':
				prop = new pspotlight(object, {});
				break;
			case 'rectlight':
				prop = new prectlight(object, { axis: hint });
				break;
			case 'wall':
			case 'ground':
			case 'solid':
				prop = new pwallorsolid(object, {});
				break;
			case 'stairstep':
				prop = new pstairstep(object, {});
				break;
			case 'door':
				prop = new pdoor(object, { rotation: hint });
				break;
			case 'fan':
				prop = new pfan(object, { rotation: hint });
				break;
			case 'convex':
				console.log(' new convex ');
				prop = new pconvex(object, {});
				break;
			case 'marker':
				prop = new pmarker(object, {});
				break;
			default:
		}
		if (prop) {
			prop.kind = kind;
			prop.preset = preset;
		}
		return prop;
	}

	export function loop() {
		for (let prop of collection)
			prop.loop();
	}

	export function clear() {
		const array = collection.slice(0);
		for (let prop of array)
			prop.lod();
		collection = [];
	}

	export function take_collada_prop(prop: prop) {
		// the prop is sitting in a rotated, scaled scene graph
		// set it apart
		const group = new THREE.Group();
		const object = prop.object;

		object.matrixWorld.decompose(
			group.position,
			group.quaternion,
			group.scale);

		// group scale is 0.0254

		object.position.set(0, 0, 0);
		object.rotation.set(0, 0, 0);
		object.quaternion.identity();
		object.updateMatrix();
		object.updateMatrixWorld(true);

		group.add(object);
		group.updateMatrix();
		group.updateMatrixWorld(true);

		renderer.propsGroup.add(group);

		function traversal(object) {
			object.geometry?.computeBoundingBox();
		}
		group.traverse(traversal);

		prop.group = group;
	}

	export async function boot() {
		let url = './figs/glob.json';
		let response = await fetch(url);
		const arrSales = await response.json();
		presets = arrSales;
		console.log(presets);
		return arrSales;
	}

	export var collection: prop[] = []
	export var markers: prop[] = []
	export var walls: prop[] = []
	export var sounds: psound[] = []
	export var boxes: prop[] = []
	export var lights: ppointlight[] = []

	export var presets = {}

	export abstract class prop {
		build_debug_box = false
		wiremesh?: wiremesh
		array: prop[] = []
		type
		kind
		preset
		group
		oldRotation
		fbody: physics.fbody
		aabb
		constructor(public readonly object, public readonly parameters) {
			this.type = 'ordinary prop';
			collection.push(this);
		}
		complete() {
			this.array.push(this);
			take_collada_prop(this);
			this.measure();
			if (this.build_debug_box)
				this.wiremesh = new wiremesh(this);
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
			// messy splices(!)
			collection.splice(collection.indexOf(this), 1);
			this.array.splice(this.array.indexOf(this), 1);
			this._lod();
			this.wiremesh?.lod();
			renderer.propsGroup.remove(this.group);
			if (this.fbody)
				this.fbody.lod();
		}
		protected measure() {
			this.object.updateMatrix();
			// this includes the lazy z-up to y-up ?
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.group, true);
		}
		correction_for_physics() {
			// this method is called by fbody after measure
			const size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.divideScalar(2);
			// because of parent transforms, the box is scaled by 0.0254
			// bring it up to 1 / 0.0254 so we reenter render space
			size.multiplyScalar(garbage.spaceMultiply);
			this.object.rotation.set(-Math.PI / 2, 0, 0);
			this.object.position.set(-size.x, -size.y, size.z);
			//this.object.updateMatrix();
			//this.object.updateMatrixWorld(true);
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
			if (this.object.name != 'solid')
				this.object.visible = false;
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
		}
		override _loop() {
		}
	}

	export class pstairstep extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pstairstep';
			this.array = walls;
			//this.build_debug_box = true;
		}
		override _finish() {
			console.log('finish stairstep');
			new physics.fstairstep(this);
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
			//this.object.visible = false;
		}
		override _loop() {
		}
	}

	export class wiremesh {
		mesh
		constructor(public prop: prop) {
			this.add_wire_mesh_to_prop_group();
		}
		lod() {
			//this.prop.group.remove(this.mesh);
		}
		add_wire_mesh_to_prop_group() {
			if (!wireframe_helpers)
				return;
			console.log('add helper aabb');
			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			size.multiplyScalar(garbage.spaceMultiply);
			const material = new THREE.MeshLambertMaterial({ color: 'red', wireframe: true });
			const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
			this.mesh = new THREE.Mesh(boxGeometry, material);
			this.prop.group.add(this.mesh);
		}
		recolor(color) {
			this.mesh.material.color = new THREE.Color(color);
		}
	}

	export class pbox extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pbox';
			this.array = boxes;
			this.build_debug_box = false;
		}
		override _finish() {
			new physics.fbox(this);
		}
		override _loop() {
			this.fbody.loop();
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
		}
		override _lod() {
		}
	}

	export class pconvex extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pconvex';
			this.array = boxes;
			this.build_debug_box = false;
			this.object.visible = false;
		}
		override _finish() {
			const size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.multiplyScalar(garbage.spaceMultiply);
			this.object.position.z -= size.z;
			new physics.fconvex(this);
		}
		override _loop() {
			this.fbody.loop();
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
		}
		override _lod() {
		}
	}

	export class psound extends prop {
		sound
		override _lod() {
			if (this.sound) {
				this.sound.stop();
			}
		}
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'psound';
			this.array = sounds;
			const paly = () => {
				if (this.kind == 'env')
					this._play();
			}
			hooks.register('audioGestured', (x) => {
				console.warn('late playing', this.preset);
				const preset = presets[this.preset];
				if (!preset)
					return;
				if (preset.delay)
					setTimeout(paly, preset.delay[0] + preset.delay[1] * Math.random() * 1000);
				else
					paly();
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
			if (!audio.allDone)
				return;
			const preset = presets[this.preset];
			if (!preset)
				return;
			if (preset.disabled)
				return;
			this.sound = audio.playOnce(preset.name, preset.volume, preset.loop);
			if (this.sound) {
				const panner = this.sound.getOutput();
				panner.distanceModel = 'exponential';
				panner.rolloffFactor = 4;
				panner.panningModel = 'HRTF';
				this.sound.setRefDistance(preset.distance);

				this.group.add(this.sound);
			}
		}
	}

	export class pfan extends prop {
		preset_
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pfan';
		}
		override _finish() {
			this.preset_ = presets[this.preset || 'none'];
			console.log('fan preset_', this.preset_, this.preset);


			//this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
			const size = new THREE.Vector3();
			const center = new THREE.Vector3();
			this.aabb.getSize(size);
			this.aabb.getCenter(center);

			const temp = new THREE.Vector3(size.x, size.z, size.y);
			temp.multiplyScalar(garbage.spaceMultiply);

			size.divideScalar(2);
			size.z = -size.z;

			if (this.parameters.rotation == 'y') {
			}

			if (this.parameters.rotation == 'z') {
			}

			this.object.position.sub(temp.divideScalar(2));
			this.group.position.add(size);

			//size.divideScalar(2);

			//this.object.position.sub(size);

			//this.object.position.add(size);

		}
		override _loop() {
			const speed = (this.preset_?.speed || 1) * app.delta;
			if (this.parameters.rotation == 'x')
				this.group.rotation.x += speed;
			if (this.parameters.rotation == 'y')
				this.group.rotation.z += speed;
			if (this.parameters.rotation == 'z')
				this.group.rotation.y += speed;
			this.group.updateMatrix();

		}
	}

	export class pdoor extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pdoor'; '⛪️'
			//console.log('pdoor hint', parameters.rotation || 0);

		}
		override _finish() {
			new physics.fdoor(this);
			//this.object.add(new THREE.AxesHelper(20));
			//this.group.add(new THREE.AxesHelper(20));
		}
		override _loop() {
			this.fbody.loop();
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
		}
	}

	class light extends prop {
		light
		preset_
		constructor(object, parameters) {
			super(object, parameters);
		}
		timer = 0
		behavior() {
			if (!this.preset_)
				return;
			const behavior = this.preset_.behavior;
			if (!behavior)
				return;
			const cycle = behavior.cycle || 1;
			if (this.timer >= 2)
				this.timer -= 2;
			let intensity = 1;
			this.timer += garbage.dt / (cycle / 2);
			let value = (() => {
				switch (behavior.type) {
					case 'bounce':
						return easings.easeOutBounce(this.timer <= 1 ? this.timer : 2 - this.timer);
					case 'shake':
						return easings.easeInOutElastic(this.timer <= 1 ? this.timer : 2 - this.timer);
					default:
						return 1;
				}
			})()
			intensity = behavior.base + value * behavior.variance;			
			this.light.intensity = this.preset_.intensity * intensity;
			this.light.needsUpdate = true;
		}
	}
	export class ppointlight extends light {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'plight';
			this.array = lights;
		}
		override _finish() {
			//this.object.visible = false;
			this.preset_ = presets[this.preset || 'none'];
			if (!this.preset_) {
				console.log(' preset no def ', this.preset);
				return;
			}

			this.object.visible = !this.preset_.hide;

			let size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.divideScalar(2.0);
			size.multiplyScalar(garbage.spaceMultiply);

			let light = new THREE.PointLight(
				this.preset_.color || 'white',
				this.preset_.intensity || 1,
				this.preset_.distance || 3,
				this.preset_.decay || 1);
			this.light = light;
			light.visible = !this.preset_.disabled;
			light.castShadow = this.preset_.shadow;
			//light.position.fromArray(preset.offset || [0, 0, 0]);
			light.position.add(size);
			// light.add(new THREE.AxesHelper(10));
			this.group.add(light);
		}
		override _loop() {
			this.behavior();
		}
		override _lod() {
		}
	}

	export class pspotlight extends light {
		spotlight
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pspotlight';
			this.array = lights;
		}
		override _finish() {
			this.preset_ = presets[this.preset || 'none'];
			if (!this.preset_) {
				console.warn(' preset no def ');
				return;
			}
			this.object.visible = !this.preset_.hide;

			let size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.divideScalar(2.0);
			size.multiplyScalar(garbage.spaceMultiply);
			//console.log('light size, center', size, center);

			let light = new THREE.SpotLight(
				this.preset_.color,
				this.preset_.intensity,
				this.preset_.distance,
				this.preset_.angle,
				this.preset_.penumbra,
				this.preset_.decay
			);
			this.light = light;
			light.visible = !this.preset_.disabled;
			light.position.set(0, 0, 0);
			light.castShadow = this.preset_.shadow;
			light.shadow.camera.far = 1000;
			light.shadow.mapSize.width = this.preset_.shadowMapSize || 512;
			light.shadow.mapSize.height = this.preset_.shadowMapSize || 512;
			light.angle = this.preset_.angle || Math.PI / 3;

			if (this.preset_.target)
				light.target.position.add(new THREE.Vector3().fromArray(this.preset_.target).multiplyScalar(4));
			light.target.position.add(size);
			//light.target.add(new THREE.AxesHelper(10));
			light.position.add(size);
			this.group.add(light);
			this.group.add(light.target);

			this.spotlight = light;
			//this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
		}
		override _loop() {
			this.behavior();
		}
	}

	export class prectlight extends light {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'prectlight';
			this.array = lights;
		}
		override _finish() {

			this.preset_ = presets[this.preset || 'none'];
			if (!this.preset_) {
				console.log(' preset no def ', this.preset);
				return;
			}

			this.object.visible = !this.preset_.hide;

			const size = new THREE.Vector3();
			this.aabb.getSize(size);

			let width = 1, height = 1;

			if (this.parameters.axis == 'z') {
				width = size.y;
				height = size.z;
			}
			if (this.parameters.axis == 'y') {
				width = size.x;
				height = size.z;
			}
			if (this.parameters.axis == 'x') {
				width = size.x;
				height = size.y;
			}

			const light = new THREE.RectAreaLight(
				this.preset_.color,
				this.preset_.intensity,
				width,
				height);
			light.visible = !this.preset_.disabled;
			light.power = 100;
			light.intensity = this.preset_.intensity;
			light.needsUpdate = true;

			console.log('rectlight preset', this.preset_, 'intensity', this.preset_.intensity);
			
			this.light = light;

			light.lookAt(new THREE.Vector3().fromArray(this.preset_.target));
			this.group.add(light);

			size.divideScalar(2);
			size.z = -size.z;
			this.group.position.add(size);

			const helper = new RectAreaLightHelper(light);
			light.add(helper); // helper must be added as a child of the light
		}
		override _loop() {
			this.behavior();
		}
		override _lod() {
		}
	}

	export class pmarker extends prop {
		constructor(object, parameters) {
			super(object, parameters);
			this.type = 'pmarker';
			this.array = markers;
		}
		override _finish() {
			this.object.visible = true;
			let helper = new THREE.AxesHelper(1);
			this.object.add(helper);
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