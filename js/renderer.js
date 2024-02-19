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
uniform bool dither; 
uniform int compression;
uniform float saturation;
uniform sampler2D tDiffuse;
float factor = 200.0;

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

float dither8x8(vec2 position, float brightness) {
	int x = int(mod(position.x, 8.0));
	int y = int(mod(position.y, 8.0));
	int index = x + y * 8;
	float limit = 0.0;
  
	if (x < 8) {
	  if (index == 0) limit = 0.015625;
	  if (index == 1) limit = 0.515625;
	  if (index == 2) limit = 0.140625;
	  if (index == 3) limit = 0.640625;
	  if (index == 4) limit = 0.046875;
	  if (index == 5) limit = 0.546875;
	  if (index == 6) limit = 0.171875;
	  if (index == 7) limit = 0.671875;
	  if (index == 8) limit = 0.765625;
	  if (index == 9) limit = 0.265625;
	  if (index == 10) limit = 0.890625;
	  if (index == 11) limit = 0.390625;
	  if (index == 12) limit = 0.796875;
	  if (index == 13) limit = 0.296875;
	  if (index == 14) limit = 0.921875;
	  if (index == 15) limit = 0.421875;
	  if (index == 16) limit = 0.203125;
	  if (index == 17) limit = 0.703125;
	  if (index == 18) limit = 0.078125;
	  if (index == 19) limit = 0.578125;
	  if (index == 20) limit = 0.234375;
	  if (index == 21) limit = 0.734375;
	  if (index == 22) limit = 0.109375;
	  if (index == 23) limit = 0.609375;
	  if (index == 24) limit = 0.953125;
	  if (index == 25) limit = 0.453125;
	  if (index == 26) limit = 0.828125;
	  if (index == 27) limit = 0.328125;
	  if (index == 28) limit = 0.984375;
	  if (index == 29) limit = 0.484375;
	  if (index == 30) limit = 0.859375;
	  if (index == 31) limit = 0.359375;
	  if (index == 32) limit = 0.0625;
	  if (index == 33) limit = 0.5625;
	  if (index == 34) limit = 0.1875;
	  if (index == 35) limit = 0.6875;
	  if (index == 36) limit = 0.03125;
	  if (index == 37) limit = 0.53125;
	  if (index == 38) limit = 0.15625;
	  if (index == 39) limit = 0.65625;
	  if (index == 40) limit = 0.8125;
	  if (index == 41) limit = 0.3125;
	  if (index == 42) limit = 0.9375;
	  if (index == 43) limit = 0.4375;
	  if (index == 44) limit = 0.78125;
	  if (index == 45) limit = 0.28125;
	  if (index == 46) limit = 0.90625;
	  if (index == 47) limit = 0.40625;
	  if (index == 48) limit = 0.25;
	  if (index == 49) limit = 0.75;
	  if (index == 50) limit = 0.125;
	  if (index == 51) limit = 0.625;
	  if (index == 52) limit = 0.21875;
	  if (index == 53) limit = 0.71875;
	  if (index == 54) limit = 0.09375;
	  if (index == 55) limit = 0.59375;
	  if (index == 56) limit = 1.0;
	  if (index == 57) limit = 0.5;
	  if (index == 58) limit = 0.875;
	  if (index == 59) limit = 0.375;
	  if (index == 60) limit = 0.96875;
	  if (index == 61) limit = 0.46875;
	  if (index == 62) limit = 0.84375;
	  if (index == 63) limit = 0.34375;
	}
  
	return brightness < limit ? 0.0 : 1.0;
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

vec3 dither8x8(vec2 position, vec3 color) {
	return color * dither8x8(position, luma(color));
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

	if (dither)
	gl_FragColor.rgb = dither4x4(gl_FragCoord.xy, gl_FragColor.rgb);
}`;
const vertexScreen = `
varying vec2 vUv;
uniform float glitch;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
var renderer;
(function (renderer_1) {
    // set up three.js here
    const offscreen_target_factor = 3;
    const post_processing_factor = 1;
    renderer_1.dt = 0;
    renderer_1.sunOffset = [0, 10, 0]; // sunOffset = [1.0, 10, -1.0]
    // reduce
    renderer_1.enable_post = true;
    renderer_1.animate_bounce_hdr = false;
    renderer_1.dither = true;
    renderer_1.ren_stats = false;
    function boot() {
        window['renderer'] = this;
        console.log('renderer boot');
        THREE.ColorManagement.enabled = true;
        renderer_1.clock = new THREE.Clock();
        renderer_1.propsGroup = new THREE.Group();
        renderer_1.propsGroup.updateMatrix();
        renderer_1.propsGroup.updateMatrixWorld();
        const material = new THREE.MeshLambertMaterial({ color: 'red' });
        const geometry = new THREE.RingGeometry(0.5, 1, 8);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.add(new THREE.AxesHelper(1));
        renderer_1.propsGroup.add(mesh);
        renderer_1.scene = new THREE.Scene();
        renderer_1.scene.add(renderer_1.propsGroup);
        renderer_1.scene.background = new THREE.Color('white');
        renderer_1.scene2 = new THREE.Scene();
        renderer_1.scene2.matrixAutoUpdate = false;
        //scene2.background = new THREE.Color('white');
        renderer_1.target = new THREE.WebGLRenderTarget(512, 512, {
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });
        renderer_1.postShader = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: renderer_1.target.texture },
                glitch: { value: 0.0 },
                dither: { value: true },
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
        renderer_1.glitch = 0;
        renderer_1.plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
        const _geometry = new THREE.BufferGeometry();
        _geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
        _geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
        renderer_1.quad2 = new THREE.Mesh(_geometry, renderer_1.postShader);
        renderer_1.scene2.add(renderer_1.quad2);
        renderer_1.glitch = 0;
        renderer_1.hdr = 0;
        renderer_1.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer_1.camera.rotation.y = -Math.PI / 2;
        renderer_1.camera.position.y = 1.5;
        const helper = new THREE.AxesHelper(1);
        renderer_1.scene.add(helper);
        renderer_1.camera.position.z = 5;
        const dpi = window.devicePixelRatio;
        renderer_1.renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer_1.renderer.xr.enabled = true;
        renderer_1.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer_1.renderer.toneMappingExposure = 5.0;
        renderer_1.renderer.setPixelRatio(dpi);
        renderer_1.renderer.setSize(window.innerWidth, window.innerHeight);
        renderer_1.renderer.shadowMap.enabled = true;
        renderer_1.renderer.shadowMap.type = THREE.BasicShadowMap;
        renderer_1.renderer.setClearColor(0xffffff, 0.0);
        resize();
        renderer_1.currt = renderer_1.renderer.getRenderTarget();
        console.log('currt', renderer_1.currt);
        //renderer_.toneMapping = THREE.ReinhardToneMapping;
        const percent = 2 / 100;
        renderer_1.ambiance = new THREE.AmbientLight(0xffffff, percent);
        renderer_1.scene.add(renderer_1.ambiance);
        renderer_1.sun = new THREE.DirectionalLight(0xd6b49b, 0.7);
        renderer_1.sun.shadow.mapSize.width = 2048;
        renderer_1.sun.shadow.mapSize.height = 2048;
        renderer_1.sun.shadow.radius = 2;
        renderer_1.sun.shadow.bias = 0.0005;
        renderer_1.sun.shadow.camera.near = 0.5;
        renderer_1.sun.shadow.camera.far = 500;
        renderer_1.sun.shadow.camera.left = renderer_1.sun.shadow.camera.bottom = -15;
        renderer_1.sun.shadow.camera.right = renderer_1.sun.shadow.camera.top = 15;
        renderer_1.sun.position.fromArray(renderer_1.sunOffset);
        renderer_1.sun.castShadow = true;
        renderer_1.scene.add(renderer_1.sun);
        renderer_1.scene.add(renderer_1.sun.target);
        // scene.add(new THREE.CameraHelper(sun.shadow.camera));
        const hunt_main = document.querySelector('hunt-main');
        hunt_main.appendChild(renderer_1.renderer.domElement);
        // test
        window.addEventListener('resize', resize);
    }
    renderer_1.boot = boot;
    function resize() {
        let wh = pts.make(window.innerWidth, window.innerHeight);
        const nearest = 8;
        //wh[0] = wh[0] - wh[0] % nearest;
        //wh[1] = wh[1] - wh[1] % nearest;
        let offscreen = pts.divide(wh, offscreen_target_factor);
        offscreen = pts.floor(offscreen);
        renderer_1.target.setSize(offscreen[0], offscreen[1]);
        renderer_1.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        let screen = pts.divide(wh, post_processing_factor);
        screen = pts.floor(screen);
        console.log('screen, offscreen', screen, offscreen);
        renderer_1.renderer.setSize(screen[0], screen[1]);
        const canvas = renderer_1.renderer.domElement;
        canvas.style.width = screen[0] + 'px';
        canvas.style.height = screen[1] + 'px';
        renderer_1.camera.aspect = screen[0] / screen[1];
        renderer_1.camera.updateProjectionMatrix();
    }
    renderer_1.resize = resize;
    var prevTime = 0, time = 0, frames = 0;
    renderer_1.fps = 0;
    function loop() {
        if (glob.developer) {
            if (glob.z == 1)
                renderer_1.enable_post = !renderer_1.enable_post;
            if (glob.x == 1)
                renderer_1.animate_bounce_hdr = !renderer_1.animate_bounce_hdr;
            if (glob.c == 1) {
                renderer_1.dither = !renderer_1.dither;
                if (renderer_1.dither)
                    renderer_1.renderer.toneMappingExposure = 5.5;
                else
                    renderer_1.renderer.toneMappingExposure = 2.5;
            }
            if (glob.h == 1) {
                renderer_1.ren_stats = !renderer_1.ren_stats;
                app.fluke_set_style('hunt-stats', 'visibility', renderer_1.ren_stats ? 'visible' : 'hidden');
            }
        }
    }
    renderer_1.loop = loop;
    function render() {
        loop();
        const jump_sun_every = 1;
        let xz = [renderer_1.camera.position.x, renderer_1.camera.position.z];
        let div = pts.divide(xz, jump_sun_every);
        xz = pts.mult(pts.floor(div), jump_sun_every);
        //xz = pts.mult(xz, hunt.inchMeter);
        //console.log('zx', xz);
        renderer_1.sun.position.fromArray([xz[0] + renderer_1.sunOffset[0], renderer_1.sunOffset[1], xz[1] + renderer_1.sunOffset[2]]);
        renderer_1.sun.target.position.fromArray([xz[0], 0, xz[1]]);
        renderer_1.dt = renderer_1.clock.getDelta();
        // if we run sub 10 fps, pretend it's 10
        // this prevents huge dt of seconds, minutes, hours
        // if your fps is very low, the game will appear to be in slow motion
        const min_dt = 1.0 / 10.0;
        renderer_1.dt = renderer_1.dt > min_dt ? min_dt : renderer_1.dt;
        frames++;
        time = (performance || Date).now();
        if (time >= prevTime + 1000) {
            renderer_1.fps = (frames * 1000) / (time - prevTime);
            prevTime = time;
            frames = 0;
            if (renderer_1.ren_stats) {
                app.fluke_set_innerhtml('hunt-stats', `
					fps: ${renderer_1.fps.toFixed(1)}<br />
					offscreen_target_factor: ${(1 / offscreen_target_factor).toFixed(2)}<br />
					post_processing_factor: ${(1 / post_processing_factor).toFixed(2)}
			`);
            }
        }
        if (renderer_1.enable_post) {
            const pulse_cycle = 3;
            renderer_1.glitch += renderer_1.dt / (pulse_cycle / 2);
            renderer_1.hdr += renderer_1.dt / 1.0;
            if (renderer_1.glitch >= 2)
                renderer_1.glitch -= 2;
            if (renderer_1.hdr >= 1)
                renderer_1.hdr -= 1;
            renderer_1.postShader.uniforms.dither.value = renderer_1.dither;
            if (renderer_1.animate_bounce_hdr) {
                let itch = easings.easeOutBounce(renderer_1.glitch <= 1 ? renderer_1.glitch : 2 - renderer_1.glitch);
                renderer_1.postShader.uniforms.glitch.value = itch;
                renderer_1.postShader.uniforms.saturation.value = 1 + itch;
                //let ease = easings.easeOutBounce(bounce);
                //post.uniforms.bounce.value = ease;
            }
            else {
                renderer_1.postShader.uniforms.glitch.value = 1;
                renderer_1.postShader.uniforms.saturation.value = 2.0;
            }
            renderer_1.postShader.uniforms.toneMappingExposure2.value = 3.0;
        }
        //camera.zoom = 0.5 + ease / 2;
        renderer_1.camera.updateProjectionMatrix();
        //console.log('clock', clock.getElapsedTime());
        if (renderer_1.enable_post) {
            renderer_1.renderer.shadowMap.enabled = true;
            renderer_1.renderer.setRenderTarget(renderer_1.target);
            renderer_1.renderer.clear();
            renderer_1.renderer.render(renderer_1.scene, renderer_1.camera);
            renderer_1.renderer.shadowMap.enabled = false;
            renderer_1.renderer.setRenderTarget(null);
            renderer_1.renderer.clear();
            renderer_1.renderer.render(renderer_1.scene2, renderer_1.camera2);
        }
        else {
            renderer_1.renderer.shadowMap.enabled = true;
            //renderer.shadowMap.enabled = false;
            //let rt = renderer.getRenderTarget();
            //console.log('currt vs rt', currt, rt);
            //if (renderer.xr.getBaseLayer()) {
            //	renderer.setRenderTargetFramebuffer(tarrt, renderer.xr.getBaseLayer().framebuffer);
            //}
            //renderer.setRenderTarget(tarrt);
            //renderer.setRenderTarget(null);
            //renderer.clear();
            renderer_1.renderer.render(renderer_1.scene, renderer_1.camera);
        }
    }
    renderer_1.render = render;
})(renderer || (renderer = {}));
export default renderer;
