import glob from "./lib/glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./lib/pts.js";

/// the shader of shit
const fragmentPost = `
varying vec2 vUv;
uniform float glitch; 
uniform int compression;
uniform float saturation;
uniform sampler2D tDiffuse;
float factor = 200.0;

//#define TONE_MAPPING 
//#include <tonemapping_pars_fragment>

vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}

void main() {
	vec4 diffuse = texture2D( tDiffuse, vUv );

	// animate color reduction
	factor -= glitch * 40.0;

	// animate oversaturation
	//saturation += glitch * 1.0;

	//factor = clamp(factor, 2.0, 256.0);

	vec3 lumaWeights = vec3(.25,.50,.25);
	vec3 grey = vec3(dot(lumaWeights, diffuse.rgb));
	
	/// saturate
	diffuse = vec4(grey + saturation * (diffuse.rgb - grey), 1.0);

	/// now colround
	diffuse *= factor;
	diffuse = vec4( ceil(diffuse.r), ceil(diffuse.g), ceil(diffuse.b), ceil(diffuse.a) );
	diffuse /= factor;

	//diffuse = vec4(floor(diffuse.rgb * factor + 0.5) / factor, diffuse.a); // reduce

	//diffuse = LinearToGamma( diffuse, 0.7);
	gl_FragColor = diffuse;
	//#include <tonemapping_fragment>
	// LinearToneMapping ReinhardToneMapping OptimizedCineonToneMapping ACESFilmicToneMapping
	gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
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

	export var scene, camera, renderer, ambiance, clock;

	export var dt = 0;

	export var propsGroup;

	export var scene2, camera2, target, post, quad, quad2, plane, glitch, hdr

	export var xrpostcamera

	export var tarrt = null

	export var currt

	export var sun, sunOffset = [0, 10, 0] // sunOffset = [1.0, 10, -1.0]

	// reduce
	export var enable_post = false;
	export var animate_post = false;
	export var ren_stats = false;


	export function boot() {
		window['renderer'] = this;

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
				saturation: { value: 1.0 },
				bounce: { value: 0.0 },
				compression: { value: 1 },
				toneMappingExposure2: { value: 1.0 }
			},
			vertexShader: vertexScreen,
			fragmentShader: fragmentPost,
			depthWrite: false
		});

		glitch = 0;
		plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
		quad = new THREE.Mesh(plane, post);
		quad.matrixAutoUpdate = false;
		//scene2.add(quad);

		const _geometry = new THREE.BufferGeometry();
		_geometry.setAttribute('position',
			new THREE.Float32BufferAttribute([- 1, 3, 0, - 1, - 1, 0, 3, - 1, 0], 3));
		_geometry.setAttribute('uv',
			new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

		quad2 = new THREE.Mesh(_geometry, post);
		scene2.add(quad2);

		glitch = 0;
		hdr = 0;

		redo();

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		camera.rotation.y = -Math.PI / 2;
		camera.position.y = 1.5;

		const helper = new THREE.AxesHelper(1);
		scene.add(helper);

		camera.position.z = 5;

		const dpi = window.devicePixelRatio;
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.xr.enabled = true;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.8;
		renderer.setPixelRatio(dpi);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.BasicShadowMap;
		renderer.setClearColor(0xffffff, 0.0);

		currt = renderer.getRenderTarget();
		console.log('currt', currt);

		//renderer_.toneMapping = THREE.ReinhardToneMapping;

		const percent = 2 / 100;
		ambiance = new THREE.AmbientLight(0xffffff, percent);
		scene.add(ambiance);

		sun = new THREE.DirectionalLight(0xd6b49b, 0.7);
		sun.shadow.mapSize.width = 2048;
		sun.shadow.mapSize.height = 2048;
		sun.shadow.radius = 2;
		sun.shadow.bias = 0.0005;
		sun.shadow.camera.near = 0.5;
		sun.shadow.camera.far = 500;
		sun.shadow.camera.left = sun.shadow.camera.bottom = -15;
		sun.shadow.camera.right = sun.shadow.camera.top = 15;
		sun.position.fromArray(sunOffset);
		sun.castShadow = true;
		scene.add(sun);
		scene.add(sun.target);

		// scene.add(new THREE.CameraHelper(sun.shadow.camera));

		const hunt_main = document.querySelector('hunt-main')!;

		hunt_main.appendChild(renderer.domElement);
		// test


		window.addEventListener('resize', resize);
	}

	function redo() {
		const wh = pts.make(window.innerWidth, window.innerHeight);
		const rescale = pts.divide(wh, render_target_factor);

		target.setSize(rescale[0], rescale[1]);

		quad.geometry = new THREE.PlaneGeometry(wh[0], wh[1]);

		camera2 = new THREE.OrthographicCamera(
			wh[0] / - 2, wh[0] / 2, wh[1] / 2, wh[1] / - 2, -100, 100);
		camera2.updateProjectionMatrix();

		camera2 = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
	}

	export function resize() {

		redo();

		renderer.setSize(window.innerWidth, window.innerHeight);

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		//render();
	}

	var prevTime = 0, time = 0, frames = 0
	export var fps = 0;

	export function loop() {
		if (glob.developer) {
			if (glob.z == 1)
				enable_post = !enable_post;
			if (glob.x == 1)
				animate_post = !animate_post;
			if (glob.h == 1) {
				ren_stats = !ren_stats;
				app.fluke_set_style('hunt-stats', 'visibility', ren_stats ? '' : 'hidden');
			}
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

		dt = clock.getDelta();

		// if we run sub 10 fps, pretend it's 10
		// this prevents huge dt of seconds, minutes, hours
		// if your fps is very low, the game will appear to be in slow motion
		const min_dt = 1.0 / 10.0;
		dt = dt > min_dt ? min_dt : dt;

		frames++;
		time = (performance || Date).now();

		if (time >= prevTime + 1000) {

			fps = (frames * 1000) / (time - prevTime);

			prevTime = time;
			frames = 0;

			if (ren_stats) {
				app.fluke_set_innerhtml('hunt-stats', `
					fps: ${fps.toFixed(1)}<br />
					render target scale: ${(1 / render_target_factor).toFixed(1)}
			`);
			}
		}

		if (enable_post) {
			const pulse_cycle = 3;

			glitch += dt / (pulse_cycle / 2);
			hdr += dt / 1.0;

			if (glitch >= 2)
				glitch -= 2;

			if (hdr >= 1)
				hdr -= 1;

			if (animate_post) {
				let itch = easings.easeOutBounce(glitch <= 1 ? glitch : 2 - glitch);
				post.uniforms.glitch.value = itch;
				post.uniforms.saturation.value = 1 + itch;
				//let ease = easings.easeOutBounce(bounce);
				//post.uniforms.bounce.value = ease;
			}
			else {
				post.uniforms.glitch.value = 1;
				post.uniforms.saturation.value = 2.0;
			}
			post.uniforms.toneMappingExposure2.value = 3.0;
		}

		//camera.zoom = 0.5 + ease / 2;
		camera.updateProjectionMatrix();

		//console.log('clock', clock.getElapsedTime());

		if (enable_post) {
			renderer.shadowMap.enabled = true;

			renderer.setRenderTarget(target);
			renderer.clear();
			renderer.render(scene, camera);

			renderer.shadowMap.enabled = false;

			const xrEnabled = renderer.xr.enabled;

			//renderer.xr.enabled = false;
			renderer.setRenderTarget(tarrt);
			renderer.clear();
			renderer.render(scene2, camera2);
			//renderer.xr.enabled = xrEnabled;

			renderer.setRenderTarget(null);
		}
		else {
			//renderer.shadowMap.enabled = false;

			//let rt = renderer.getRenderTarget();
			//console.log('currt vs rt', currt, rt);

			//if (renderer.xr.getBaseLayer()) {
			//	renderer.setRenderTargetFramebuffer(tarrt, renderer.xr.getBaseLayer().framebuffer);
			//}
			//renderer.setRenderTarget(tarrt);
			//renderer.setRenderTarget(null);
			//renderer.clear();
			renderer.render(scene, camera);
		}
	}
}

export default renderer;