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
            console.warn(' glob xr true ');
            glob.xr = true;
            vr.baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();
            const offsetPosition = renderer.camera.position;
            const temp = new THREE.Vector3();
            //const offsetRotation = camera.rotation;
            const offsetRotation = renderer.camera.quaternion;
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
            console.warn(' glob xr false ');
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
        renderer.renderer.setAnimationLoop(animate);
    }
    vr.start = start;
    function animate() {
        //app.loop();
    }
    function loop() {
        leftController.loop();
        rightController.loop();
    }
    vr.loop = loop;
})(vr || (vr = {}));
export default vr;
