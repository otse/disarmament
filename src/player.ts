import app from "./app.js";
import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import garbage from "./garbage.js";
import physics from "./physics.js";
import pts from "./lib/pts.js";
import renderer from "./renderer.js";
//import plc from "./plc.js";

// https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js

class player {
	camera
	active = true
	controls
	can_jump
	cannon_body
	constructor() {
		this.setup();
		this.make_physics();

		hooks.register('xrStart', () => this.xr_takes_over());
	}

	setup() {
		this.controls = new PointerLockControls(
			renderer.camera, renderer.renderer.domElement);

		this.controls.enabled = true;

		this.camera = this.controls.camera;

		console.log('player camera object ', this.camera.position);

		garbage.locker.addEventListener('click', () =>
			this.controls.lock()
		);

		this.controls.addEventListener('lock', () =>
			garbage.locker.style.display = 'none'
		);

		this.controls.addEventListener('unlock', () =>
			garbage.locker.style.display = ''
		);

		console.log('player setup');

	}

	xr_takes_over() {
		console.warn('player xr takes over');
		this.controls.disconnect();
		this.active = false;
	}

	make_physics() {
		// Create a sphere
		const radius = 0.4;
		var sphereShape = new CANNON.Sphere(radius);
		var sphereBody = new CANNON.Body({ mass: 1, material: physics.materials.player });
		sphereBody.addShape(sphereShape);
		sphereBody.position.set(-1, 1, 0);
		sphereBody.linearDamping = 0.95;
		sphereBody.angularDamping = 0.999;

		physics.world.addBody(sphereBody);
		this.cannon_body = sphereBody;

		const contactNormal = new CANNON.Vec3() // Normal in the contact, pointing *out* of whatever the player touched
		const upAxis = new CANNON.Vec3(0, 1, 0)
		this.cannon_body.addEventListener('collide', (event) => {
			const { contact } = event

			// contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
			// We do not yet know which one is which! Let's check.
			if (contact.bi.id === this.cannon_body.id) {
				// bi is the player body, flip the contact normal
				contact.ni.negate(contactNormal)
			} else {
				// bi is something else. Keep the normal as it is
				contactNormal.copy(contact.ni)
			}

			// If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
			if (contactNormal.dot(upAxis) > 0.5) {
				// Use a "good" threshold value between 0 and 1 here!
				this.can_jump = true
			}
		})

		this.body_velocity = this.cannon_body.velocity;
	}

	body_velocity
	noclip = false

	loop(delta: number) {

		if (this.controls.enabled === false)
			return;

		if (!this.active)
			return;

		if (glob.xr)
			return;

		if (app.proompt('v') == 1) {
			this.noclip = !this.noclip;

			if (!this.noclip) {
				this.cannon_body.position.set(
					this.camera.position.x,
					this.camera.position.y,
					this.camera.position.z);
			}

			//this.cannonBody.collisionResponse = this.noclip ? true : 0;
		}

		this.noclip ? this.noclip_move(delta) : this.physics_move(delta);

	}

	noclip_move(delta) {
		let x = 0, z = 0;
		if (app.proompt('w') && !app.proompt('s'))
			z = -1;
		if (app.proompt('s') && !app.proompt('w'))
			z = 1;
		if (app.proompt('a') && !app.proompt('d'))
			x = -1;
		if (app.proompt('d') && !app.proompt('a'))
			x = 1;
		if (app.proompt('shift')) {
			z *= 2;
			x *= 2;
		}
		if (x || z) {
			z *= 0.02 * 165 * delta;
			x *= 0.02 * 165 * delta;

			const camera = this.camera;
			const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion);
			const position = new THREE.Vector3();
			position.copy(camera.position).add(new THREE.Vector3(x, 0, z).applyQuaternion(new THREE.Quaternion().setFromEuler(euler)));
			camera.position.copy(position);
		}
	}

	physics_move(delta, direction = { x: 0, y: 0 }) {
		let x = 0, z = 0;
		if (app.proompt(' ') && this.can_jump) {
			this.body_velocity.y = 10;
			this.can_jump = false;
		}
		if (app.proompt('w') && !app.proompt('s'))
			z = -1;
		if (app.proompt('s') && !app.proompt('w'))
			z = 1;
		if (app.proompt('a') && !app.proompt('d'))
			x = -1;
		if (app.proompt('d') && !app.proompt('a'))
			x = 1;
		if (app.proompt('shift')) {
			z *= 2.0;
			x *= 2.0;
		}

		//console.log('');

		const camera = this.camera;
		const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion);

		// set our pitch to 0 which is forward 
		// else our forward speed is 0 when looking down or up
		euler.x = 0;

		const speed = 0.025;

		if (x || z) {
			z *= speed;
			x *= speed;

			z *= 165 * delta;
			x *= 165 * delta;

			let velocity = new THREE.Vector3(x, 0, z);
			let quat = new THREE.Quaternion().setFromEuler(euler);
			velocity.applyQuaternion(quat);
			this.body_velocity.x += velocity.x;
			this.body_velocity.z += velocity.z;
		}

		this.camera.position.copy(this.cannon_body.position);
		this.camera.position.add(new THREE.Vector3(0, 1.3, 0));
	}
}

export default player;