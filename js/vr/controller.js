import renderer from "../renderer.js";
import vr from "./vr.js";
let INTERSECTION;
let tempMatrix, raycaster;
export class controller {
    index;
    controller;
    grip;
    hand;
    constructor(index = 1) {
        this.index = index;
        this.controller = renderer.renderer.xr.getController(index);
        this.controller.addEventListener('connected', function (event) {
            this.add(buildController(event.data));
        });
        this.controller.addEventListener('disconnected', function () {
            this.remove(this.children[0]);
        });
        function buildController(data) {
            let geometry, material;
            switch (data.targetRayMode) {
                case 'tracked-pointer':
                    geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
                    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
                    material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });
                    return new THREE.Line(geometry, material);
                case 'gaze':
                    geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                    material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
                    return new THREE.Mesh(geometry, material);
            }
        }
        renderer.scene.add(this.controller);
        const controllerModelFactory = new XRControllerModelFactory();
        const handModelFactory = new XRHandModelFactory();
        // this creates a quest 2 controller with the tracking ring
        // it can also make a black rift s controller
        this.grip = renderer.renderer.xr.getControllerGrip(0);
        this.grip.add(controllerModelFactory.createControllerModel(this.grip));
        renderer.scene.add(this.grip);
        this.grip.addEventListener("connected", (e) => {
            console.warn(' hunt vr gamepad', e.data.gamepad);
            //console.warn(' axes', this.grip.data.gamepad.axes[3]);
        });
        this.hand = renderer.renderer.xr.getHand(0);
        this.hand.add(handModelFactory.createHandModel(this.hand));
        renderer.scene.add(this.hand);
        this.controller.addEventListener('selectstart', onSelectStart);
        this.controller.addEventListener('selectend', onSelectEnd);
        function onSelectStart() {
            this.userData.isSelecting = true;
        }
        function onSelectEnd() {
            this.userData.isSelecting = false;
            if (INTERSECTION) {
                const offsetPosition = { x: -INTERSECTION.x, y: -INTERSECTION.y, z: -INTERSECTION.z, w: 1 };
                const offsetRotation = new THREE.Quaternion();
                const transform = new XRRigidTransform(offsetPosition, offsetRotation);
                const teleportSpaceOffset = vr.baseReferenceSpace.getOffsetReferenceSpace(transform);
                renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);
            }
        }
    }
    loop() {
        if (this.controller.userData.isSelecting === true) {
            tempMatrix.identity().extractRotation(this.controller.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            const intersects = raycaster.intersectObjects([vr.floor]); // renderer.scene.children, true
            if (intersects.length > 0) {
                INTERSECTION = intersects[0].point;
            }
        }
        if (INTERSECTION)
            vr.marker.position.copy(INTERSECTION);
        vr.marker.visible = INTERSECTION !== undefined;
    }
}
(function (controller) {
    function boot() {
        tempMatrix = new THREE.Matrix4();
        raycaster = new THREE.Raycaster();
    }
    controller.boot = boot;
})(controller || (controller = {}));
export default controller;
