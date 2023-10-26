import app from "./app.js";
import hunt from "./hunt.js";
import physics from "./physics.js";
import pts from "./pts.js";
import renderer from "./renderer.js";
//import plc from "./plc.js";
// https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js
class player {
    plc;
    canJump;
    cannonBody;
    scope = this;
    constructor() {
        this.setup();
        this.createPhysics();
    }
    setup() {
        this.plc = new pointer_lock_controls(renderer.camera, renderer.renderer_.domElement);
        this.plc.enabled = true;
        this.plc.getObject().position.y = 1.5;
        const controler = this.plc;
        hunt.day_instructions.addEventListener('click', function () {
            controler.lock();
        });
        this.plc.addEventListener('lock', function () {
            console.log('lock');
            hunt.day_instructions.style.display = 'none';
            //blocker.style.display = 'none';
        });
        this.plc.addEventListener('unlock', function () {
            console.log('unlock');
            //blocker.style.display = 'block';
            hunt.day_instructions.style.display = '';
        });
        renderer.scene.add(this.plc.getObject());
    }
    createPhysics() {
        // Create a sphere
        const radius = 0.4;
        var sphereShape = new CANNON.Sphere(radius);
        var sphereBody = new CANNON.Body({ mass: 1, material: physics.materials.player });
        sphereBody.addShape(sphereShape);
        sphereBody.position.set(0, 1, 0);
        sphereBody.linearDamping = 0.95;
        sphereBody.angularDamping = 0.999;
        physics.world.addBody(sphereBody);
        this.cannonBody = sphereBody;
        const contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
        const upAxis = new CANNON.Vec3(0, 1, 0);
        this.cannonBody.addEventListener('collide', (event) => {
            const { contact } = event;
            // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
            // We do not yet know which one is which! Let's check.
            if (contact.bi.id === this.cannonBody.id) {
                // bi is the player body, flip the contact normal
                contact.ni.negate(contactNormal);
            }
            else {
                // bi is something else. Keep the normal as it is
                contactNormal.copy(contact.ni);
            }
            // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
            if (contactNormal.dot(upAxis) > 0.5) {
                // Use a "good" threshold value between 0 and 1 here!
                this.canJump = true;
            }
        });
        this.bodyVelocity = this.cannonBody.velocity;
    }
    force = 7.0;
    bodyVelocity;
    loop(delta) {
        if (this.plc.enabled === false)
            return;
        let inputVelocity = new THREE.Vector3();
        let x = 0, z = 0;
        if (app.prompt_key('w') && !app.prompt_key('s'))
            z = 1;
        if (app.prompt_key('s') && !app.prompt_key('w'))
            z = -1;
        if (app.prompt_key('a') && !app.prompt_key('d'))
            x = -1;
        if (app.prompt_key('d') && !app.prompt_key('a'))
            x = 1;
        if (app.prompt_key(' ') && this.canJump) {
            this.bodyVelocity.y = 10;
            this.canJump = false;
        }
        const force = this.force * delta;
        let angle = pts.angle([0, 0], [x, z]);
        const camera = this.plc.getObject();
        const euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion);
        // set our pitch to 0 which is forward 
        // else our forward speed is 0 when looking down or up
        euler.x = 0;
        if (x || z) {
            x = force * Math.sin(angle);
            z = force * Math.cos(angle);
            inputVelocity.x = x;
            inputVelocity.z = z;
        }
        let quat = new THREE.Quaternion().setFromEuler(euler);
        inputVelocity.applyQuaternion(quat);
        // Add to the object
        this.bodyVelocity.x += inputVelocity.x;
        this.bodyVelocity.z += inputVelocity.z;
        this.plc.getObject().position.copy(this.cannonBody.position);
        this.plc.getObject().position.add(new THREE.Vector3(0, 1, 0));
    }
}
export default player;
