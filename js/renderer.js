import glob from "./glob.js";
import app from "./app.js";
import easings from "./easings.js";
import pts from "./pts.js";
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
    const render_target_factor = 1;
    renderer_1.dt = 0;
    renderer_1.tarrt = null;
    renderer_1.sunOffset = [0, 10, 0]; // sunOffset = [1.0, 10, -1.0]
    // reduce
    renderer_1.enable_post = false;
    renderer_1.animate_post = false;
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
        renderer_1.post = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: renderer_1.target.texture },
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
        renderer_1.glitch = 0;
        renderer_1.plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
        renderer_1.quad = new THREE.Mesh(renderer_1.plane, renderer_1.post);
        renderer_1.quad.matrixAutoUpdate = false;
        //scene2.add(quad);
        const _geometry = new THREE.BufferGeometry();
        _geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
        _geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
        renderer_1.quad2 = new THREE.Mesh(_geometry, renderer_1.post);
        renderer_1.scene2.add(renderer_1.quad2);
        renderer_1.glitch = 0;
        renderer_1.hdr = 0;
        redo();
        renderer_1.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const helper = new THREE.AxesHelper(1);
        renderer_1.scene.add(helper);
        renderer_1.camera.position.z = 5;
        const dpi = window.devicePixelRatio;
        renderer_1.renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer_1.renderer.xr.enabled = true;
        renderer_1.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer_1.renderer.toneMappingExposure = 2.5;
        renderer_1.renderer.setPixelRatio(dpi);
        renderer_1.renderer.setSize(window.innerWidth, window.innerHeight);
        renderer_1.renderer.shadowMap.enabled = true;
        renderer_1.renderer.shadowMap.type = THREE.BasicShadowMap;
        renderer_1.renderer.setClearColor(0xffffff, 0.0);
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
    function redo() {
        const wh = pts.make(window.innerWidth, window.innerHeight);
        const rescale = pts.divide(wh, render_target_factor);
        renderer_1.target.setSize(rescale[0], rescale[1]);
        renderer_1.quad.geometry = new THREE.PlaneGeometry(wh[0], wh[1]);
        renderer_1.camera2 = new THREE.OrthographicCamera(wh[0] / -2, wh[0] / 2, wh[1] / 2, wh[1] / -2, -100, 100);
        renderer_1.camera2.updateProjectionMatrix();
        renderer_1.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    function resize() {
        redo();
        renderer_1.renderer.setSize(window.innerWidth, window.innerHeight);
        //camera.aspect = window.innerWidth / window.innerHeight;
        //camera.updateProjectionMatrix();
        //render();
    }
    renderer_1.resize = resize;
    var prevTime = 0, time = 0, frames = 0;
    renderer_1.fps = 0;
    function loop() {
        if (glob.developer) {
            if (glob.z == 1)
                renderer_1.enable_post = !renderer_1.enable_post;
            if (glob.x == 1)
                renderer_1.animate_post = !renderer_1.animate_post;
            if (glob.h == 1) {
                renderer_1.ren_stats = !renderer_1.ren_stats;
                app.fluke_set_style('hunt-stats', 'visibility', renderer_1.ren_stats ? '' : 'hidden');
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
					render target scale: ${(1 / render_target_factor).toFixed(1)}
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
            if (renderer_1.animate_post) {
                let itch = easings.easeOutBounce(renderer_1.glitch <= 1 ? renderer_1.glitch : 2 - renderer_1.glitch);
                renderer_1.post.uniforms.glitch.value = itch;
                renderer_1.post.uniforms.saturation.value = 1 + itch;
                //let ease = easings.easeOutBounce(bounce);
                //post.uniforms.bounce.value = ease;
            }
            else {
                renderer_1.post.uniforms.glitch.value = 1;
                renderer_1.post.uniforms.saturation.value = 2.0;
            }
            renderer_1.post.uniforms.toneMappingExposure2.value = 3.0;
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
            const xrEnabled = renderer_1.renderer.xr.enabled;
            //renderer.xr.enabled = false;
            renderer_1.renderer.setRenderTarget(renderer_1.tarrt);
            renderer_1.renderer.clear();
            renderer_1.renderer.render(renderer_1.scene2, renderer_1.camera2);
            //renderer.xr.enabled = xrEnabled;
            renderer_1.renderer.setRenderTarget(null);
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
            renderer_1.renderer.render(renderer_1.scene, renderer_1.camera);
        }
    }
    renderer_1.render = render;
})(renderer || (renderer = {}));
export default renderer;
