import glob from "./lib/glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./lib/pts.js";

// dither stolen from
// https://github.com/hughsk/glsl-dither

/// the shader of shit
const fragmentPost = `
varying vec2 vUv;
uniform float glitch; 
uniform int compression;
uniform float saturation;
uniform sampler2D tDiffuse;
float factor = 200.0;

#define DITHERING true
#include <common>
#include <dithering_pars_fragment>

//#define TONE_MAPPING 
//#include <tonemapping_pars_fragment>

vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}

float luma(vec3 color) {
	return dot(color, vec3(0.299, 0.587, 0.114));
	//return dot(color, vec3(0.5, 0.5, 0.5));
}

float dither4x4(vec2 position, float brightness) {
	int x = int(mod(position.x, 4.0));
	int y = int(mod(position.y, 4.0));
	int index = x + y * 4;
	float limit = 0.0;

	if (x < 8) {
		if (index == 0) limit = 0.0625;
		if (index == 1) limit = 0.5625;
		if (index == 2) limit = 0.1875;
		if (index == 3) limit = 0.6875;
		if (index == 4) limit = 0.8125;
		if (index == 5) limit = 0.3125;
		if (index == 6) limit = 0.9375;
		if (index == 7) limit = 0.4375;
		if (index == 8) limit = 0.25;
		if (index == 9) limit = 0.75;
		if (index == 10) limit = 0.125;
		if (index == 11) limit = 0.625;
		if (index == 12) limit = 1.0;
		if (index == 13) limit = 0.5;
		if (index == 14) limit = 0.875;
		if (index == 15) limit = 0.375;
	}

	return brightness < limit ? 0.0 : 1.0;
}
  
vec3 dither4x4(vec2 position, vec3 color) {
	return color * dither4x4(position, luma(color));
}
  
void main() {
	vec4 diffuse = texture2D( tDiffuse, vUv );

	// animate color reduction
	factor -= glitch * 40.0;

	// animate oversaturation
	//saturation = glitch * 1.0;
	float animated_saturation = 1.0 + glitch * 1.0;

	//factor = clamp(factor, 2.0, 256.0);

	vec3 lumaWeights = vec3(.25,.50,.25);
	vec3 grey = vec3(dot(lumaWeights, diffuse.rgb));
	
	/// saturate
	diffuse = vec4(grey + animated_saturation * (diffuse.rgb - grey), 1.0);

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
	//gl_FragCoord.xy = vUv.xy;
	//gl_FragColor.rgb = dithering( gl_FragColor.rgb );

	gl_FragColor.rgb = dither4x4(gl_FragCoord.xy, gl_FragColor.rgb);
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

	export var scene2, camera2, target, postShader, quad, quad2, plane, glitch, hdr

	export var currt

	export var sun, sunOffset = [0, 10, 0] // sunOffset = [1.0, 10, -1.0]

	// reduce
	export var enable_post = true;
	export var animate_post = true;
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
		postShader = new THREE.ShaderMaterial({
			uniforms: {
				tDiffuse: { value: target.texture },
				glitch: { value: 0.0 },
				saturation: { value: 1.0 },
				bounce: { value: 0.0 },
				compression: { value: 1 },
				toneMappingExposure2: { value: 1.0 }
			},
			//dithering: true,
			vertexShader: vertexScreen,
			fragmentShader: fragmentPost,
			depthWrite: false
		});

		glitch = 0;
		plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
		quad = new THREE.Mesh(plane, postShader);
		quad.matrixAutoUpdate = false;
		//scene2.add(quad);

		const _geometry = new THREE.BufferGeometry();
		_geometry.setAttribute('position',
			new THREE.Float32BufferAttribute([- 1, 3, 0, - 1, - 1, 0, 3, - 1, 0], 3));
		_geometry.setAttribute('uv',
			new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

		quad2 = new THREE.Mesh(_geometry, postShader);
		scene2.add(quad2);

		glitch = 0;
		hdr = 0;

		resize_target_quad_and_camera();

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
		renderer.toneMappingExposure = 6.0;
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

	function resize_target_quad_and_camera() {
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

		resize_target_quad_and_camera();

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
				app.fluke_set_style('hunt-stats', 'visibility', ren_stats ? 'visible' : 'hidden');
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
				postShader.uniforms.glitch.value = itch;
				postShader.uniforms.saturation.value = 1 + itch;
				//let ease = easings.easeOutBounce(bounce);
				//post.uniforms.bounce.value = ease;
			}
			else {
				postShader.uniforms.glitch.value = 1;
				postShader.uniforms.saturation.value = 2.0;
			}
			postShader.uniforms.toneMappingExposure2.value = 3.0;
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

			renderer.setRenderTarget(null);
			renderer.clear();
			renderer.render(scene2, camera2);

			renderer.setRenderTarget(null);
		}
		else {
			renderer.shadowMap.enabled = true;
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