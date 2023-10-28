import app from "./app.js";
import glob from "./glob.js";
import hunt from "./hunt.js";
import physics from "./physics.js";
import pts from "./pts.js";
import renderer from "./renderer.js";
//import plc from "./plc.js";

// https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js

class player {
	pointer_lock_controls
	can_jump
	cannon_body
	constructor() {
		this.setup();
		this.make_physics();
	}

	setup() {

		this.pointer_lock_controls = new pointer_lock_controls(renderer.camera, renderer.renderer_.domElement);
		this.pointer_lock_controls.enabled = true;

		this.pointer_lock_controls.getObject().position.y = 1.5;

		const controler = this.pointer_lock_controls;

		hunt.hunt_instructions.addEventListener('click', function () {
			controler.lock();
		});

		this.pointer_lock_controls.addEventListener('lock', function () {
			console.log('lock');
			hunt.hunt_instructions.style.display = 'none';
			//blocker.style.display = 'none';
		});

		this.pointer_lock_controls.addEventListener('unlock', function () {
			console.log('unlock');
			//blocker.style.display = 'block';
			hunt.hunt_instructions.style.display = '';
		});

		renderer.scene.add(this.pointer_lock_controls.getObject());
	}

	make_physics() {

		// Create a sphere
		const radius = 0.4;
		var sphereShape = new CANNON.Sphere(radius);
		var sphereBody = new CANNON.Body({ mass: 1, material: physics.materials.player });
		sphereBody.addShape(sphereShape);
		sphereBody.position.set(0, 1, 0);
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

		if (this.pointer_lock_controls.enabled === false)
			return;

		if (app.proompt('v') == 1) {
			this.noclip = !this.noclip;

			//this.cannonBody.collisionResponse = this.noclip ? true : 0;
		}

		this.noclip ? this.noclip_move(delta) : this.physics_move(delta);

	}

	noclip_move(delta) {
		let x = 0, z = 0;
		if (glob.w && !glob.s)
			z = -1;
		if (glob.s && !glob.w)
			z = 1;
		if (glob.a && !glob.d)
			x = -1;
		if (glob.d && !glob.a)
			x = 1;
		if (glob.shift) {
			z *= 2;
			x *= 2;
		}
		if (x || z) {
			z *= 0.02;
			x *= 0.02;

			const camera = this.pointer_lock_controls.getObject();
			const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion);
			const position = new THREE.Vector3();
			position.copy(camera.position).add(new THREE.Vector3(x, 0, z).applyQuaternion(new THREE.Quaternion().setFromEuler(euler)));
			camera.position.copy(position);
		}
	}

	physics_move(delta) {
		const $ = this;
		let x = 0, z = 0;
		if (glob.space_bar && $.can_jump) {
			$.body_velocity.y = 10;
			$.can_jump = false;
		}
		if (glob.w && !glob.s)
			z = -1;
		if (glob.s && !glob.w)
			z = 1;
		if (glob.a && !glob.d)
			x = -1;
		if (glob.d && !glob.a)
			x = 1;
		if (glob.shift) {
			z *= 1.5;
			x *= 1.5;
		}
		const camera = $.pointer_lock_controls.getObject();
		const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion);

		// set our pitch to 0 which is forward 
		// else our forward speed is 0 when looking down or up
		euler.x = 0;

		if (x || z) {
			z *= 0.04;
			x *= 0.04;

			let velocity = new THREE.Vector3(x, 0, z);
			let quat = new THREE.Quaternion().setFromEuler(euler);
			velocity.applyQuaternion(quat);
			$.body_velocity.x += velocity.x;
			$.body_velocity.z += velocity.z;
		}

		$.pointer_lock_controls.getObject().position.copy($.cannon_body.position);
		$.pointer_lock_controls.getObject().position.add(new THREE.Vector3(0, 1.2, 0));
	}
}

export default player;