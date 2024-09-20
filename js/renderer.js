import glob from "./lib/glob.js";
import app from "./app.js";
var renderer;
(function (renderer_1) {
    // set up three.js here
    renderer_1.dt = 0;
    renderer_1.sunOffset = [-2, 30, -2];
    renderer_1.headacheMode = false;
    renderer_1.statsEnabled = false;
    function boot() {
        window['renderer'] = this;
        console.log('renderer boot');
        THREE.ColorManagement.enabled = true;
        renderer_1.clock = new THREE.Clock();
        renderer_1.propsGroup = new THREE.Group();
        renderer_1.yawGroup = new THREE.Group();
        glob.propsGroup = renderer_1.propsGroup;
        renderer_1.scene = new THREE.Scene();
        renderer_1.scene.add(renderer_1.propsGroup);
        renderer_1.scene.add(renderer_1.yawGroup);
        renderer_1.scene.background = new THREE.Color('#333');
        RectAreaLightUniformsLib.init();
        let helepr = new THREE.AxesHelper();
        renderer_1.scene.add(helepr);
        renderer_1.scene.fog = new THREE.Fog(0x131c1d, 7, 20);
        renderer_1.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer_1.camera.rotation.y = -Math.PI / 2;
        renderer_1.yawGroup.add(renderer_1.camera);
        // yawGroup.add(new THREE.AxesHelper());
        // cameraGroup.add(renderer.xr.getCamera());
        renderer_1.yawGroup.updateMatrix();
        glob.camera = renderer_1.camera;
        glob.yawGroup = renderer_1.yawGroup;
        renderer_1.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer_1.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer_1.renderer.toneMappingExposure = 4.5;
        renderer_1.renderer.setPixelRatio(window.devicePixelRatio);
        renderer_1.renderer.setSize(window.innerWidth, window.innerHeight);
        if (glob.hasHeadset)
            renderer_1.renderer.setAnimationLoop(app.base_loop);
        renderer_1.renderer.xr.setFramebufferScaleFactor(1);
        renderer_1.renderer.shadowMap.enabled = true;
        renderer_1.maxAnisotropy = renderer_1.renderer.capabilities.getMaxAnisotropy();
        renderer_1.renderer.xr.enabled = true;
        renderer_1.renderer.xr.cameraAutoUpdate = false;
        renderer_1.renderer.shadowMap.type = THREE.BasicShadowMap;
        // renderer.setClearColor(0xffffff, 0.0);
        const percent = 1 / 100;
        renderer_1.ambiance = new THREE.AmbientLight(0xffffff, percent);
        renderer_1.scene.add(renderer_1.ambiance);
        renderer_1.sun = new THREE.DirectionalLight("pink", 0.5);
        renderer_1.sun.castShadow = false;
        renderer_1.sun.shadow.mapSize.width = 2048;
        renderer_1.sun.shadow.mapSize.height = 2048;
        renderer_1.sun.shadow.radius = 2;
        renderer_1.sun.shadow.bias = 0.0005;
        renderer_1.sun.shadow.camera.near = 0.5;
        renderer_1.sun.shadow.camera.far = 500;
        renderer_1.sun.shadow.camera.left = renderer_1.sun.shadow.camera.bottom = -15;
        renderer_1.sun.shadow.camera.right = renderer_1.sun.shadow.camera.top = 15;
        renderer_1.sun.position.fromArray(renderer_1.sunOffset);
        // scene.add(sun);
        // scene.add(sun.target);
        // scene.add(new THREE.CameraHelper(sun.shadow.camera));
        if (glob.hasHeadset) {
            renderer_1.statsEnabled = true;
            app.selector_style('salvage-stats', 'visibility', 'visible');
        }
        document.querySelector('salvage-body').appendChild(renderer_1.renderer.domElement);
        window.addEventListener('resize', onWindowResize);
    }
    renderer_1.boot = boot;
    function onWindowResize() {
        renderer_1.camera.aspect = window.innerWidth / window.innerHeight;
        renderer_1.camera.updateProjectionMatrix();
        renderer_1.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    renderer_1.onWindowResize = onWindowResize;
    var prevTime = 0, time = 0, frames = 0;
    renderer_1.fps = 0;
    function loop_and_render() {
        if (app.proompt('h') == 1) {
            renderer_1.statsEnabled = !renderer_1.statsEnabled;
            app.selector_style('salvage-stats', 'visibility', renderer_1.statsEnabled ? 'visible' : 'hidden');
        }
        renderer_1.dt = renderer_1.clock.getDelta();
        const min_dt = 1.0 / 10.0;
        renderer_1.dt = renderer_1.dt > min_dt ? min_dt : renderer_1.dt;
        frames++;
        time = (performance || Date).now();
        if (time >= prevTime + 1000) {
            renderer_1.fps = (frames * 1000) / (time - prevTime);
            prevTime = time;
            frames = 0;
            if (renderer_1.statsEnabled) {
                app.selector_innerhtml('salvage-stats', `
					fps: ${renderer_1.fps.toFixed(1)}<br />
					bounce hdr: ${(renderer_1.headacheMode)}<br />
			`);
            }
        }
        renderer_1.yawGroup.updateMatrix();
        renderer_1.yawGroup.updateMatrixWorld(true);
        renderer_1.yawGroup.updateWorldMatrix(false, true);
        renderer_1.renderer.xr.updateCamera(renderer_1.camera);
        renderer_1.renderer.render(renderer_1.scene, renderer_1.camera);
    }
    renderer_1.loop_and_render = loop_and_render;
})(renderer || (renderer = {}));
export default renderer;
