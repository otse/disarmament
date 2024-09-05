import pts from "../lib/pts.js";
import renderer from "../renderer.js";
import vr from "./vr.js";
let floorIntersect;
let tempMatrix, raycaster;
export class ctrlr {
    index;
    controller;
    grip;
    hand;
    xrinputsource;
    constructor(index = 1) {
        this.index = index;
        this.controller = renderer.renderer.xr.getController(index);
        // console.log(' hunt ctrlr controller', this.controller);
        const that = this;
        this.controller.addEventListener('connected', function (event) {
            this.add(buildController(event.data));
            that.xrinputsource = event;
            console.log(' hunt xrinputsource', that.xrinputsource);
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
        ///const handModelFactory = new XRHandModelFactory();
        // this creates a quest 2 controller with the tracking ring
        // it can also make a black rift s controller
        this.grip = renderer.renderer.xr.getControllerGrip(index);
        this.grip.add(controllerModelFactory.createControllerModel(this.grip));
        //console.log(' ctrlr grip', this.grip);
        renderer.cameraGroup.add(this.grip);
        this.grip.addEventListener("connected", (e) => {
            //console.warn(' hunt vr gamepad', e.data.gamepad)
            //console.warn(' axes', this.grip.data.gamepad.axes[3]);
        });
        //this.hand = renderer.renderer.xr.getHand(index);
        ///this.hand.add(handModelFactory.createHandModel(this.hand));
        //renderer.scene.add(this.hand);
        this.controller.addEventListener('selectstart', onSelectStart);
        this.controller.addEventListener('selectend', onSelectEnd);
        this.controller.addEventListener('squeeze', onSqueeze);
        this.controller.addEventListener('squeezestart', onSqueezeStart);
        function onSelectStart() {
            this.userData.isSelecting = true;
        }
        function onSelectEnd() {
            this.userData.isSelecting = false;
            if (floorIntersect) {
                const offsetPosition = { x: -floorIntersect.x, y: -floorIntersect.y, z: -floorIntersect.z, w: 1 };
                renderer.cameraGroup.position.copy(offsetPosition);
                /*
                const offsetRotation = new THREE.Quaternion();
                const transform1 = new XRRigidTransform(offsetPosition, offsetRotation);

                const teleport = vr.baseReferenceSpace.getOffsetReferenceSpace(transform1);
                renderer.renderer.xr.setReferenceSpace(teleport);
                */
                //const transform = new XRRigidTransform(offsetPosition, offsetRotation);
                //const teleportSpaceOffset = vr.baseReferenceSpace.getOffsetReferenceSpace(transform);
                //renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);
                floorIntersect = undefined;
            }
        }
        function onSqueeze(event) {
            console.warn(' hunt ctrlr squeeze');
        }
        function onSqueezeStart(event) {
            console.warn(' hunt ctrlr squeezestart');
        }
    }
    teleport() {
        if (this.controller.userData.isSelecting === true) {
            tempMatrix.identity().extractRotation(this.controller.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            const intersects = raycaster.intersectObjects([vr.floor]); // renderer.scene.children, true
            if (intersects.length > 0) {
                floorIntersect = intersects[0].point;
            }
        }
        if (floorIntersect)
            vr.marker.position.copy(floorIntersect);
        vr.marker.visible = floorIntersect !== undefined;
    }
    snapping = false;
    thumstick_snap_turn() {
        if (!this.xrinputsource)
            return;
        const axes = this.xrinputsource.data.gamepad.axes;
        const buttons = this.xrinputsource.data.gamepad.buttons;
        let snap = false;
        // if (Math.abs(axes[2]) > 0.9 && !this.snapping) {
        if (buttons[0].touched && !this.snapping) {
            let quarterTurn = new THREE.Quaternion();
            const turn = Math.PI / 4;
            quarterTurn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
            renderer.cameraGroup.quaternion.multiply(quarterTurn);
            //renderer.cameraGroup.rotation.y = turn;
            renderer.cameraGroup.updateMatrix();
            renderer.cameraGroup._onChangeCallback(); // this is a hack
            this.snapping = true;
        }
        else if (!buttons[0].touched && this.snapping) {
            this.snapping = false;
        }
        return;
        if (snap) {
            const offsetPosition = new THREE.Vector3();
            const offsetRotation = new THREE.Quaternion();
            const transform = new XRRigidTransform(renderer.cameraGroup.position, offsetRotation);
            const thumbstickSpace = vr.baseReferenceSpace.getOffsetReferenceSpace(transform);
            renderer.renderer.xr.setReferenceSpace(thumbstickSpace);
        }
    }
    thumstick_move() {
        if (!this.xrinputsource)
            return;
        const axes = this.xrinputsource.data.gamepad.axes;
        let thumbstick = pts.make(axes[2] || 0, axes[3] || 0);
        thumbstick = pts.mult(thumbstick, .025);
        const arrayCamera = renderer.renderer.xr.getCamera();
        let quaternion = new THREE.Quaternion();
        quaternion.copy(arrayCamera.quaternion);
        //quaternion.copy(renderer.cameraGroup.quaternion);
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(quaternion);
        euler.x = 0;
        euler.z = 0;
        quaternion.setFromEuler(euler);
        const vector = new THREE.Vector3();
        vector.set(thumbstick[1], 0, thumbstick[0]);
        vector.applyQuaternion(quaternion);
        renderer.cameraGroup.position.add(vector);
        return;
        const offsetPosition = new THREE.Vector3();
        const offsetRotation = new THREE.Quaternion();
        const transform = new XRRigidTransform(offsetPosition, offsetRotation);
        const thumbstickSpace = vr.baseReferenceSpace.getOffsetReferenceSpace(transform);
        renderer.renderer.xr.setReferenceSpace(thumbstickSpace);
    }
    loop() {
        if (this.index == 0) {
            //this.teleport();
            this.thumstick_move();
        }
        if (this.index == 1) {
            this.thumstick_snap_turn();
        }
        //console.log(this.grip.data.gamepad);
    }
}
(function (ctrlr) {
    function boot() {
        tempMatrix = new THREE.Matrix4();
        raycaster = new THREE.Raycaster();
    }
    ctrlr.boot = boot;
})(ctrlr || (ctrlr = {}));
export default ctrlr;
