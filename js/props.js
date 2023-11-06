import hunt from "./hunt.js";
import physics from "./physics.js";
import renderer from "./renderer.js";
var props;
(function (props_1) {
    function factory(object) {
        let prop;
        if (!object.name)
            return;
        const [kind, preset] = object.name.split('_');
        switch (kind) {
            case 'prop':
            case 'box':
                console.log('new pbox', kind, preset);
                prop = new pbox(object, {});
                break;
            case 'light':
                prop = new plight(object, {});
                break;
            case 'wall':
            case 'solid':
                prop = new pwallorsolid(object, {});
                break;
            case 'door':
                prop = new pdoor(object, {});
                break;
            case 'fan':
                prop = new pfan(object, {});
                break;
            default:
        }
        if (prop) {
            prop.kind = kind;
            prop.preset = preset;
        }
        return prop;
    }
    props_1.factory = factory;
    function boot() {
    }
    props_1.boot = boot;
    function loop() {
        for (let prop of props_1.props)
            prop.loop();
    }
    props_1.loop = loop;
    function take_collada_prop(prop) {
        // the prop is sitting in a rotated, scaled scene graph
        // set it apart
        prop.group = new THREE.Group();
        prop.object.matrixWorld.decompose(prop.group.position, prop.group.quaternion, prop.group.scale);
        prop.object.position.set(0, 0, 0);
        prop.object.rotation.set(0, 0, 0);
        prop.object.quaternion.identity();
        prop.object.updateMatrix();
        prop.object.updateMatrixWorld();
        prop.group.add(prop.object);
        prop.group.updateMatrix();
        prop.group.updateMatrixWorld();
        renderer.propsGroup.add(prop.group);
        function traversal(object) {
            object.geometry?.computeBoundingBox();
        }
        prop.object.traverse(traversal);
    }
    props_1.take_collada_prop = take_collada_prop;
    props_1.props = [];
    class prop {
        object;
        parameters;
        type;
        preset;
        kind;
        oldRotation;
        group;
        master;
        fbody;
        aabb;
        constructor(object, parameters) {
            this.object = object;
            this.parameters = parameters;
            props_1.props.push(this);
            this.type = 'ordinary prop';
        }
        complete() {
            take_collada_prop(this);
            this.measure();
            this.finish();
        }
        finish() {
        }
        loop() {
        }
        void() {
        }
        measure() {
            this.aabb = new THREE.Box3();
            this.aabb.setFromObject(this.group, true);
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.multiplyScalar(hunt.inchMeter);
        }
        correction_for_physics() {
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.multiplyScalar(hunt.inchMeter);
            this.object.rotation.set(-Math.PI / 2, 0, 0);
            this.object.position.set(-size.x / 2, -size.y / 2, size.z / 2);
        }
    }
    props_1.prop = prop;
    class pwallorsolid extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pwallorsolid';
        }
        finish() {
            new physics.fbox(this);
            if (this.object.name == 'wall')
                this.object.visible = false;
        }
        loop() {
        }
    }
    props_1.pwallorsolid = pwallorsolid;
    class pbox extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pbox';
        }
        finish() {
            new physics.fbox(this);
        }
        loop() {
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
            this.fbody.loop();
        }
    }
    props_1.pbox = pbox;
    class pfan extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pfan';
        }
        finish() {
            this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
            //this.group.rotation.z += 0.02;
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            this.aabb.getSize(size);
            this.aabb.getCenter(center);
            const temp = new THREE.Vector3(size.x, size.z, size.y);
            temp.multiplyScalar(hunt.inchMeter);
            size.divideScalar(2);
            size.z = -size.z;
            this.object.position.sub(temp.divideScalar(2));
            this.group.position.add(size);
            //size.divideScalar(2);
            //this.object.position.sub(size);
            //this.object.position.add(size);
        }
        loop() {
            this.group.rotation.z += 0.005;
            this.group.updateMatrix();
        }
    }
    props_1.pfan = pfan;
    class pdoor extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pdoor';
        }
        finish() {
            new physics.fdoor(this);
            //this.object.add(new THREE.AxesHelper(20));
            //this.group.add(new THREE.AxesHelper(20));
        }
        loop() {
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
            this.fbody.loop();
        }
    }
    props_1.pdoor = pdoor;
    const light_presets = {
        sconce: { hide: false, color: 'white', intensity: 0.1, distance: 1, offset: [0, 0, -5] },
        sconce1: { hide: true, color: 'white', intensity: 0.1, distance: 2.0, decay: 0.1 },
        openwindow: { hide: true, color: 'white', intensity: 0.5, distance: 3, decay: 0.3 },
        skylightstart: { hide: true, color: 'white', intensity: 0.3, distance: 4.0, decay: 0.5 },
        mtfanambient: { hide: true, color: 'white', intensity: 0.1, distance: 4.0, decay: 0.2 },
        skirt: { hide: true, color: 'green', intensity: 0.2, distance: 0.8, decay: 1.0 },
        alert: { hide: true, color: 'red', intensity: 0.05, distance: 1.0, decay: 0.6 },
        none: { hide: true, color: 'white', intensity: 0.1, distance: 10 }
    };
    class plight extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'plight';
        }
        finish() {
            //this.object.visible = false;
            const preset = light_presets[this.preset || 'none'];
            this.object.visible = !preset.hide;
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            this.aabb.getSize(size);
            this.aabb.getCenter(center);
            size.multiplyScalar(hunt.inchMeter);
            //console.log('light size, center', size, center);
            let light = new THREE.PointLight(preset.color, preset.intensity, preset.distance, preset.decay);
            light.position.fromArray(preset.offset || [0, 0, 0]);
            light.position.add(size.divideScalar(2.0));
            //this.group.add(new THREE.AxesHelper(10));
            this.group.add(light);
        }
        loop() {
        }
    }
    props_1.plight = plight;
    props_1.impact_sounds = {
        'cardboard': {
            soft: [
                'cardboard_box_impact_soft1',
                'cardboard_box_impact_soft2',
                'cardboard_box_impact_soft3',
                'cardboard_box_impact_soft4',
                'cardboard_box_impact_soft5',
                'cardboard_box_impact_soft6',
                'cardboard_box_impact_soft7',
            ],
            hard: [
                'cardboard_box_impact_hard1',
                'cardboard_box_impact_hard2',
                'cardboard_box_impact_hard3',
                'cardboard_box_impact_hard4',
                'cardboard_box_impact_hard5',
                'cardboard_box_impact_hard6',
                'cardboard_box_impact_hard7',
            ]
        },
        'plastic': {
            soft: [
                'plastic_box_impact_soft1',
                'plastic_box_impact_soft2',
                'plastic_box_impact_soft3',
                'plastic_box_impact_soft4',
            ],
            hard: [
                'plastic_box_impact_hard1',
                'plastic_box_impact_hard2',
                'plastic_box_impact_hard3',
                'plastic_box_impact_hard4',
            ]
        },
        'metal': {
            soft: [
                'metal_solid_impact_soft1',
                'metal_solid_impact_soft2',
                'metal_solid_impact_soft3',
            ],
            hard: [
                'metal_solid_impact_hard1',
                'metal_solid_impact_hard4',
                'metal_solid_impact_hard5',
            ],
        }
    };
})(props || (props = {}));
export default props;
