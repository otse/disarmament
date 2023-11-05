import app from "./app.js";
import glob from "./glob.js";
import renderer from "./renderer.js";

namespace vr {
	let baseReferenceSpace

	let controller1, controller2;
	let controllerGrip1, controllerGrip2;

	let INTERSECTION;
	let floor, marker;

	let tempMatrix;
	let raycaster;

	export function boot() {

		let button = glob.VRButton.createButton(renderer.renderer);

		console.log(' button ', button);

		document.body.appendChild(button);

		renderer.renderer.xr.addEventListener('sessionend', () => {
			console.log(' hunt : glob xr false ');
			glob.xr = false;
		});

		renderer.renderer.xr.addEventListener('sessionstart', () => {
			console.error(' hunt : glob xr true ');
			glob.xr = true;
			baseReferenceSpace = renderer.renderer.xr.getReferenceSpace()
		})

		function onSelectStart() {

			this.userData.isSelecting = true;

		}

		function onSelectEnd() {

			this.userData.isSelecting = false;

			if (INTERSECTION) {

				const offsetPosition = { x: - INTERSECTION.x, y: - INTERSECTION.y, z: - INTERSECTION.z, w: 1 };
				const offsetRotation = new THREE.Quaternion();
				const transform = new XRRigidTransform(offsetPosition, offsetRotation);
				const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);

				renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);

			}

		}

		marker = new THREE.Mesh(
			new THREE.CircleGeometry( 0.25, 32 ).rotateX( - Math.PI / 2 ),
			new THREE.MeshBasicMaterial( { color: 0xbcbcbc } )
		);
		renderer.scene.add( marker );

		floor = new THREE.Mesh(
			new THREE.PlaneGeometry(30, 30, 2, 2).rotateX(- Math.PI / 2),
			new THREE.MeshBasicMaterial({ color: 0xbcbcbc, transparent: true, opacity: 0.25 })
		);
		floor.visible = false;
		renderer.scene.add(floor);

		tempMatrix = new THREE.Matrix4();
		raycaster = new THREE.Raycaster();

		controller1 = renderer.renderer.xr.getController(0);
		controller1.addEventListener('selectstart', onSelectStart);
		controller1.addEventListener('selectend', onSelectEnd);
		controller1.addEventListener('connected', function (event) {

			this.add(buildController(event.data));

		});
		controller1.addEventListener('disconnected', function () {

			this.remove(this.children[0]);

		});

		function buildController(data) {

			let geometry, material;

			switch (data.targetRayMode) {

				case 'tracked-pointer':

					geometry = new THREE.BufferGeometry();
					geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
					geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

					material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

					return new THREE.Line(geometry, material);

				case 'gaze':

					geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
					material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
					return new THREE.Mesh(geometry, material);

			}

		}

		renderer.scene.add(controller1);
	}

	export function start() {
		renderer.renderer.setAnimationLoop(animate);
	}

	function animate() {
		app.loop();


	}

	export function loop() {

		if (controller1.userData.isSelecting === true) {

			tempMatrix.identity().extractRotation(controller1.matrixWorld);

			raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
			raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);

			const intersects = raycaster.intersectObjects([floor]); // renderer.scene.children, true

			if (intersects.length > 0) {

				INTERSECTION = intersects[0].point;

			}

		}

		if (INTERSECTION) marker.position.copy(INTERSECTION);

		marker.visible = INTERSECTION !== undefined;
	}
}

export default vr;