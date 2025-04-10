/// Paint vertices to transition two textures
import { hooks } from "../lib/hooks.js";
import tunnels from "./tunnels.js";
import renderer from "../renderer.js";
import app from "../app.js";
import glob from "../lib/glob.js";
var attribrush;
(function (attribrush) {
    var enabled = false;
    const privateProp = 'Zuc';
    attribrush.componentName = 'AttriBrush Component';
    async function boot() {
        console.log(' AttriBrush Boot ');
        hooks.placeListener('environmentReady', 0, loaded);
        hooks.placeListener('environmentCleanup', 0, clear);
        hooks.placeListener('garbageStep', 0, loop);
        createCone();
        createBall();
    }
    attribrush.boot = boot;
    async function loaded(scene) {
        console.log(`AttriBrush: There are ${tunnels.tunnels.length} tunnels.`);
        function findTunnels(object) {
            console.log('child objects');
        }
        for (const tunnel of tunnels.tunnels) {
            const { object } = tunnel;
        }
        scene.traverse(findTunnels);
        return false;
    }
    async function clear() {
        return false;
    }
    async function loop() {
        if (app.proompt('f2') == 1) {
            enabled = !enabled;
            gball.visible = enabled;
            gcone.visible = enabled;
            if (!enabled && currentVertexTuple)
                colorMaterialAtTuple(currentVertexTuple, '#fff');
        }
        for (const tunnel of tunnels.tunnels) {
            const { object } = tunnel;
        }
        detectNearestVertices(glob.levelGroup);
        return false;
    }
    var gcone, gball;
    function createCone() {
        const geometry = new THREE.ConeGeometry(0.05, 0.1, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const cone = new THREE.Mesh(geometry, material);
        cone.visible = enabled;
        glob.scene.add(cone);
        gcone = cone;
    }
    function createBall() {
        const geometry = new THREE.SphereGeometry(0.025, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const ball = new THREE.Mesh(geometry, material);
        ball.visible = enabled;
        glob.scene.add(ball);
        gball = ball;
    }
    function detectNearestVertices(object3D) {
        if (!enabled)
            return;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const pos = app.mousepos();
        mouse.set(pos[0], pos[1]);
        // Convert mouse coordinates to normalized device coordinates
        mouse.x = (mouse.x / window.innerWidth) * 2 - 1;
        mouse.y = -(mouse.y / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, renderer.camera);
        const intersects = raycaster.intersectObject(object3D, true);
        // The intersects array has doubles when hovering decals or cornerdamage props
        // Besides the static level geometry
        if (intersects.length > 0) {
            const int = intersects[0];
            const point = int.point;
            if (!int.face || !int.object)
                return;
            const localNormal = int.face.normal.clone();
            localNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(int.object.matrixWorld)).normalize();
            const coneDirection = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(coneDirection, localNormal.negate());
            gcone.quaternion.copy(quaternion);
            gcone.position.copy(point);
            gcone.updateMatrix();
            // Get the actual world vertex nearest to our Cone
            // We place a Ball here
            const vertices = collectVertices(intersects);
            let nearestDistance = Infinity;
            let nearestTupleToCone;
            for (const vertex of vertices) {
                const distance = vertex[3].distanceTo(point);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestTupleToCone = vertex;
                }
            }
            if (nearestTupleToCone) {
                gball.position.copy(nearestTupleToCone[3]);
                gball.updateMatrix();
                if (currentVertexTuple)
                    colorMaterialAtTuple(currentVertexTuple, '#fff');
                colorMaterialAtTuple(nearestTupleToCone, '#faeaff');
                currentVertexTuple = nearestTupleToCone;
            }
        }
    }
    var currentVertexTuple;
    // Taken all our intersections
    function collectVertices(intersects) {
        const vertices = [];
        for (const intersect of intersects) {
            const { object } = intersect;
            const { geometry, matrixWorld } = object;
            geometry.attributes.position.array.forEach((_, index) => {
                if (index % 3 === 0) {
                    const vertex = new THREE.Vector3(geometry.attributes.position.array[index], geometry.attributes.position.array[index + 1], geometry.attributes.position.array[index + 2]);
                    vertex.applyMatrix4(matrixWorld);
                    vertices.push([index, object, geometry, vertex]);
                }
            });
        }
        return vertices;
    }
    function colorMaterialAtTuple(vertexTuple, color = 'salmon') {
        const [, object] = vertexTuple;
        const sheen = new THREE.Color(color);
        object.traverse((child) => {
            if (child.material) {
                child.material.color.copy(sheen);
            }
        });
    }
})(attribrush || (attribrush = {}));
const validate = attribrush;
export default attribrush;
