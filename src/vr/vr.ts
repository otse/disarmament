import app from "../app.js";
import glob from "../lib/glob.js";
import hooks from "../lib/hooks.js";
import renderer from "../renderer.js";
import ctrlr from "./controller.js";

namespace vr {
	export let baseReferenceSpace

	let rightController: ctrlr;
	let leftController: ctrlr;

	let controllerGrip1, controllerGrip2;

	export var position;

	let INTERSECTION;
	export let floor, marker;

	export function boot() {

		ctrlr.boot();

		position = new THREE.Vector3();

		let button = VRButton.createButton( renderer.renderer );

		console.log(' button ', button);

		document.body.appendChild(button);

		renderer.renderer.xr.addEventListener('sessionstart', () => {
			console.warn(' glob xr true ');
			glob.xr = true;
			baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();

			const offsetPosition = renderer.camera.position;

			const temp = new THREE.Vector3();

			//const offsetRotation = camera.rotation;

			const offsetRotation = renderer.camera.quaternion;

			const transform = new XRRigidTransform(
				temp,
				{
					x: offsetRotation.x,
					y: -offsetRotation.y,
					z: offsetRotation.z,
					w: offsetRotation.w
				});

			const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);

			renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);
			hooks.call('xrStart', 1);
		});

		renderer.renderer.xr.addEventListener('sessionend', () => {
			console.warn(' glob xr false ');
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

		leftController = new ctrlr(0);
		rightController = new ctrlr(1);

	}

	export function start() {
		renderer.renderer.setAnimationLoop( animate );
	}

	function animate() {
		//app.loop();
	}

	export function loop() {
		leftController.loop();
		rightController.loop();
	}
}

export default vr;