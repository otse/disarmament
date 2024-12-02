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
        makeVertexCone();
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
    var gcone;
    function makeVertexCone() {
        const geometry = new THREE.ConeGeometry(0.1, 0.2, 32); // Create a cone geometry
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Create a basic yellow material
        const cone = new THREE.Mesh(geometry, material); // Create a mesh with the geometry and material
        gcone = cone;
        // Set the position of the cone (optional)
        cone.position.set(0, 0, 0); // Adjust the position as needed
        cone.updateMatrix();
        // Add the cone to the scene (assuming you have access to the scene)
        // Replace 'scene' with your actual scene variable
        glob.scene.add(cone); // Ensure 'scene' is defined in your context
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
            const nearestVertex = int.point;
            if (!int.face)
                return;
            const localNormal = int.face.normal.clone();
            localNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(int.object.matrixWorld)).normalize();
            const coneDirection = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(coneDirection, localNormal.negate());
            gcone.quaternion.copy(quaternion);
            gcone.position.copy(nearestVertex);
            gcone.updateMatrix();
            gcone.updateMatrix();
            //console.log('Nearest Vertex:', nearestVertex);
            return nearestVertex;
        }
        return null;
    }
})(attribrush || (attribrush = {}));
const validate = attribrush;
export default attribrush;
