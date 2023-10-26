import glob from "./glob.js";
import app from "./app.js";
import player from "./player.js";
import props from "./props.js";
import sketchup from "./sketchup.js";
import easings from "./easings.js";
import pts from "./pts.js";
import hunt from "./hunt.js";

const fragmentPost = `
varying vec2 vUv;
uniform float glitch; 
uniform int compression;
uniform sampler2D tDiffuse;
float factor = 256.0;
float saturation = 2.0;

#define TONE_MAPPING 
#include <tonemapping_pars_fragment>

vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}

void main() {
	vec4 diffuse = texture2D( tDiffuse, vUv );

	// animate color reduction
	factor -= glitch * 10.0;

	// animate oversaturation
	saturation += glitch * 2.0;

	factor = clamp(factor, 2.0, 256.0);

	vec3 lumaWeights = vec3(.25,.50,.25);
	vec3 grey = vec3(dot(lumaWeights, diffuse.rgb));
	
	// sat then reduce
	diffuse = vec4(grey + saturation * (diffuse.rgb - grey), 1.0);
	diffuse = vec4(floor(diffuse.rgb * factor + 0.5) / factor, diffuse.a);

	//diffuse = LinearToGamma( diffuse, 0.7);
	gl_FragColor = diffuse;
	//#include <tonemapping_fragment>
	// LinearToneMapping ReinhardToneMapping OptimizedCineonToneMapping ACESFilmicToneMapping
	gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );
	#include <colorspace_fragment>
}`


const vertexScreen = `
varying vec2 vUv;
uniform float glitch;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`

namespace renderer {
	// set up three.js here

	const render_target_factor = 1;

	export var scene, camera, renderer_, ambiance, clock;

	export var delta = 0;

	export var propsGroup;

	export var scene2, camera2, target, post, quad, plane, glitch, hdr

	export var sun, sunOffset = [1.0, 10, -1.0]

	// reduce
	export var enable_post = true;
	export var animate_post = true;


	export function boot() {
		window['renderer'] = renderer;

		console.log('renderer boot');

		THREE.ColorManagement.enabled = true;

		clock = new THREE.Clock();

		propsGroup = new THREE.Group();

		propsGroup.updateMatrix();
		propsGroup.updateMatrixWorld();

		const material = new THREE.MeshLambertMaterial({ color: 'red' });
		const geometry = new THREE.RingGeometry(0.5, 1, 8);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.add(new THREE.AxesHelper(1));
		propsGroup.add(mesh);

		scene = new THREE.Scene();
		scene.add(propsGroup);
		scene.background = new THREE.Color('white');

		scene2 = new THREE.Scene();
		scene2.matrixAutoUpdate = false;
		//scene2.background = new THREE.Color('white');

		target = new THREE.WebGLRenderTarget(512, 512, {
			type: THREE.FloatType, // hdr effect
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
		});
		post = new THREE.ShaderMaterial({
			uniforms: {
				tDiffuse: { value: target.texture },
				glitch: { value: 0.0 },
				bounce: { value: 0.0 },
				compression: { value: 1 },
				toneMappingExposure: { value: 1.0 }
			},
			vertexShader: vertexScreen,
			fragmentShader: fragmentPost,
			depthWrite: false
		});
		glitch = 0;
		plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
		quad = new THREE.Mesh(plane, post);
		quad.matrixAutoUpdate = false;
		scene2.add(quad);

		glitch = 0;
		hdr = 0;

		redo();

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		const helper = new THREE.AxesHelper(1);
		scene.add(helper);

		camera.position.z = 5;

		const dpi = window.devicePixelRatio;
		renderer_ = new THREE.WebGLRenderer({ antialias: false });
		renderer_.setPixelRatio(dpi);
		renderer_.setSize(window.innerWidth, window.innerHeight);
		renderer_.shadowMap.enabled = true;
		renderer_.shadowMap.type = THREE.BasicShadowMap;
		renderer_.setClearColor(0xffffff, 0.0);
		//renderer_.toneMapping = THREE.ReinhardToneMapping;

		ambiance = new THREE.AmbientLight(0xffffff, 0.05);
		scene.add(ambiance);

		sun = new THREE.DirectionalLight(0xd6b49b, 0.7);
		sun.shadow.mapSize.width = 2048;
		sun.shadow.mapSize.height = 2048;
		sun.shadow.radius = 2;
		sun.shadow.bias = 0.0005;
		sun.shadow.camera.near = 0.5;
		sun.shadow.camera.far = 500;
		sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
		sun.shadow.camera.right = sun.shadow.camera.top = 10;
		const extend = 1000;
		sun.position.fromArray(sunOffset);
		sun.castShadow = true;
		scene.add(sun);
		scene.add(sun.target);

		// scene.add(new THREE.CameraHelper(sun.shadow.camera));

		const hunt_main = document.querySelector('hunt-main')!;

		hunt_main.appendChild(renderer_.domElement);
		// test


		window.addEventListener('resize', onWindowResize);
	}

