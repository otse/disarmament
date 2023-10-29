import glob from "./glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./pts.js";
const fragmentPost = `
varying vec2 vUv;
uniform float glitch; 
uniform int compression;
uniform float saturation;
uniform sampler2D tDiffuse;
float factor = 200.0;

#define TONE_MAPPING 
#include <tonemapping_pars_fragment>

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
}`;
const vertexScreen = `
varying vec2 vUv;
uniform float glitch;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
var renderer;
(function (renderer) {
    // set up three.js here
    const render_target_factor = 2;
    renderer.dt = 0;
    renderer.sunOffset = [1.0, 10, -1.0];
    // reduce
    renderer.enable_post = true;
    renderer.animate_post = true;
    renderer.ren_stats = false;
    function boot() {
        window['renderer'] = renderer;
        console.log('renderer boot');
        THREE.ColorManagement.enabled = true;
        renderer.clock = new THREE.Clock();
        renderer.propsGroup = new THREE.Group();
        renderer.propsGroup.updateMatrix();
        renderer.propsGroup.updateMatrixWorld();
        const material = new THREE.MeshLambertMaterial({ color: 'red' });
        const geometry = new THREE.RingGeometry(0.5, 1, 8);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.add(new THREE.AxesHelper(1));
        renderer.propsGroup.add(mesh);
        renderer.scene = new THREE.Scene();
        renderer.scene.add(renderer.propsGroup);
        renderer.scene.background = new THREE.Color('white');
        renderer.scene2 = new THREE.Scene();
        renderer.scene2.matrixAutoUpdate = false;
        //scene2.background = new THREE.Color('white');
        renderer.target = new THREE.WebGLRenderTarget(512, 512, {
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });
        renderer.post = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: renderer.target.texture },
                glitch: { value: 0.0 },
                saturation: { value: 1.0 },
                bounce: { value: 0.0 },
                compression: { value: 1 },
                toneMappingExposure: { value: 1.0 }
            },
            vertexShader: vertexScreen,
            fragmentShader: fragmentPost,
            depthWrite: false
        });
        renderer.glitch = 0;
        renderer.plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
        renderer.quad = new THREE.Mesh(renderer.plane, renderer.post);
        renderer.quad.matrixAutoUpdate = false;
        renderer.scene2.add(renderer.quad);
        renderer.glitch = 0;
        renderer.hdr = 0;
        redo();
        renderer.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const helper = new THREE.AxesHelper(1);
        renderer.scene.add(helper);
        renderer.camera.position.z = 5;
        const dpi = window.devicePixelRatio;
        renderer.renderer_ = new THREE.WebGLRenderer({ antialias: false });
        renderer.renderer_.setPixelRatio(dpi);
        renderer.renderer_.setSize(window.innerWidth, window.innerHeight);
        renderer.renderer_.shadowMap.enabled = true;
        renderer.renderer_.shadowMap.type = THREE.BasicShadowMap;
        renderer.renderer_.setClearColor(0xffffff, 0.0);
        //renderer_.toneMapping = THREE.ReinhardToneMapping;
        renderer.ambiance = new THREE.AmbientLight(0xffffff, 0.06);
        renderer.scene.add(renderer.ambiance);
        renderer.sun = new THREE.DirectionalLight(0xd6b49b, 0.7);
        renderer.sun.shadow.mapSize.width = 2048;
        renderer.sun.shadow.mapSize.height = 2048;
        renderer.sun.shadow.radius = 2;
        renderer.sun.shadow.bias = 0.0005;
        renderer.sun.shadow.camera.near = 0.5;
        renderer.sun.shadow.camera.far = 500;
        renderer.sun.shadow.camera.left = renderer.sun.shadow.camera.bottom = -10;
        renderer.sun.shadow.camera.right = renderer.sun.shadow.camera.top = 10;
        const extend = 1000;
        renderer.sun.position.fromArray(renderer.sunOffset);
        renderer.sun.castShadow = true;
        renderer.scene.add(renderer.sun);
        renderer.scene.add(renderer.sun.target);
        // scene.add(new THREE.CameraHelper(sun.shadow.camera));
        const hunt_main = document.querySelector('hunt-main');
        hunt_main.appendChild(renderer.renderer_.domElement);
        // test
        window.addEventListener('resize', onWindowResize);
    }
    renderer.boot = boot;
    function redo() {
        const wh = pts.make(window.innerWidth, window.innerHeight);
        const half = pts.divide(wh, render_target_factor);
        renderer.target.setSize(half[0], half[1]);
        renderer.quad.geometry = new THREE.PlaneGeometry(wh[0], wh[1]);
        renderer.camera2 = new THREE.OrthographicCamera(wh[0] / -2, wh[0] / 2, wh[1] / 2, wh[1] / -2, -100, 100);
        renderer.camera2.updateProjectionMatrix();
    }
    function onWindowResize() {
        redo();
        renderer.renderer_.setSize(window.innerWidth, window.innerHeight);
        renderer.camera.aspect = window.innerWidth / window.innerHeight;
        renderer.camera.updateProjectionMatrix();
        render();
    }
    var prevTime = 0, time = 0, frames = 0;
    renderer.fps = 0;
    function loop() {
        if (glob.developer) {
            if (glob.z == 1)
                renderer.enable_post = !renderer.enable_post;
            if (glob.x == 1)
                renderer.animate_post = !renderer.animate_post;
            if (glob.h == 1) {
                renderer.ren_stats = !renderer.ren_stats;
                app.fluke_set_style('hunt-stats', 'visibility', renderer.ren_stats ? '' : 'hidden');
            }
        }
    }
    renderer.loop = loop;
    function render() {
        loop();
        const jump_sun_every = 1;
        let xz = [renderer.camera.position.x, renderer.camera.position.z];
        let div = pts.divide(xz, jump_sun_every);
        xz = pts.mult(pts.floor(div), jump_sun_every);
        //xz = pts.mult(xz, hunt.inchMeter);
        //console.log('zx', xz);
        renderer.sun.position.fromArray([xz[0] + renderer.sunOffset[0], renderer.sunOffset[1], xz[1] + renderer.sunOffset[2]]);
        renderer.sun.target.position.fromArray([xz[0], 0, xz[1]]);
        renderer.dt = renderer.clock.getDelta();
        // if we run sub 10 fps, pretend it's 10
        // this prevents huge dt of seconds, minutes, hours
        // if your fps is very low, the game will appear to be in slow motion
        const min_dt = 1.0 / 10.0;
        renderer.dt = renderer.dt > min_dt ? min_dt : renderer.dt;
        frames++;
        time = (performance || Date).now();
        if (time >= prevTime + 1000) {
            renderer.fps = (frames * 1000) / (time - prevTime);
            prevTime = time;
            frames = 0;
            if (renderer.ren_stats) {
                app.fluke_set_innerhtml('hunt-stats', `
				fps: ${renderer.fps}<br />
				render target scale: ${(1 / render_target_factor).toFixed(1)}
			`);
            }
        }
        const pulse_cycle = 3;
        renderer.glitch += renderer.dt / (pulse_cycle / 2);
        renderer.hdr += renderer.dt / 1.0;
        if (renderer.glitch >= 2)
            renderer.glitch -= 2;
        if (renderer.hdr >= 1)
            renderer.hdr -= 1;
        if (renderer.animate_post) {
            let itch = easings.easeOutBounce(renderer.glitch <= 1 ? renderer.glitch : 2 - renderer.glitch);
            renderer.post.uniforms.glitch.value = itch;
            renderer.post.uniforms.saturation.value = 1 + itch;
            //let ease = easings.easeOutBounce(bounce);
            //post.uniforms.bounce.value = ease;
        }
        else {
            renderer.post.uniforms.glitch.value = 0;
            renderer.post.uniforms.saturation.value = 2.0;
        }
        renderer.post.uniforms.toneMappingExposure.value = 2.0;
        let position = renderer.plane.getAttribute('position');
        renderer.plane.getAttribute('position').needsUpdate = true;
        renderer.plane.needsUpdate = true;
        //console.log(position);
        position.array[0] = window.innerWidth - 1000;
        position.array[1] = window.innerWidth - 1000;
        position.array[2] = window.innerWidth - 1000;
        position.needsUpdate = true;
        //camera.zoom = 0.5 + ease / 2;
        renderer.camera.updateProjectionMatrix();
        //console.log('clock', clock.getElapsedTime());
        if (renderer.enable_post) {
            renderer.renderer_.shadowMap.enabled = true;
            renderer.renderer_.setRenderTarget(renderer.target);
            renderer.renderer_.clear();
            renderer.renderer_.render(renderer.scene, renderer.camera);
            renderer.renderer_.shadowMap.enabled = false;
            renderer.renderer_.setRenderTarget(null);
            renderer.renderer_.clear();
            renderer.renderer_.render(renderer.scene2, renderer.camera2);
        }
        else {
            renderer.renderer_.shadowMap.enabled = true;
            renderer.renderer_.setRenderTarget(null);
            renderer.renderer_.clear();
            renderer.renderer_.render(renderer.scene, renderer.camera);
        }
    }
    renderer.render = render;
})(renderer || (renderer = {}));
export default renderer;
