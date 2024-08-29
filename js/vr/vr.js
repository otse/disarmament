import glob from "../lib/glob.js";
import hooks from "../lib/hooks.js";
import renderer from "../renderer.js";
import ctrlr from "./controller.js";
var vr;
(function (vr) {
    let rightController;
    let leftController;
    let controllerGrip1, controllerGrip2;
    let INTERSECTION;
    function boot() {
        ctrlr.boot();
        vr.position = new THREE.Vector3();
        let button = VRButton.createButton(renderer.renderer);
        console.log(' button ', button);
        document.body.appendChild(button);
        renderer.renderer.xr.addEventListener('sessionstart', () => {
            glob.xr = true;
            vr.baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();
            const offsetPosition = renderer.camera.position;
            const offsetRotation = renderer.camera.quaternion;
            const temp = new THREE.Vector3();
            const transform = new XRRigidTransform(temp, {
                x: offsetRotation.x,
                y: -offsetRotation.y,
                z: offsetRotation.z,
                w: offsetRotation.w
            });
            const teleportSpaceOffset = vr.baseReferenceSpace.getOffsetReferenceSpace(transform);
            renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);
            hooks.call('xrStart', 1);
        });
        renderer.renderer.xr.addEventListener('sessionend', () => {
            glob.xr = false;
            hooks.call('xrEnd', 1);
        });
        vr.marker = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbcbcbc }));
        renderer.scene.add(vr.marker);
        vr.floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbcbcbc, transparent: true, opacity: 0.25 }));
        vr.floor.visible = false;
        renderer.scene.add(vr.floor);
        leftController = new ctrlr(0);
        rightController = new ctrlr(1);
    }
    vr.boot = boot;
    function start() {
        renderer.renderer.xr.addEventListener('sessionstart', () => {
            //renderer.ambiance.intensity = 2;
            //app.blockable.stop();
            //renderer.renderer.setAnimationLoop( app.base_loop );
        });
        renderer.renderer.xr.addEventListener('sessionend', () => {
            //renderer.ambiance.intensity = 1;
        });
    }
    vr.start = start;
    function animate() {
        //app.blockable = renderer.renderer.setAnimationLoop( app.base_loop ); // <---
        //app.loop();
    }
    function loop() {
        leftController.loop();
        rightController.loop();
    }
    vr.loop = loop;
})(vr || (vr = {}));
export default vr;
