/// Paint vertices to transition two textures
import { hooks } from "../lib/hooks.js";
import tunnels from "./tunnels.js";
import renderer from "../renderer.js";
import app from "../app.js";
import glob from "../lib/glob.js";
var attribrush;
(function (attribrush) {
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
        for (const tunnel of tunnels.tunnels) {
            const { object } = tunnel;
        }
        detectNearestVertices(glob.levelGroup);
        return false;
    }
    var gcone, gball;
    function createCone() {
        const geometry = new THREE.ConeGeometry(0.1, 0.2, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const cone = new THREE.Mesh(geometry, material);
        gcone = cone;
        cone.position.set(0, 0, 0);
        cone.updateMatrix();
        glob.scene.add(cone);
    }
    function createBall() {
        const geometry = new THREE.SphereGeometry(0.05, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const ball = new THREE.Mesh(geometry, material);
        gball = ball;
        ball.position.set(0, 0, 0);
        ball.updateMatrix();
        glob.scene.add(ball);
    }
    function detectNearestVertices(object3D) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const pos = app.mousepos();
        mouse.set(pos[0], pos[1]);
        // Convert mouse coordinates to normalized device coordinates
        mouse.x = (mouse.x / window.innerWidth) * 2 - 1;
        mouse.y = -(mouse.y / window.innerHeight) * 2 + 1;
        // Set the raycaster from the camera to the mouse position
        raycaster.setFromCamera(mouse, renderer.camera); // Ensure 'camera' is defined in your context
        // Calculate objects intersecting the ray
        const intersects = raycaster.intersectObject(object3D, true);
        if (intersects.length > 0) {
            const int = intersects[0];
            const point = int.point;
            collectWorldVertices(intersects);
            if (!int.face || !int.object)
                return;
            const localNormal = int.face.normal.clone();
            localNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(int.object.matrixWorld)).normalize();
            const coneDirection = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(coneDirection, localNormal.negate());
            gcone.quaternion.copy(quaternion);
            gcone.position.copy(point);
            gcone.updateMatrix();
            //console.log('Nearest Vertex:', nearestVertex);
            const worldVertices = collectWorldVertices(intersects);
            let nearestVertex = null;
            let minDistance = Infinity;
            for (const vertex of worldVertices) {
                const distance = vertex.distanceTo(point);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestVertex = vertex;
                }
            }
            if (nearestVertex) {
                gball.position.copy(nearestVertex);
                gball.updateMatrix();
            }
            return point;
        }
        return null;
    }
    function collectWorldVertices(intersects) {
        const nearestVertices = []; // Array to hold nearest vertices
        for (const int of intersects) {
            const geometry = int.object.geometry; // Get the geometry of the intersected object
            const worldMatrix = int.object.matrixWorld; // Get the world matrix
            // Loop through all vertices in the geometry
            geometry.attributes.position.array.forEach((_, index) => {
                if (index % 3 === 0) { // Ensure we are at the start of a vertex (x, y, z)
                    const vertex = new THREE.Vector3(geometry.attributes.position.array[index], geometry.attributes.position.array[index + 1], geometry.attributes.position.array[index + 2]);
                    vertex.applyMatrix4(worldMatrix); // Transform the vertex by the world matrix
                    nearestVertices.push(vertex); // Collect transformed vertex
                }
            });
        }
        return nearestVertices;
    }
})(attribrush || (attribrush = {}));
const validate = attribrush;
export default attribrush;
