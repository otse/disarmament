import audio from "./audio.js";
import glob from "./lib/glob.js";
import hooks from "./lib/hooks.js";
import garbage from "./garbage.js";
import physics from "./physics.js";
import easings from "./easings.js";
import app from "./app.js";
import common from "./common.js";
import toggle from "./lib/toggle.js";
var props;
(function (props) {
    function factory(object) {
        let prop;
        if (!object.name)
            return;
        const [kind, preset, hint] = object.name.split('_');
        switch (kind) {
            case 'marker':
                prop = new pmarker(object, {});
                break;
            case 'prop':
                prop = new pprop(object, {});
                break;
            case 'box':
                console.log(' new pbox ', kind, preset);
                prop = new pbox(object, {});
                break;
            case 'env':
            case 'sound':
                prop = new psound(object, {});
                break;
            case 'light':
                prop = new ppointlight(object, {});
                break;
            case 'spotlight':
                prop = new pspotlight(object, {});
                break;
            case 'rectlight':
                prop = new prectlight(object, { axis: hint });
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
                prop = new pdoor(object, { rotation: hint });
                break;
            case 'fan':
                prop = new pfan(object, { rotation: hint });
                break;
            case 'convex':
                console.log(' new convex ');
                prop = new pconvex(object, {});
                break;
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
        // the prop is sitting in a rotated, scaled scene
        const group = new THREE.Group();
        const master = new THREE.Group();
        master.add(group);
        const object = prop.object;
        object.matrixWorld.decompose(master.position, group.quaternion, group.scale);
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.quaternion.identity();
        group.add(object);
        master.updateMatrix();
        master.updateMatrixWorld(true);
        // glob.propsGroup.add(master);
        group.traverse((object) => object.geometry?.computeBoundingBox());
        prop.master = master;
        prop.group = group;
    }
    props.take_collada_prop = take_collada_prop;
    function boot() {
        reload();
    }
    props.boot = boot;
    async function reload() {
        let url = './figs/glob.json';
        let response = await fetch(url);
        const arrSales = await response.json();
        props.presets = arrSales;
        console.log(props.presets);
        return arrSales;
    }
    props.reload = reload;
    props.collection = [];
    props.markers = [];
    props.walls = [];
    props.sounds = [];
    props.boxes = [];
    props.lights = [];
    props.presets = {};
    class prop extends toggle {
        object;
        parameters;
        debugBox;
        array = [];
        type;
        kind;
        preset;
        master;
        group;
        oldRotation;
        fbody;
        aabb;
        aabb2;
        constructor(object, parameters) {
            super();
            this.object = object;
            this.parameters = parameters;
            this.type = 'Illegal prop';
            props.collection.push(this);
        }
        complete() {
            this.array.push(this);
            take_collada_prop(this);
            this.measure();
            if (glob.propAxes)
                this.master.add(new THREE.AxesHelper());
            //this.hide();
        }
        show() {
            if (this.on()) {
                console.warn(`Oops: Prop ${this.type} is already showing.`);
                return;
            }
            glob.propsGroup.add(this.master);
            this._show();
        }
        hide() {
            if (this.off()) {
                console.warn(`Oops: Prop ${this.type} is already hidden.`);
                return;
            }
            glob.propsGroup.remove(this.master);
            this._hide();
        }
        loop() {
            this.active && this._loop?.(); // Execute loop logic for active prop
        }
        _show() {
            this.object.visible = true;
        }
        _hide() {
            this.object.visible = false;
        }
        _lod() {
        }
        _loop() {
        }
        lod() {
            // todo ugly and confusing splices
            props.collection.splice(props.collection.indexOf(this), 1);
            this.array.splice(this.array.indexOf(this), 1);
            this._lod();
            this.debugBox?.lod();
            glob.propsGroup.remove(this.master);
            if (this.fbody)
                this.fbody.lod();
        }
        measure() {
            this.master.updateMatrix();
            this.master.updateMatrixWorld();
            this.aabb = new THREE.Box3();
            this.aabb.setFromObject(this.master, true);
        }
        get_center() {
            const center = new THREE.Vector3();
            this.aabb.getCenter(center);
            return center;
        }
        correction_for_physics() {
            // change the origin from the corner to the center
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(-2);
            size.z = -size.z;
            this.group.position.copy(size);
        }
    }
    props.prop = prop;
    class pprop extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pprop';
        }
        _show() {
            this.object.visible = true;
            this.debugBox = new common.debug_box(this, 'blue', true);
            glob.propsGroup.add(this.debugBox.mesh);
        }
        _hide() {
            this.object.visible = false;
            this.debugBox?.mesh.removeFromParent();
        }
        _loop() {
        }
    }
    props.pprop = pprop;
    class pmarker extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pmarker';
            this.array = props.markers;
            this.object.add(new THREE.AxesHelper(1));
        }
        _show() {
            this.object.visible = true;
        }
        _loop() {
        }
    }
    props.pmarker = pmarker;
    class pbox extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pbox';
            this.array = props.boxes;
        }
        _show() {
            this.object.visible = true;
            new physics.fbox(this);
            this.debugBox = new common.debug_box(this, 'blue', true);
            glob.propsGroup.add(this.debugBox.mesh);
        }
        _hide() {
            this.object.visible = false;
            this.debugBox?.mesh.removeFromParent();
            this.fbody?.lod();
        }
        _loop() {
            this.fbody.loop();
            this.master.position.copy(this.fbody.body.position);
            this.master.quaternion.copy(this.fbody.body.quaternion);
        }
        _lod() {
        }
    }
    props.pbox = pbox;
    class pwallorsolid extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pwallorsolid';
            this.array = props.walls;
        }
        _show() {
            new physics.fbox(this);
            if (this.object.name != 'solid')
                this.object.visible = false;
            this.master.position.copy(this.fbody.body.position);
            this.master.quaternion.copy(this.fbody.body.quaternion);
        }
        _hide() {
            this.object.visible = false;
            this.debugBox?.mesh.removeFromParent();
            this.fbody?.lod();
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
        _show() {
            console.log('finish stairstep');
            new physics.fstairstep(this);
            this.master.position.copy(this.fbody.body.position);
            this.master.quaternion.copy(this.fbody.body.quaternion);
            //this.object.visible = false;
        }
        _loop() {
        }
    }
    props.pstairstep = pstairstep;
    class pconvex extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pconvex';
            this.array = props.boxes;
            this.object.visible = false;
        }
        _show() {
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.multiplyScalar(garbage.spaceMultiply);
            this.object.position.z -= size.z;
            new physics.fconvex(this);
        }
        _loop() {
            this.fbody.loop();
            this.master.position.copy(this.fbody.body.position);
            this.master.quaternion.copy(this.fbody.body.quaternion);
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
                const preset = props.presets[this.preset];
                if (!preset)
                    return;
                if (preset.delay)
                    setTimeout(paly, preset.delay[0] + preset.delay[1] * Math.random() * 1000);
                else
                    paly();
                return false;
            });
        }
        _show() {
            this.object.visible = false;
            this._play();
        }
        _loop() {
        }
        _play() {
            if (!audio.allDone)
                return;
            const preset = props.presets[this.preset];
            if (!preset)
                return;
            if (preset.disabled)
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
        preset_;
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pfan';
        }
        _show() {
            this.preset_ = props.presets[this.preset || 'none'];
            console.log('fan preset_', this.preset_, this.preset);
            //this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            this.aabb.getSize(size);
            this.aabb.getCenter(center);
            const temp = new THREE.Vector3(size.x, size.z, size.y);
            temp.multiplyScalar(garbage.spaceMultiply);
            size.divideScalar(2);
            size.z = -size.z;
            if (this.parameters.rotation == 'y') {
            }
            if (this.parameters.rotation == 'z') {
            }
            this.object.position.sub(temp.divideScalar(2));
            this.group.position.add(size);
            //size.divideScalar(2);
            //this.object.position.sub(size);
            //this.object.position.add(size);
        }
        _loop() {
            const speed = (this.preset_?.speed || 1) * app.delta;
            if (this.parameters.rotation == 'x')
                this.group.rotation.x += speed;
            if (this.parameters.rotation == 'y')
                this.group.rotation.z += speed;
            if (this.parameters.rotation == 'z')
                this.group.rotation.y += speed;
            this.group.updateMatrix();
        }
    }
    props.pfan = pfan;
    class pdoor extends prop {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pdoor';
            '⛪️';
            //console.log('pdoor hint', parameters.rotation || 0);
        }
        _hide() {
            this.object.visible = false;
            this.fbody?.lod();
        }
        _show() {
            this.object.visible = true;
            new physics.fdoor(this);
            //this.object.add(new THREE.AxesHelper(20));
            //this.group.add(new THREE.AxesHelper(20));
        }
        _loop() {
            this.fbody.loop();
            this.master.position.copy(this.fbody.body.position);
            this.master.quaternion.copy(this.fbody.body.quaternion);
        }
    }
    props.pdoor = pdoor;
    class light extends prop {
        light;
        preset_;
        constructor(object, parameters) {
            super(object, parameters);
        }
        timer = 0;
        behavior() {
            if (!this.preset_)
                return;
            if (!this.light)
                return;
            const behavior = this.preset_.behavior;
            if (!behavior)
                return;
            const cycle = behavior.cycle || 1;
            if (this.timer >= 2)
                this.timer -= 2;
            let intensity = 1;
            this.timer += garbage.dt / (cycle / 2);
            let value = (() => {
                switch (behavior.type) {
                    case 'bounce':
                        return easings.easeOutBounce(this.timer <= 1 ? this.timer : 2 - this.timer);
                    case 'shake':
                        return easings.easeInOutElastic(this.timer <= 1 ? this.timer : 2 - this.timer);
                    default:
                        return 1;
                }
            })();
            intensity = behavior.base + value * behavior.variance;
            this.light.intensity = this.preset_.intensity * intensity;
            this.light.needsUpdate = true;
        }
    }
    class ppointlight extends light {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'plight';
            this.array = props.lights;
        }
        _hide() {
            this.object.visible = false;
            this.light?.removeFromParent();
        }
        _show() {
            //this.object.visible = false;
            this.preset_ = props.presets[this.preset || 'none'];
            if (!this.preset_) {
                console.log(' preset no def ', this.preset);
                return;
            }
            this.object.visible = !this.preset_.hide;
            let size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(2.0);
            let light = new THREE.PointLight(this.preset_.color || 'white', this.preset_.intensity || 1, this.preset_.distance || 3, this.preset_.decay || 1);
            this.light = light;
            light.visible = !this.preset_.disabled;
            light.castShadow = this.preset_.shadow;
            //light.position.fromArray(preset.offset || [0, 0, 0]);
            light.position.add(size);
            // light.add(new THREE.AxesHelper(10));
            this.master.add(light);
        }
        _loop() {
            this.behavior();
        }
        _lod() {
        }
    }
    props.ppointlight = ppointlight;
    class pspotlight extends light {
        spotlight;
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'pspotlight';
            this.array = props.lights;
        }
        _show() {
            this.preset_ = props.presets[this.preset || 'none'];
            if (!this.preset_) {
                console.warn(' preset no def ');
                return;
            }
            this.object.visible = !this.preset_.hide;
            let size = new THREE.Vector3();
            this.aabb.getSize(size);
            size.divideScalar(2.0);
            size.multiplyScalar(garbage.spaceMultiply);
            //console.log('light size, center', size, center);
            let light = new THREE.SpotLight(this.preset_.color, this.preset_.intensity, this.preset_.distance, this.preset_.angle, this.preset_.penumbra, this.preset_.decay);
            this.light = light;
            light.visible = !this.preset_.disabled;
            light.position.set(0, 0, 0);
            light.castShadow = this.preset_.shadow;
            light.shadow.camera.far = 1000;
            light.shadow.mapSize.width = this.preset_.shadowMapSize || 512;
            light.shadow.mapSize.height = this.preset_.shadowMapSize || 512;
            light.angle = this.preset_.angle || Math.PI / 3;
            if (this.preset_.target)
                light.target.position.add(new THREE.Vector3().fromArray(this.preset_.target).multiplyScalar(4));
            light.target.position.add(size);
            //light.target.add(new THREE.AxesHelper(10));
            light.position.add(size);
            this.group.add(light);
            this.group.add(light.target);
            this.spotlight = light;
            //this.group.add(new THREE.AxesHelper(1 * hunt.inchMeter));
        }
        _loop() {
            this.behavior();
        }
    }
    props.pspotlight = pspotlight;
    class prectlight extends light {
        constructor(object, parameters) {
            super(object, parameters);
            this.type = 'prectlight';
            this.array = props.lights;
        }
        _hide() {
            this.light?.removeFromParent();
        }
        _show() {
            console.log('prectlight show');
            this.preset_ = props.presets[this.preset || 'none'];
            if (!this.preset_) {
                console.log(' preset no def ', this.preset);
                return;
            }
            this.object.visible = !this.preset_.hide;
            const size = new THREE.Vector3();
            this.aabb.getSize(size);
            let width = 1, height = 1;
            if (this.parameters.axis == 'z') {
                width = size.y;
                height = size.z;
            }
            if (this.parameters.axis == 'y') {
                width = size.x;
                height = size.z;
            }
            if (this.parameters.axis == 'x') {
                width = size.x;
                height = size.y;
            }
            const light = new THREE.RectAreaLight(this.preset_.color, this.preset_.intensity, width, height);
            light.visible = !this.preset_.disabled;
            light.power = 100;
            light.intensity = this.preset_.intensity;
            light.needsUpdate = true;
            // console.log('rectlight preset', this.preset_, 'intensity', this.preset_.intensity);
            this.light = light;
            light.lookAt(new THREE.Vector3().fromArray(this.preset_.target));
            this.master.add(light);
            const temp = new THREE.Vector3(size.x, size.z, size.y);
            temp.multiplyScalar(garbage.spaceMultiply);
            //this.object.position.sub(temp.divideScalar(2));
            size.divideScalar(2);
            size.z = -size.z;
            this.light.position.add(size);
            const hasHelper = this.preset_.helper;
            if (hasHelper) {
                const helper = new RectAreaLightHelper(light);
                light.add(helper); // helper must be added as a child of the light
            }
        }
        _loop() {
            this.behavior();
        }
        _lod() {
        }
    }
    props.prectlight = prectlight;
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
