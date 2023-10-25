import glob from "./glob.js";
import app from "./app.js";
import sketchup from "./sketchup.js";
import easings from "./easings.js";
const fragmentPost = `
varying vec2 vUv;
uniform float glitch; 
uniform int compression;
uniform sampler2D tDiffuse;
float factor = 256.0;
float saturation = 2.0;

void main() {
	vec4 diffuse = texture2D( tDiffuse, vUv );

	factor -= glitch * 25.0;

	factor = clamp(factor, 2.0, 256.0);

	vec3 original = diffuse.rgb;
	vec3 lumaWeights = vec3(.25,.50,.25);
	vec3 grey = vec3(dot(lumaWeights, original));
	diffuse = vec4(grey + saturation * (original - grey), 1.0);

	diffuse = vec4(floor(diffuse.rgb * factor + 0.5) / factor, diffuse.a);

	gl_FragColor = diffuse;
	#include <colorspace_fragment>
}`;
const vertexScreen = `
varying vec2 vUv;
uniform float glitch;
uniform float bounce;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
var renderer;
(function (renderer) {
    // set up three.js here
    renderer.delta = 0;
    // i like the sketchup palette a lot,
    // no need for color reduce
    renderer.postToggle = false;
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
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter
        });
        renderer.post = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: renderer.target.texture },
                glitch: { value: 0.0 },
                bounce: { value: 0.0 },
                compression: { value: 1 }
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
        renderer.bounce = 0;
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
        renderer.ambiance = new THREE.AmbientLight(0xffffff, 1);
        renderer.scene.add(renderer.ambiance);
        let sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;
        const extend = 1000;
        sun.position.set(-30, 100, -150);
        sun.castShadow = true;
        renderer.scene.add(sun);
        renderer.scene.add(sun.target);
        const day_main = document.querySelector('day-main');
        day_main.appendChild(renderer.renderer_.domElement);
        // test
        window.addEventListener('resize', onWindowResize);
        sketchup.load_room();
    }
    renderer.boot = boot;
    function redo() {
        renderer.target.setSize(window.innerWidth, window.innerHeight);
        renderer.plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
        renderer.camera2 = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -100, 100);
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
        if (glob.developer)
            if (app.prompt_key('z') == 1)
                renderer.postToggle = !renderer.postToggle;
    }
    renderer.loop = loop;
    function render() {
        loop();
        renderer.delta = renderer.clock.getDelta();
        frames++;
        time = (performance || Date).now();
        if (time >= prevTime + 1000) {
            renderer.fps = (frames * 1000) / (time - prevTime);
            prevTime = time;
            frames = 0;
            app.fluke_set_innerhtml('day-stats', `fps: ${renderer.fps}`);
        }
        renderer.glitch += renderer.delta / 2.0;
        renderer.bounce += renderer.delta / 2.0;
        if (renderer.glitch >= 1)
            renderer.glitch -= 1;
        if (renderer.bounce >= 1)
            renderer.bounce -= 1;
        let ease = easings.easeOutBounce(renderer.bounce);
        renderer.post.uniforms.glitch.value = renderer.glitch;
        renderer.post.uniforms.bounce.value = ease;
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
        if (renderer.postToggle) {
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
