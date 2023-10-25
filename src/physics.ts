import audio from "./audio.js";
import hunt from "./hunt.js";
import props from "./props.js";
import renderer from "./renderer.js";

namespace physics {

	const kinds_of_props = {
		floppy: { mass: 0.1, material: 'plastic' },
		fridge: { mass: 3, material: 'metal' },
		cup: { mass: 0.2, material: 'plastic' },
		compactdiscs: { mass: 0.7, material: 'cardboard' },
		matress: { mass: 1.0, material: 'cardboard' },
		barrel: { mass: 1.0, material: 'metal' },
		none: { mass: 0.0, material: 'cardboard' }
	}

	export const wireframe_helpers = false;

	export var materials: any = {}

	export var world,
		walls = [], balls = [], ballMeshes = [], boxes = [], boxMeshes = [];

	export function boot() {
		world = new CANNON.World();

		world.solver.iterations = 50;

		// Tweak contact properties.
		// Contact stiffness - use to make softer/harder contacts
		world.defaultContactMaterial.contactEquationStiffness = 5e6;

		// Stabilization time in number of timesteps
		world.defaultContactMaterial.contactEquationRelaxation = 3;

		const solver = new CANNON.GSSolver();
		solver.iterations = 7;
		solver.tolerance = 0.1;
		world.solver = new CANNON.SplitSolver(solver);
		// use this to test non-split solver
		// world.solver = solver

		world.gravity.set(0, -10, 0);

		// Create a slippery material (friction coefficient = 0.0)
		materials.player = new CANNON.Material('player');
		materials.ground = new CANNON.Material('ground');
		materials.solid = new CANNON.Material('solid');
		materials.wall = new CANNON.Material('wall');

		// Object
		materials.generic = new CANNON.Material('object');
		const objectToGroundContact = new CANNON.ContactMaterial(
			materials.generic, materials.ground, {
			friction: 0.0001,
			restitution: 0.3,
		});

		const playerToWallContact = new CANNON.ContactMaterial(
			materials.player, materials.wall, {
			friction: 1.0,
			restitution: 0.0,
		});

		const playerToGroundContact = new CANNON.ContactMaterial(
			materials.player, materials.ground, {
			friction: 0.002,
			restitution: 0.3,
		});

		const genericToSolidContact = new CANNON.ContactMaterial(
			materials.generic, materials.solid, {
			friction: 0.00,
			restitution: 0.3,
		});

		// We must add the contact materials to the world
		world.addContactMaterial(objectToGroundContact);
		world.addContactMaterial(playerToWallContact);
		world.addContactMaterial(playerToGroundContact);
		world.addContactMaterial(genericToSolidContact);

		// Create the ground plane
		const groundShape = new CANNON.Plane();
		const groundBody = new CANNON.Body({ mass: 0, material: materials.ground });
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
		world.addBody(groundBody);

	}

	var lastCallTime = 0;
	const timeStep = 1 / 60;

	export function loop(delta: number) {

		const time = performance.now() / 1000;
		const dt = time - lastCallTime;
		lastCallTime = time;

		for (let body of bodies)
			body.loop();

		for (let sbox of sboxes) {
			sbox.loop();
		}

		world.step(timeStep, dt);

		// Step the physics world
		//world.step(timeStep);

		// Copy coordinates from Cannon.js to Three.js
		//mesh.position.copy(body.position);
		//mesh.quaternion.copy(body.quaternion);
	}

	// a physic
	const boo = 0;
	var bodies: fbody[] = []

	var sboxes: simple_box[] = []

	export class simple_box {
		boxBody
		boxMesh
		constructor() {
			sboxes.push(this);

			const material = new THREE.MeshLambertMaterial({ color: 'green' });
			const halfExtents = new CANNON.Vec3(0.5, 0.5, 0.5);
			const boxShape = new CANNON.Box(halfExtents);
			const boxGeometry = new THREE.BoxGeometry(
				halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
			this.boxBody = new CANNON.Body({ mass: 1.0, material: materials.generic });
			this.boxBody.addShape(boxShape);
			this.boxMesh = new THREE.Mesh(boxGeometry, material);
			this.boxMesh.castShadow = true;
			this.boxMesh.receiveShadow = true;
			//this.boxMesh.add(new THREE.AxesHelper(1));

			const x = 2;//(Math.random() - 0.5) * 1;
			const y = 4;
			const z = 1;//(Math.random() - 0.5) * 2;

			this.boxBody.position.set(x, y, z);
			this.boxMesh.position.copy(this.boxBody.position);
			world.addBody(this.boxBody);
			renderer.scene.add(this.boxMesh);
		}
		loop() {
			this.boxMesh.position.copy(this.boxBody.position);
			this.boxMesh.quaternion.copy(this.boxBody.quaternion);
		}
	}

	export class fbody {
		body
		constructor(public readonly prop: props.prop) {
			bodies.push(this);
			prop.fbody = this;
		}
		loop() { // override
		}
	}

