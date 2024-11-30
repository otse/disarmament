import glob from "./lib/glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./lib/pts.js";
import vr from "./vr/vr.js";

namespace renderer {
	// set up three.js here

	export var scene, camera, renderer, ambiance, clock;

	export var yawGroup;

	export var dt = 0;

	export var propsGroup;

	export var sun, sunOffset = [-2, 30, -2]

	export var maxAnisotropy

	export var headacheMode = false;
	export var statsEnabled = false;

	export function boot() {
		window['renderer'] = this;

		console.log('renderer boot');

		THREE.Object3D.DEFAULT_MATRIX_AUTO_UPDATE = true;
		THREE.Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;
		THREE.ColorManagement.enabled = true;

		clock = new THREE.Clock();

		propsGroup = new THREE.Group();
		yawGroup = new THREE.Group();

		glob.propsGroup = propsGroup;

		scene = new THREE.Scene();
		glob.scene = scene;
		scene.add(propsGroup);
		scene.add(yawGroup);
		scene.background = new THREE.Color('#111');

		RectAreaLightUniformsLib.init();

		let helepr = new THREE.AxesHelper();
		scene.add(helepr);

		scene.fog = new THREE.Fog(0x0e1516, 1, 7);

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.rotation.y = -Math.PI / 2;
		camera.updateMatrix();
		camera.updateMatrixWorld(true);
		yawGroup.add(camera);
		// yawGroup.add(new THREE.AxesHelper());
		// cameraGroup.add(renderer.xr.getCamera());
		yawGroup.updateMatrix();

		glob.camera = camera;
		glob.yawGroup = yawGroup;

		renderer = new THREE.WebGLRenderer({
			antialias: true
		});

		// CineonToneMapping looks colorful
		// ACESFilmicToneMapping looks photographic but very cold
		// NeutralToneMapping has deep darks

		renderer.toneMapping = THREE.NeutralToneMapping;
		renderer.toneMappingExposure = 3.0;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

		if (glob.hasHeadset)
			renderer.setAnimationLoop(app.base_loop);
		renderer.xr.setFramebufferScaleFactor(1);
		renderer.xr.enabled = true;
		renderer.xr.cameraAutoUpdate = false;
		// renderer.setClearColor(0xffffff, 0.0);

		const percent = 1 / 100;
		ambiance = new THREE.AmbientLight(0xffffff, percent);
		scene.add(ambiance);

		sun = new THREE.DirectionalLight("pink", 0.5);
		sun.castShadow = false;
		sun.shadow.mapSize.width = 2048;
		sun.shadow.mapSize.height = 2048;
		sun.shadow.radius = 2;
		sun.shadow.bias = 0.0005;
		sun.shadow.camera.near = 0.5;
		sun.shadow.camera.far = 500;
		sun.shadow.camera.left = sun.shadow.camera.bottom = -15;
		sun.shadow.camera.right = sun.shadow.camera.top = 15;
		sun.position.fromArray(sunOffset);
		// scene.add(sun);
		// scene.add(sun.target);

		// scene.add(new THREE.CameraHelper(sun.shadow.camera));

		if (glob.hasHeadset) {
			statsEnabled = true;
			app.selector_style('garbage-stats', 'visibility', 'visible');
		}

		document.querySelector('garbage-body')!.appendChild(renderer.domElement);

		window.addEventListener('resize', onWindowResize);
	}

	export function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);

	}

	var prevTime = 0, time = 0, frames = 0

	export var fps = 0;

	export function loop_and_render() {

		if (app.proompt('h') == 1) {
			statsEnabled = !statsEnabled;
			app.selector_style('garbage-stats', 'visibility', statsEnabled ? 'visible' : 'hidden');
		}

		dt = clock.getDelta();

		const min_dt = 1.0 / 10.0;
		dt = dt > min_dt ? min_dt : dt;
		frames++;
		time = (performance || Date).now();
		if (time >= prevTime + 1000) {
			fps = (frames * 1000) / (time - prevTime);
			prevTime = time;
			frames = 0;
			if (statsEnabled) {
				app.selector_innerhtml('garbage-stats', `
					fps: ${fps.toFixed(1)}<br />
					bounce hdr: ${(headacheMode)}<br />
			`);
			}
		}

		yawGroup.updateMatrix();
		yawGroup.updateMatrixWorld(true);

		renderer.shadowMap.autoUpdate = true;
		renderer.shadowMap.needsUpdate = true;

		camera.updateMatrix();

		//scene.updateWorldMatrix(true, true);

		renderer.xr.updateCamera(camera);

		renderer.render(scene, camera);
	}
}

export default renderer;