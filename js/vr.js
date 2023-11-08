import app from "./app.js";
import glob from "./glob.js";
import hooks from "./hooks.js";
import renderer from "./renderer.js";
var vr;
(function (vr) {
    let baseReferenceSpace;
    let controller2;
    let controllerGrip1, controllerGrip2;
    let INTERSECTION;
    let floor, marker;
    let tempMatrix;
    let raycaster;
    function boot() {
        let button = VRButton.createButton(renderer.renderer);
        console.log(' button ', button);
        document.body.appendChild(button);
        renderer.renderer.xr.addEventListener('sessionstart', () => {
            console.warn(' glob xr true ');
            glob.xr = true;
            baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();
            hooks.call('xrStart', 1);
        });
        renderer.renderer.xr.addEventListener('sessionend', () => {
            console.warn(' glob xr false ');
            glob.xr = false;
            hooks.call('xrEnd', 1);
        });
        function onSelectStart() {
            this.userData.isSelecting = true;
        }
        function onSelectEnd() {
            this.userData.isSelecting = false;
            if (INTERSECTION) {
                const offsetPosition = { x: -INTERSECTION.x, y: -INTERSECTION.y, z: -INTERSECTION.z, w: 1 };
                const offsetRotation = new THREE.Quaternion();
                const transform = new XRRigidTransform(offsetPosition, offsetRotation);
                const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);
                renderer.renderer.xr.setReferenceSpace(teleportSpaceOffset);
            }
        }
        marker = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbcbcbc }));
        renderer.scene.add(marker);
        floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbcbcbc, transparent: true, opacity: 0.25 }));
        floor.visible = false;
        renderer.scene.add(floor);
        tempMatrix = new THREE.Matrix4();
        raycaster = new THREE.Raycaster();
        controller2 = renderer.renderer.xr.getController(1);
        controller2.addEventListener('selectstart', onSelectStart);
        controller2.addEventListener('selectend', onSelectEnd);
        controller2.addEventListener('connected', function (event) {
            this.add(buildController(event.data));
        });
        controller2.addEventListener('disconnected', function () {
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
        renderer.scene.add(controller2);
        const controllerModelFactory = new XRControllerModelFactory();
        const handModelFactory = new XRHandModelFactory();
        // this creates a quest 2 controller with the tracking ring
        // it can also make a black rift s controller
        controllerGrip1 = renderer.renderer.xr.getControllerGrip(0);
        controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
        renderer.scene.add(controllerGrip1);
        controllerGrip1.addEventListener("connected", (e) => {
            console.warn(' hunt vr gamepad', e.data.gamepad);
        });
        let hand1 = renderer.renderer.xr.getHand(0);
        hand1.add(handModelFactory.createHandModel(hand1));
        renderer.scene.add(hand1);
    }
    vr.boot = boot;
    function start() {
        renderer.renderer.setAnimationLoop(animate);
    }
    vr.start = start;
    function animate() {
        app.loop();
    }
    function loop() {
        if (controller2.userData.isSelecting === true) {
            tempMatrix.identity().extractRotation(controller2.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            const intersects = raycaster.intersectObjects([floor]); // renderer.scene.children, true
            if (intersects.length > 0) {
                INTERSECTION = intersects[0].point;
            }
        }
        if (INTERSECTION)
            marker.position.copy(INTERSECTION);
        marker.visible = INTERSECTION !== undefined;
    }
    vr.loop = loop;
})(vr || (vr = {}));
export default vr;