	export class fbox extends fbody {
		constructor(prop) {
			super(prop);

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			size.divideScalar(2);

			const halfExtents = new CANNON.Vec3(size.x, size.y, size.z);
			const boxShape = new CANNON.Box(halfExtents);

			const kind = kinds_of_props[this.prop.parameters.preset || 'none'] || kinds_of_props['none'];
			
			const weight = kind.weight || 1;
			const mass = kind.mass;

			let material;
			switch (prop.object.name) {
				case 'wall':
					material = materials.wall;
				default:
					material = materials.generic;
			}
			const boxBody = new CANNON.Body({ mass: mass, material: material });

			const center = new THREE.Vector3();
			this.prop.aabb.getCenter(center);
			boxBody.position.copy(center);
			//console.log(boxBody.quaternion);
			//new THREE.Quaternion().

			//boxBody.rotation.copy(this.prop.oldRotation);
			boxBody.addShape(boxShape);
			world.addBody(boxBody);
			this.body = boxBody;

			//if (prop.parameters.mass == 0)
			//	boxBody.collisionResponse = 0;

			boxBody.addEventListener("collide", function (e) {
				if (mass == 0)
					return;
				const velocity = e.contact.getImpactVelocityAlongNormal();
				if (velocity < 0.3)
					return;
				let clamp;
				clamp = hunt.clamp(mass * velocity, 0.1, 3);
				//clamp = day.clamp(clamp, 0.1, 1);
				clamp = hunt.clamp(velocity, 0.1, 1.0);

				//console.log('velocity, clamp', velocity, clamp);

				let sample = '';
				//console.log(velocity);
				
				const impacts = props.impact_sounds[kind.material];
				if (!impacts)
					return;
				if (velocity < 0.6) {
					sample = hunt.sample(impacts.soft);
				}
				else {
					sample = hunt.sample(impacts.hard);
				}
				let sound = audio.playOnce(sample, clamp);
				if (sound) {
					prop.group.add(sound);
					sound.onEnded = () => {
						sound.removeFromParent();
					}
				}
			});

			//if (!this.prop.parameters.solid)
			this.add_helper_aabb();

		}
		AABBMesh
		add_helper_aabb() {
			if (!wireframe_helpers)
				return;
			//console.log('add helper aabb');

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			size.divideScalar(2);

			const material = new THREE.MeshLambertMaterial({ color: 'red', wireframe: true });
			const boxGeometry = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
			this.AABBMesh = new THREE.Mesh(boxGeometry, material);
			//this.AABBMesh.add(new THREE.AxesHelper(1));

			renderer.scene.add(this.AABBMesh);
		}
		flipper = 1;
		redOrBlue = false;
		override loop() {
			if (!this.AABBMesh)
				return;
			this.AABBMesh.position.copy(this.prop.group.position);
			this.AABBMesh.quaternion.copy(this.prop.group.quaternion);
			if ((this.flipper -= hunt.dt) <= 0) {
				if (this.redOrBlue) {
					this.AABBMesh.material.color = new THREE.Color('red');
				}
				else {
					this.AABBMesh.material.color = new THREE.Color('blue');
				}
				this.redOrBlue = !this.redOrBlue;
				this.flipper = 1;
			}

		}

	}

	const door_arbitrary_shrink = 0.95;

	export class fdoor extends fbody {
		constraint
		constructor(prop: props.prop) {
			super(prop);

			const size = new THREE.Vector3();
			const center = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			this.prop.aabb.getCenter(center);

			const shrink = new THREE.Vector3();
			shrink.copy(size);
			shrink.multiplyScalar(door_arbitrary_shrink);
			shrink.divideScalar(2);

			const halfExtents = new CANNON.Vec3(shrink.x, shrink.y, shrink.z);
			const hingedShape = new CANNON.Box(halfExtents);

			const hingedBody = new CANNON.Body({ mass: 1.5 });
			hingedBody.addShape(hingedShape);
			hingedBody.position.copy(center);
			hingedBody.linearDamping = 0.4;
			world.addBody(hingedBody);

			const halfExtents2 = new CANNON.Vec3(0.06, 0.06, 0.06);
			const staticShape = new CANNON.Box(halfExtents2);
			const staticBody = new CANNON.Body({ mass: 0 });
			staticBody.addShape(staticShape);
			staticBody.position.copy(center);
			staticBody.collisionResponse = 0;
			world.addBody(staticBody);

			const pivots = [
				[0, 0, 0.5], [0, 0, -0.5], [0.5, 0, 0], [-0.5, 0, 0]
			];
			const hinges = [
				[0, 0, -0.5 * size.x],
				[0, 0, 0.5 * size.x],
				[-0.5 * size.z, 0, 0],
				[0.5 * size.z, 0, 0]
			];
			
			const n = parseInt(this.prop.parameters.preset) - 1;
			const offset = pivots[n];
			const hinge = hinges[n];
			//console.log('door size', n, size);
			const pivot = new CANNON.Vec3(size.x * offset[0] + hinge[0], 0, size.z * offset[2] + hinge[2]);
			const axis = new CANNON.Vec3(0, 1, 0);
			const constraint = new CANNON.HingeConstraint(staticBody, hingedBody, {
				pivotA: pivot,
				axisA: axis,
				pivotB: pivot,
				axisB: axis
			});
			world.addConstraint(constraint);
			//console.log(constraint);

			this.constraint = constraint;
			this.body = hingedBody;

			this.add_helper_aabb();
		}
		AABBMesh
		AABBMesh2

		add_helper_aabb() {
			if (!wireframe_helpers)
				return;

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);

			const material = new THREE.MeshLambertMaterial({ color: 'red', wireframe: true });
			const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

			this.AABBMesh = new THREE.Mesh(boxGeometry, material);
			//this.AABBMesh2 = new THREE.Mesh(boxGeometry, material);

			renderer.scene.add(this.AABBMesh);
		}
		override loop() {
			if (!wireframe_helpers)
				return;
			this.AABBMesh.position.copy(this.prop.group.position);
			this.AABBMesh.quaternion.copy(this.prop.group.quaternion);

			//this.AABBMesh2.position.copy(this.prop.group.position);
			//this.AABBMesh2.quaternion.copy(this.prop.group.quaternion);
		}
	}
}

export default physics;