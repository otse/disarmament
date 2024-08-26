import audio from "./audio.js";
import salvage from "./salvage.js";
import props from "./props.js";
import renderer from "./renderer.js";

namespace physics {

	const collision_happy_colors = ['salmon', 'red', 'blue', 'lime', 'magenta']

	const kinds_of_props = {
		floppy: { mass: 0.1, material: 'plastic' },
		fridge: { mass: 3, material: 'metal' },
		cup: { mass: 0.2, material: 'plastic' },
		compactdiscs: { mass: 0.7, material: 'cardboard' },
		matress: { mass: 1.0, material: 'cardboard' },
		barrel: { mass: 1.0, material: 'metal' },
		locker: { mass: 4.0, material: 'metal' },
		solid: { mass: 0.0, material: 'cardboard' },
		none: { mass: 0.5, material: 'cardboard' }
	}

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

		//world.addBody(groundBody);

	}

	var lastCallTime = 0;
	const timeStep = 1 / 60;

	export function loop(delta: number) {

		const time = performance.now() / 1000;
		const dt = time - lastCallTime;
		lastCallTime = time;

		//for (let body of bodies)
		//	body.loop();

		//for (let sbox of sboxes) {
		//	sbox.loop();
		//}

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

	var sboxes: simple_box_unused[] = []

	export class simple_box_unused {
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
			prop.correction_for_physics();
		}

		loop() { // override
		}
		lod() {
			//world.removeBody(this.body);
			this._lod();
		}
		_lod() { // override
		}
	}

	export class fbox extends fbody {
		override _lod() {
			world.removeBody(this.body);
		}
		override loop() {
		}
		constructor(prop) {
			super(prop);

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			size.divideScalar(2);

			const halfExtents = new CANNON.Vec3(size.x, size.y, size.z);
			const shape = new CANNON.Box(halfExtents);

			// rewrite this eventually
			let kind = kinds_of_props[this.prop.preset];
			if (prop.kind == 'wall' || prop.kind == 'solid' || prop.kind == 'ground')
				kind = kinds_of_props['solid'];
			if (!kind)
				kind = kinds_of_props['none'];

			const mass = kind.mass;

			// redo this pleas
			let material;
			switch (prop.object.name) {
				case 'wall':
					material = materials.wall;
					break;
				case 'ground':
					material = materials.ground;
					break;
				case 'solid':
					material = materials.solid;
					break;
				default:
					material = materials.generic;
			}
			const body = new CANNON.Body({ mass: mass, material: material });

			const center = new THREE.Vector3();
			this.prop.aabb.getCenter(center);
			body.position.copy(center);
			//console.log(boxBody.quaternion);
			//new THREE.Quaternion().

			//boxBody.rotation.copy(this.prop.oldRotation);
			body.addShape(shape);
			world.addBody(body);
			this.body = body;

			//if (prop.parameters.mass == 0)
			//	boxBody.collisionResponse = 0;

			const that = this;

			body.addEventListener("collide", function (e) {
				if (mass == 0)
					return;
				const velocity = e.contact.getImpactVelocityAlongNormal();
				if (velocity < 0.3)
					return;
				let volume;
				volume = salvage.clamp(mass * velocity, 0.1, 3);
				volume = salvage.clamp(velocity, 0.1, 1.0);

				if (that.prop.wiremesh)
					that.prop.wiremesh.recolor(salvage.sample(collision_happy_colors));

				let sample = '';

				const impacts = props.impact_sounds[kind.material];
				if (!impacts)
					return;
				if (velocity < 0.6) {
					sample = salvage.sample(impacts.soft);
				}
				else {
					sample = salvage.sample(impacts.hard);
				}
				volume = salvage.clamp(volume, 0, 0.2);
				let sound = audio.playOnce(sample, volume);
				if (sound) {
					prop.group.add(sound);
					sound.onEnded = () => sound.removeFromParent();
				}
			});

		}
	}

	export class fconvex extends fbody {
		override _lod() {
			world.removeBody(this.body);
		}
		constructor(prop) {
			super(prop);

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			//size.multiplyScalar(hunt.inchMeter);

			//this.prop.object.position.z -= size.z;
			//size.multiplyScalar(hunt.inchMeter);
			//size.divideScalar(2);

			let geometry = this.prop.object.geometry;
			geometry = BufferGeometryUtils.mergeVertices(geometry);
			this.prop.object.geometry = geometry;
			const matrix = new THREE.Matrix4().copy(this.prop.object.matrixWorld);
			// todo this is what correction_for_physics is doing too
			matrix.setPosition(-size.x / 2, -size.y / 2, size.z / 2);

			const faces: any[] = [];
			const vertices: any[] = [];
			const normals: any[] = [];

			console.log('fconvex constructor object rotation ', this.prop.object.quaternion);

			const indices = geometry.index.array;
			const positions = geometry.attributes.position.array;
			const normal = geometry.attributes.normal.array;

			for (let i = 0; i < positions.length; i += 3) {
				const a = positions[i];// / hunt.inchMeter;
				const b = positions[i + 1];// / hunt.inchMeter;
				const c = positions[i + 2];// / hunt.inchMeter;
				const vector = new THREE.Vector3(a, b, c);
				vector.applyMatrix4(matrix);
				//vector.applyMatrix4(new THREE.Matrix4().makeScale(1 / hunt.inchMeter, 1 / hunt.inchMeter, 1 / hunt.inchMeter));
				vertices.push(new CANNON.Vec3(vector.x, vector.y, vector.z));
			}

			for (var i = 0; i < indices.length; i += 3) {
				faces.push([indices[i + 0], indices[i + 1], indices[i + 2]]);
			}

			for (var i = 0; i < normal.length; i += 3) {
				const a = normal[i];
				const b = normal[i + 1];
				const c = normal[i + 2];
				normals.push(new CANNON.Vec3(a, b, c));
			}

			function CreateTrimesh(geometry) {
				const vertices = geometry.attributes.position.array;
				const indices = Object.keys(vertices).map(Number);
				return new CANNON.Trimesh(vertices, indices);
			}

			const halfExtents = new CANNON.Vec3(size.x, size.y, size.z);
			const shape = new CANNON.ConvexPolyhedron({ vertices, faces });
			//const shape = CreateTrimesh(geometry); 
			const body = new CANNON.Body({ mass: 0, material: materials.ground });
			body.addShape(shape);
			world.addBody(body);

			const center = new THREE.Vector3();
			this.prop.aabb.getCenter(center);
			body.position.copy(center);

			this.body = body;

			body.addEventListener("collide", function (e) {
				console.log(' touch the polyhedron ');

			});
		}
	}

	export class fstairstep extends fbody {
		override _lod() {
			world.removeBody(this.body);
		}
		constructor(prop) {
			super(prop);

			const size = new THREE.Vector3();
			this.prop.aabb.getSize(size);
			size.divideScalar(2);

			const halfExtents = new CANNON.Vec3(size.x, size.y, size.z);
			const shape = new CANNON.Box(halfExtents);
			const body = new CANNON.Body({ mass: 0, material: materials.ground });

			const center = new THREE.Vector3();
			this.prop.aabb.getCenter(center);
			body.position.copy(center);

			body.addShape(shape);
			world.addBody(body);
			this.body = body;

			body.addEventListener("collide", function (e) {
				console.log('woo');

			});
		}
	}

	const door_arbitrary_shrink = 0.95;

	export class fdoor extends fbody {
		constraint
		hingedBody
		staticBody
		override _lod() {
			world.removeConstraint(this.constraint);
			world.removeBody(this.hingedBody);
			world.removeBody(this.staticBody);
		}
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

			const pivots = [
				[0, 0, 0.5], [0, 0, -0.5], [0.5, 0, 0], [-0.5, 0, 0]
			];
			const hinges = [
				[0, 0, -0.5 * size.x],
				[0, 0, 0.5 * size.x],
				[-0.5 * size.z, 0, 0],
				[0.5 * size.z, 0, 0]
			];

			const n = parseInt(this.prop.preset) - 1;
			const offset = pivots[n];
			const hinge = hinges[n];
			//console.log('door size', n, size);
			const pivot = new CANNON.Vec3(size.x * offset[0] + hinge[0], 0, size.z * offset[2] + hinge[2]);
			const axis = new CANNON.Vec3(0, 1, 0);

			const hingedBody = new CANNON.Body({ mass: 1.5 });
			hingedBody.addShape(hingedShape);

			// Set the rotation point (axis of rotation)
			const resultVec = new CANNON.Vec3();
			resultVec.vadd(center, hinge);
			
			//rotationPoint.vadd(rotationPoint, center);

			// Function to rotate the body around a point
			function rotateBodyAroundPoint(body, point, angle) {
				// Translate the body to the rotation point
				const translation = new CANNON.Vec3().copy(point).negate();
				body.position.vadd(translation, body.position);

				// Rotate the body
				const rotation = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
				body.quaternion.mult(rotation, body.quaternion);

				// Translate the body back to its original position
				body.position.vadd(point, body.position);

				// Now, you can set force and torque to zero
				body.force.set(0, 0, 0);
				body.torque.set(0, 0, 0);
			}

			//const center = 
			// Rotate the body around the specified point
			
			hingedBody.position.copy(center);
			hingedBody.linearDamping = 0.4;
			world.addBody(hingedBody);

			rotateBodyAroundPoint(hingedBody, resultVec, -1.0); // Example: Rotate by 45 degrees

			const halfExtents2 = new CANNON.Vec3(0.06, 0.06, 0.06);
			const staticShape = new CANNON.Box(halfExtents2);
			const staticBody = new CANNON.Body({ mass: 0 });
			staticBody.addShape(staticShape);
			staticBody.position.copy(center);
			staticBody.collisionResponse = 0;
			world.addBody(staticBody);

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
			this.hingedBody = hingedBody;
			this.staticBody = staticBody;
		}
		override loop() {

		}
	}
}

export default physics;