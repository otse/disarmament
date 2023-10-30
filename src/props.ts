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
				console.log('new prop', kind, preset);
				prop = new pbox(object, { preset: preset });
				break;
			case 'light':
				prop = new plight(object, { preset: preset });
				break;
			case 'wall':
			case 'solid':
				prop = new pbox(object, {});
				break;
			case 'door':
				prop = new pdoor(object, { preset: preset });
				break;
			default:
		}
		if (prop)
			prop.kind = kind;
		return prop;
	}

	export function boot() {

	}

	export function loop() {
		for (let prop of props)
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

		//console.log('take collada prop', prop.object.name, prop.object.quaternion);

		prop.object.position.set(0, 0, 0);
		prop.object.rotation.set(0, 0, 0);

		prop.group.add(prop.object);
		prop.group.updateMatrix();
		prop.group.updateMatrixWorld();

		renderer.propsGroup.add(prop.group);

		function traversal(object) {
			object.geometry?.computeBoundingBox();
		}
		prop.object.traverse(traversal);
	}

	export var props: prop[] = []

	interface iparameters {
		preset?: any;
	};

	export class prop {
		kind
		oldRotation
		group
		master
		fbody: physics.fbody
		aabb
		constructor(public readonly object, public readonly parameters: iparameters) {
			props.push(this);
		}
		complete() {
			take_collada_prop(this);
			this.measure();
			this.setup();
		}
		setup() { // override
		}
		loop() { // override
		}
		void() {

		}
		measure() {
			this.aabb = new THREE.Box3();
			this.aabb.setFromObject(this.group, true);
			//this.aabb.applyMatrix4( this.object.parent.matrixWorld );
			//console.log('box measures', this.aabb);

			const size = new THREE.Vector3();
			this.aabb.getSize(size);
			size.multiplyScalar(hunt.inchMeter);

			this.object.rotation.set(-Math.PI / 2, 0, 0);
			this.object.position.set(-size.x / 2, -size.y / 2, size.z / 2);
		}
	}

	export class pbox extends prop {
		constructor(object, parameters: iparameters) {
			super(object, parameters);
		}
		override setup() {
			new physics.fbox(this);
			if (this.object.name == 'wall')
				this.object.visible = false;

		}
		override loop() {
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
			this.fbody.loop();
		}
	}

	export class pdoor extends prop {
		constructor(object, parameters: iparameters) {
			super(object, parameters);
		}
		override setup() {
			new physics.fdoor(this);
			//this.object.add(new THREE.AxesHelper(20));
			//this.group.add(new THREE.AxesHelper(20));
		}
		override loop() {
			this.group.position.copy(this.fbody.body.position);
			this.group.quaternion.copy(this.fbody.body.quaternion);
			this.fbody.loop();
		}
	}

	const light_presets = {
		sconce: { hide: false, color: 'white', intensity: 0.1, distance: 1, offset: [0, 0, -5] },
		sconce1: { hide: true, color: 'white', intensity: 0.1, distance: 2.0, decay: 0.1 },
		openwindow: { hide: true, color: 'white', intensity: 0.5, distance: 3, decay: 0.3 },
		skylightstart: { hide: true, color: 'white', intensity: 0.2, distance: 2.0, decay: 0.05 },
		skirt: { hide: true, color: 'green', intensity: 0.15, distance: 1.0, decay: 0.7 },
		none: { hide: true, color: 'white', intensity: 0.1, distance: 10 }
	}

	export class plight extends prop {
		constructor(object, parameters: iparameters) {
			super(object, parameters);
		}
		override setup() {
			//this.object.visible = false;
			const preset = light_presets[this.parameters.preset || 'none'];
			this.object.visible = !preset.hide;

			const size = new THREE.Vector3();
			const center = new THREE.Vector3();
			this.aabb.getSize(size);
			this.aabb.getCenter(center);
			size.multiplyScalar(hunt.inchMeter);
			//console.log('light size, center', size, center);
			
			let light = new THREE.PointLight(
				preset.color,
				preset.intensity,
				preset.distance,
				preset.decay);
			light.position.fromArray(preset.offset || [0, 0, 0])
			light.position.add(size.divideScalar(2.0));
			//this.group.add(new THREE.AxesHelper(10));
			this.group.add(light);
		}
		override loop() {
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