import app from "../app.js";
import glob from "../lib/glob.js";
import hooks from "../lib/hooks.js";
import renderer from "../renderer.js";
import controller from "./controller.js";

namespace vr {
	export let baseReferenceSpace

	export let rightController: controller;
	export let leftController: controller;

	let controllerGrip1, controllerGrip2;

	// export var position, rotation;

	let INTERSECTION;
	export let floor, marker;

	export function boot() {

		controller.boot();
		
		let button = VRButton.createButton(renderer.renderer);

		console.log(' button ', button);

		document.body.appendChild(button);

		renderer.renderer.xr.addEventListener('sessionstart', () => {
			glob.xr = true;

			baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();

			const offsetPosition = renderer.camera.position;
			const offsetRotation = renderer.camera.quaternion;

			const temp = new THREE.Vector3();

			const transform = new XRRigidTransform(
				temp,
				{
					x: offsetRotation.x,
					y: -offsetRotation.y,
					z: offsetRotation.z,
					w: offsetRotation.w
				});

			const teleportSpaceOffset =
				baseReferenceSpace.getOffsetReferenceSpace(transform);

			renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);

			hooks.call('xrStart', 1);
		});

		renderer.renderer.xr.addEventListener('sessionend', () => {
			glob.xr = false;
			hooks.call('xrEnd', 1);
		});

		marker = new THREE.Mesh(
			new THREE.CircleGeometry(0.25, 32).rotateX(- Math.PI / 2),
			new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
		);
		renderer.scene.add(marker);

		floor = new THREE.Mesh(
			new THREE.PlaneGeometry(30, 30, 2, 2).rotateX(- Math.PI / 2),
			new THREE.MeshBasicMaterial({ color: 0xbcbcbc, transparent: true, opacity: 0.25 })
		);
		floor.visible = false;
		renderer.scene.add(floor);

		leftController = new controller(0);
		rightController = new controller(1);

	}

	export function start() {
		renderer.renderer.xr.addEventListener('sessionstart', () => {
			//renderer.ambiance.intensity = 2;
			//app.blockable.stop();
			//renderer.renderer.setAnimationLoop( app.base_loop );
		});
		renderer.renderer.xr.addEventListener('sessionend', () => {
			//renderer.ambiance.intensity = 1;
		});
	}

	function animate() {
		//app.blockable = renderer.renderer.setAnimationLoop( app.base_loop ); // <---

		//app.loop();
	}

	export function loop() {
		leftController.loop();
		rightController.loop();
	}
}

export default vr;