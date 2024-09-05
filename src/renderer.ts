import glob from "./lib/glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./lib/pts.js";
import vr from "./vr/vr.js";

namespace renderer {
	// set up three.js here

	export var scene, camera, renderer, ambiance, clock;

	export var cameraGroup;

	export var dt = 0;

	export var propsGroup;

	export var sun, sunOffset = [-2, 30, -2]

	export var headacheMode = false;
	export var statsEnabled = false;

	export function boot() {
		window['renderer'] = this;

		console.log('renderer boot');

		THREE.ColorManagement.enabled = true;

		clock = new THREE.Clock();

		propsGroup = new THREE.Group();
		cameraGroup = new THREE.Group();
		
		scene = new THREE.Scene();
		scene.add(propsGroup);
		scene.add(cameraGroup);
		scene.background = new THREE.Color('#333');

		RectAreaLightUniformsLib.init();
		
		let helepr = new THREE.AxesHelper();
		scene.add(helepr);

		scene.fog = new THREE.Fog(0x131c1d, 7, 20);

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		cameraGroup.rotation.y = -Math.PI / 2;
		cameraGroup.updateMatrix();

		//camera.position.set(5, 0, 0);

		renderer = new THREE.WebGLRenderer({
			antialias: true
		});
		//renderer.autoClear = false;
		//cameraGroup.add(renderer.xr.getCamera());
		cameraGroup.add(camera);

		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 4.5;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		if (glob.hasHeadset)
			renderer.setAnimationLoop(app.base_loop);
		renderer.xr.setFramebufferScaleFactor(1);
		renderer.shadowMap.enabled = true;

		renderer.xr.enabled = true;
		renderer.xr.cameraAutoUpdate = false;
		renderer.shadowMap.type = THREE.BasicShadowMap;
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
			app.selector_style('salvage-stats', 'visibility', 'visible');
		}

		document.querySelector('salvage-body')!.appendChild(renderer.domElement);

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
			app.selector_style('salvage-stats', 'visibility', statsEnabled ? 'visible' : 'hidden');
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
				app.selector_innerhtml('salvage-stats', `
					fps: ${fps.toFixed(1)}<br />
					bounce hdr: ${(headacheMode)}<br />
			`);
			}
		}

		cameraGroup.updateMatrix();
		cameraGroup.updateMatrixWorld(true);
		cameraGroup.updateWorldMatrix(false, true);

		vr.loop();

		renderer.xr.updateCamera(camera);
		
		renderer.render(scene, camera);
	}
}

export default renderer;