	function redo() {
		const wh = pts.make(window.innerWidth, window.innerHeight);
		const half = pts.divide(wh, render_target_factor);

		target.setSize(half[0], half[1]);

		quad.geometry = new THREE.PlaneGeometry(wh[0], wh[1]);

		camera2 = new THREE.OrthographicCamera(
			wh[0] / - 2, wh[0] / 2, wh[1] / 2, wh[1] / - 2, -100, 100);
		camera2.updateProjectionMatrix();
	}

	function onWindowResize() {

		redo();

		renderer_.setSize(window.innerWidth, window.innerHeight);

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		render();
	}

	var prevTime = 0, time = 0, frames = 0
	export var fps = 0;

	export function loop() {
		if (glob.developer) {
			if (app.prompt_key('z') == 1)
				enable_post = !enable_post;
			if (app.prompt_key('x') == 1)
				animate_post = !animate_post;
		}
	}

	export function render() {
		loop();

		const jump_sun_every = 1;
		let xz = [camera.position.x, camera.position.z] as vec2;
		let div = pts.divide(xz, jump_sun_every);
		xz = pts.mult(pts.floor(div), jump_sun_every);
		//xz = pts.mult(xz, hunt.inchMeter);

		//console.log('zx', xz);

		sun.position.fromArray([xz[0] + sunOffset[0], sunOffset[1], xz[1] + sunOffset[2]]);
		sun.target.position.fromArray([xz[0], 0, xz[1]]);

		delta = clock.getDelta();

		frames++;
		time = (performance || Date).now();

		if (time >= prevTime + 1000) {

			fps = (frames * 1000) / (time - prevTime);

			prevTime = time;
			frames = 0;
			app.fluke_set_innerhtml('hunt-stats', `
				fps: ${fps}<br />
				render target scale: ${1 / render_target_factor}
			`);
		}

		const pulse_cycle = 3;

		glitch += delta / (pulse_cycle / 2);
		hdr += delta / 1.0;

		if (glitch >= 2)
			glitch -= 2;

		if (hdr >= 1)
			hdr -= 1;

		if (animate_post) {
			let itch = easings.easeOutBounce(glitch <= 1 ? glitch : 2 - glitch);
			post.uniforms.glitch.value = itch;
			post.uniforms.toneMappingExposure.value = 2.0;// + hdr;
			//let ease = easings.easeOutBounce(bounce);
			//post.uniforms.bounce.value = ease;
		}
		else {
			post.uniforms.toneMappingExposure.value = 2.0;
			post.uniforms.glitch.value = 0.1;
		}
		let position = plane.getAttribute('position');
		plane.getAttribute('position').needsUpdate = true;
		plane.needsUpdate = true;
		//console.log(position);

		position.array[0] = window.innerWidth - 1000;
		position.array[1] = window.innerWidth - 1000;
		position.array[2] = window.innerWidth - 1000;
		position.needsUpdate = true;

		//camera.zoom = 0.5 + ease / 2;
		camera.updateProjectionMatrix();

		//console.log('clock', clock.getElapsedTime());

		if (enable_post) {
			renderer_.shadowMap.enabled = true;

			renderer_.setRenderTarget(target);
			renderer_.clear();
			renderer_.render(scene, camera);

			renderer_.shadowMap.enabled = false;

			renderer_.setRenderTarget(null);
			renderer_.clear();
			renderer_.render(scene2, camera2);
		}
		else {
			renderer_.shadowMap.enabled = true;

			renderer_.setRenderTarget(null);
			renderer_.clear();
			renderer_.render(scene, camera);
		}
	}
}

export default renderer;