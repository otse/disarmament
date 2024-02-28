import audio from "./audio.js";
import hooks from "./lib/hooks.js";
import hunt from "./hunt.js";
import physics from "./physics.js";
import renderer from "./renderer.js";
var props;
(function (props) {
    props.wireframe_helpers = true; // broken
    function factory(object) {
        let prop;
        if (!object.name)
            return;
        const [kind, preset] = object.name.split('_');
        switch (kind) {
            case 'prop':
            case 'box':
                console.log(' new pbox ', kind, preset);
                prop = new pbox(object, {});
                break;
            case 'env':
            case 'sound':
                prop = new psound(object, {});
                break;
            case 'light':
                prop = new plight(object, {});
                break;
            case 'spotlight':
                prop = new pspotlight(object, {});
                break;
            case 'wall':
            case 'ground':
            case 'solid':
                prop = new pwallorsolid(object, {});
                break;
            case 'stairstep':
                prop = new pstairstep(object, {});
                break;
            case 'door':
                prop = new pdoor(object, {});
                break;
            case 'fan':
                prop = new pfan(object, {});
                break;
            case 'convex':
                console.log(' new convex ');
                prop = new pconvex(object, {});
            default:
        }
        if (prop) {
            prop.kind = kind;
            prop.preset = preset;
        }
        return prop;
    }
    props.factory = factory;
    function loop() {
        for (let prop of props.collection)
            prop.loop();
    }
    props.loop = loop;
    function clear() {
        const array = props.collection.slice(0);
        for (let prop of array)
            prop.lod();
        props.collection = [];
    }
    props.clear = clear;
    function take_collada_prop(prop) {
        // the prop is sitting in a rotated, scaled scene graph
        // set it apart
        const group = new THREE.Group();
        const object = prop.object;
        object.matrixWorld.decompose(group.position, group.quaternion, group.scale);
        // group scale is now 0.0254
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.quaternion.identity();
        object.updateMatrix();
        object.updateMatrixWorld(true);
        group.add(object);
        group.updateMatrix();
        group.updateMatrixWorld(true);
        renderer.propsGroup.add(group);
        function traversal(object) {
            object.geometry?.computeBoundingBox();
        }
        group.traverse(traversal);
        prop.group = group;
    }
    props.take_collada_prop = take_collada_prop;
    async function boot() {
        let url = 'lights.json';
        let response = await fetch(url);
        const arrSales = await response.json();
        props.presets_from_json = arrSales;
        console.log(props.presets_from_json);
        return arrSales;
    }
    props.boot = boot;
    props.collection = [];
    props.walls = [];
    props.sounds = [];
    props.boxes = [];
    props.lights = [];
    props.presets_from_json = {};
    class prop {
        object;
        parameters;
        build_debug_box = false;
        wiremesh;
        array = [];
        type;
        kind;
        preset;
        group;
        oldRotation;
        fbody;
        aabb;
        constructor(object, parameters) {
            this.object = object;
            this.parameters = parameters;
            this.type = 'ordinary prop';
            props.collection.push(this);
        }
        complete() {
            this.array.push(this);
            take_collada_prop(this);
            this.measure();
            if (this.build_debug_box)
                this.wiremesh = new wiremesh(this);
            this._finish();
        }
        _finish() {
        }
        _lod() {
        }
        _loop() {
        }
        loop() {
            this._loop();
        }
        lod() {
            // messy splices(!)
            props.collection.splice(props.collection.indexOf(this), 1);
            this.array.splice(this.array.indexOf(this), 1);
            this._lod();
            this.wiremesh?.lod();
            renderer.propsGroup.remove(this.group);
            if (this.fbody)
                this.fbody.lod();
        }
        measure() {
            this.object.updateMatrix();
            // this includes the lazy z-up to y-up ?
            this.aabb = new THREE.Box3();
            this.aabb.setFromObject(this.group, true);
        }
        correction_for_physics() {
            // this method is called by fbody after measure
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(2);
            // because of parent transforms, the box is scaled by 0.0254
            // bring it up to 1 / 0.0254 so we reenter render space
            size.multiplyScalar(hunt.inchMeter);
            this.object.rotation.set(-Math.PI / 2, 0, 0);
            this.object.position.set(-size.x, -size.y, size.z);
            //this.object.updateMatrix();
            //this.object.updateMatrixWorld(true);
        }
    }
    props.prop = prop;
    class pwallorsolid extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pwallorsolid';
            this.array = props.walls;
        }
        _finish() {
            new physics.fbox(this);
            if (this.object.name != 'solid')
                this.object.visible = false;
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
        }
        _loop() {
        }
    }
    props.pwallorsolid = pwallorsolid;
    class pstairstep extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pstairstep';
            this.array = props.walls;
            //this.build_debug_box = true;
        }
        _finish() {
            console.log('finish stairstep');
            new physics.fstairstep(this);
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
            //this.object.visible = false;
        }
        _loop() {
        }
    }
    props.pstairstep = pstairstep;
    class wiremesh {
        prop;
        mesh;
        constructor(prop) {
            this.prop = prop;
            this.add_wire_mesh_to_prop_group();
        }
        lod() {
            //this.prop.group.remove(this.mesh);
        }
        add_wire_mesh_to_prop_group() {
            if (!props.wireframe_helpers)
                return;
            console.log('add helper aabb');
            const size = new THREE.Vector3();
            this.prop.aabb.getSize(size);
            size.multiplyScalar(hunt.inchMeter);
            const material = new THREE.MeshLambertMaterial({ color: 'red', wireframe: true });
            const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            this.mesh = new THREE.Mesh(boxGeometry, material);
            this.prop.group.add(this.mesh);
        }
        recolor(color) {
            this.mesh.material.color = new THREE.Color(color);
        }
    }
    props.wiremesh = wiremesh;
    class pbox extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pbox';
            this.array = props.boxes;
            this.build_debug_box = false;
        }
        _finish() {
            new physics.fbox(this);
        }
        _loop() {
            this.fbody.loop();
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
        }
        _lod() {
        }
    }
    props.pbox = pbox;
    class pconvex extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pconvex';
            this.array = props.boxes;
            this.build_debug_box = false;
            this.object.visible = false;
        }
        _finish() {
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.multiplyScalar(hunt.inchMeter);
            this.object.position.z -= size.z;
            new physics.fconvex(this);
        }
        _loop() {
            this.fbody.loop();
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
        }
        _lod() {
        }
    }
    props.pconvex = pconvex;
    class psound extends prop {
        sound;
        _lod() {
            if (this.sound) {
                this.sound.stop();
            }
        }
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'psound';
            this.array = props.sounds;
            const paly = () => {
                if (this.kind == 'env')
                    this._play();
            };
            hooks.register('audioGestured', (x) => {
                console.warn('late playing', this.preset);
                const preset = props.presets_from_json[this.preset];
                if (!preset)
                    return;
                if (preset.delay)
                    setTimeout(paly, preset.delay[0] + preset.delay[1] * Math.random() * 1000);
                else
                    paly();
                return false;
            });
        }
        _finish() {
            this.object.visible = false;
            this._play();
        }
        _loop() {
        }
        _play() {
            if (!audio.allDone)
                return;
            const preset = props.presets_from_json[this.preset];
            if (!preset)
                return;
            this.sound = audio.playOnce(preset.name, preset.volume, preset.loop);
            if (this.sound) {
                const panner = this.sound.getOutput();
                panner.distanceModel = 'exponential';
                panner.rolloffFactor = 4;
                panner.panningModel = 'HRTF';
                this.sound.setRefDistance(preset.distance);
                this.group.add(this.sound);
            }
        }
    }
    props.psound = psound;
    class pfan extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pfan';
        }
        _finish() {
            //this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            this.aabb.getSize(size);
            this.aabb.getCenter(center);
            const temp = new THREE.Vector3(size.x, size.z, size.y);
            temp.multiplyScalar(hunt.inchMeter);
            size.divideScalar(2);
            size.z = -size.z;
            if (this.preset == 'y') {
            }
            if (this.preset == 'z') {
            }
            this.object.position.sub(temp.divideScalar(2));
            this.group.position.add(size);
            //size.divideScalar(2);
            //this.object.position.sub(size);
            //this.object.position.add(size);
        }
        _loop() {
            if (this.preset == 'y')
                this.group.rotation.z += 0.005;
            if (this.preset == 'z')
                this.group.rotation.y += 0.005;
            this.group.updateMatrix();
        }
    }
    props.pfan = pfan;
    class pdoor extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pdoor';
        }
        _finish() {
            new physics.fdoor(this);
            //this.object.add(new THREE.AxesHelper(20));
            //this.group.add(new THREE.AxesHelper(20));
        }
        _loop() {
            this.fbody.loop();
            this.group.position.copy(this.fbody.body.position);
            this.group.quaternion.copy(this.fbody.body.quaternion);
        }
    }
    props.pdoor = pdoor;
    class plight extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'plight';
            this.array = props.lights;
        }
        _finish() {
            //this.object.visible = false;
            const preset = props.presets_from_json[this.preset || 'none'];
            if (!preset) {
                console.log(' preset no def ', this.preset);
                return;
            }
            this.object.visible = !preset.hide;
            let size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(2.0);
            size.multiplyScalar(hunt.inchMeter);
            let light = new THREE.PointLight(preset.color, preset.intensity, preset.distance, preset.decay);
            light.castShadow = preset.shadow;
            //light.position.fromArray(preset.offset || [0, 0, 0]);
            light.position.add(size);
            // light.add(new THREE.AxesHelper(10));
            this.group.add(light);
        }
        _loop() {
        }
        _lod() {
        }
    }
    props.plight = plight;
    class pspotlight extends prop {
        spotlight;
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pspotlight';
            this.array = props.lights;
        }
        _finish() {
            const preset = props.presets_from_json[this.preset || 'none'];
            if (!preset) {
                console.warn(' preset no def ');
                return;
            }
            this.object.visible = !preset.hide;
            let size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(2.0);
            size.multiplyScalar(hunt.inchMeter);
            //console.log('light size, center', size, center);
            let light = new THREE.SpotLight(preset.color, preset.intensity, preset.distance, preset.decay);
            light.position.set(0, 0, 0);
            light.castShadow = preset.shadow;
            light.shadow.camera.far = 1000;
            light.angle = preset.angle || Math.PI / 3;
            light.penumbra = preset.penumbra || 0.0;
            if (preset.lensflare) {
                const lensflare = new Lensflare();
                const element = new LensflareElement(new THREE.TextureLoader().load('./assets/textures/flare1.png'), 20, 0, light.color);
                const element2 = new LensflareElement(new THREE.TextureLoader().load('./assets/textures/flare1.png'), 10, 0.05, light.color);
                lensflare.addElement(element);
                lensflare.addElement(element2);
                // Add lens flare to the light
                light.add(lensflare);
            }
            /*const flareMaterial = new THREE.SpriteMaterial({ map: new THREE.TextureLoader().load('./assets/textures/flare1.png'), blending: THREE.AdditiveBlending, transparent: true });
            const flareSprite = new THREE.Sprite(flareMaterial);
            const newSize = 10; // Set the new size you want
            flareSprite.scale.set(newSize, newSize, 1);
            light.add(flareSprite);*/
            //light.add(new THREE.AxesHelper(10));
            if (preset.target)
                light.target.position.add(new THREE.Vector3().fromArray(preset.target).multiplyScalar(4));
            light.target.position.add(size);
            //light.target.add(new THREE.AxesHelper(10));
            light.position.add(size);
            this.group.add(light);
            this.group.add(light.target);
            this.spotlight = light;
            //this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
        }
        _loop() {
        }
    }
    props.pspotlight = pspotlight;
    props.impact_sounds = {
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
