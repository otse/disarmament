import app from "./app.js";
import glob from "./lib/glob.js";
import { hooks } from "./lib/hooks.js";
import garbage from "./garbage.js";
import physics from "./physics.js";
import pts from "./lib/pts.js";
import renderer from "./renderer.js";
import common from "./common.js";
//import plc from "./plc.js";

// https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js

const plyRadius = 0.4

class player {
	vdb
	camera
	active = true
	aabb
	controls
	canJump
	cannonBody
	constructor() {
		glob.move = { x: 0, z: 0 };
		this.setup();
		this.make_physics();
		this.cannonBody.position.set(
			glob.yawGroup.position.x,
			glob.yawGroup.position.y + 1,
			glob.yawGroup.position.z);
		this.aabb = new THREE.Box3();
		this.set_aabb();
		this.vdb = new common.debug_box(this, 'purple');
		renderer.scene.add(this.vdb.mesh);
		hooks.addListener('xrStart', async () => { this.xr_takes_over(); return false; });
	}

	setup() {
		this.controls = new PointerLockControls(
			renderer.camera, renderer.renderer.domElement);

		this.controls.enabled = true;

		this.camera = this.controls.camera;

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
		//this.active = false;
	}

	make_physics() {
		// Create a sphere
		var sphereShape = new CANNON.Sphere(plyRadius);
		var sphereBody = new CANNON.Body({ mass: 1, material: physics.materials.player });
		sphereBody.addShape(sphereShape);
		sphereBody.position.set(-1, 1, 0);
		sphereBody.linearDamping = 0.95;
		sphereBody.angularDamping = 0.999;

		physics.world.addBody(sphereBody);
		this.cannonBody = sphereBody;

		const contactNormal = new CANNON.Vec3() // Normal in the contact, pointing *out* of whatever the player touched
		const upAxis = new CANNON.Vec3(0, 1, 0)
		this.cannonBody.addEventListener('collide', (event) => {
			const { contact } = event

			// contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
			// We do not yet know which one is which! Let's check.
			if (contact.bi.id === this.cannonBody.id) {
				// bi is the player body, flip the contact normal
				contact.ni.negate(contactNormal)
			} else {
				// bi is something else. Keep the normal as it is
				contactNormal.copy(contact.ni)
			}

			// If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
			if (contactNormal.dot(upAxis) > 0.5) {
				// Use a "good" threshold value between 0 and 1 here!
				this.canJump = true
			}
		})

		this.body_velocity = this.cannonBody.velocity;
	}

	body_velocity
	noclip = false

	loop(delta: number) {

		//if (this.controls.enabled === false)
		//	return;

		if (!this.active)
			return;

		if (app.proompt('v') == 1) {
			this.noclip = !this.noclip;

			if (!this.noclip) {
				this.cannonBody.position.set(
					glob.yawGroup.position.x,
					glob.yawGroup.position.y,
					glob.yawGroup.position.z);
			}
		}

		this.noclip ? this.noclip_move(delta) : this.physics_move(delta);

	}

	noclip_move(delta) {
		let { x, z } = glob.move;

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

			const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(renderer.camera.quaternion);
			const quat = new THREE.Quaternion().setFromEuler(euler);
			glob.yawGroup.position.add(new THREE.Vector3(x, 0, z).applyQuaternion(quat));
		}
	}

	physics_move(delta) {
		let { x, z } = glob.move;

		if (app.proompt(' ') && this.canJump) {
			this.body_velocity.y = 10;
			this.canJump = false;
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
			z *= 3.0;
			x *= 3.0;
		}

		const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(renderer.camera.quaternion);

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
			quat.multiply(renderer.yawGroup.quaternion);
			velocity.applyQuaternion(quat);
			this.body_velocity.x += velocity.x;
			this.body_velocity.z += velocity.z;
		}

		// we miss a physics frame here

		glob.yawGroup.position.copy(this.cannonBody.position);
		glob.yawGroup.position.add(new THREE.Vector3(0, -plyRadius, 0));

		if (!glob.hasHeadset)
			glob.yawGroup.position.add(new THREE.Vector3(0, 1.65, 0));
		else // if we're sitting with a headset
			glob.yawGroup.position.add(new THREE.Vector3(0, 0.4, 0));

		this.set_aabb();
	}

	set_aabb() {
		const min = new THREE.Vector3(-plyRadius, -plyRadius, -plyRadius).add(this.cannonBody.position);
		const max = new THREE.Vector3(plyRadius, plyRadius, plyRadius).add(this.cannonBody.position);
		this.aabb.min.copy(min);
		this.aabb.max.copy(max);
		this.vdb?.mesh?.position.copy(this.cannonBody.position);
		//this.mesh.position.y -= plyRadius * 2;
	}
}

export default player;