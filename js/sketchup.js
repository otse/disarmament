import app from "./app.js";
import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
    const paths = {
        'crete1': ['./assets/textures/crete1', false, false],
        'brick1': ['./assets/textures/brick1', true, true],
        'metal1': ['./assets/textures/metal1', true, true, true],
        'metal2': ['./assets/textures/metal2', true, false, false],
        'twotonewall': ['./assets/textures/twotonewall', true, true],
        'scrappyfloor': ['./assets/textures/scrappyfloor', false, false],
        'rustydoorframe': ['./assets/textures/rustydoorframe', false, false],
    };
    const library = {};
    const activeMaterials = [];
    function loop() {
        if (app.proompt('r') == 1) {
            reload_textures();
        }
    }
    sketchup.loop = loop;
    function reload_textures() {
        for (const material of activeMaterials) {
            const tuple = paths[material.name];
            const loader = new THREE.TextureLoader();
            const old = material.map;
            material.map = loader.load(`${tuple[0]}.png`);
            material.map.wrapS = old.wrapS;
            material.map.wrapT = old.wrapT;
            cubify(material.map);
        }
    }
    function cubify(map) {
        //map.minFilter = map.magFilter = THREE.NearestFilter;
    }
    function boot() {
        const textureLoader = new THREE.TextureLoader();
        const maxAnisotropy = renderer.renderer_.capabilities.getMaxAnisotropy();
        for (let name in paths) {
            const tuple = paths[name];
            const map = textureLoader.load(`${tuple[0]}.png`);
            const material = new THREE.MeshPhongMaterial({
                name: name,
                map: map,
                flatShading: true
            });
            material.specular.set(0.04, 0.04, 0.04);
            material.shininess = 100;
            if (tuple[1]) {
                const map = textureLoader.load(`${tuple[0]}_normal.png`);
                material.normalMap = map;
            }
            if (tuple[2]) {
                console.log('attach a specular to', tuple[0]);
                const map = textureLoader.load(`${tuple[0]}_specular.png`);
                //material.emissive.set(0.01, 0, 0);
                material.specularMap = map;
            }
            //if (tuple[3]) {
            //	const map = textureLoader.load(`${tuple[0]}_aomap.png`);
            //	material.aoMap = map;
            //}
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            cubify(material.map);
            //material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
            library[name] = material;
        }
        load_room();
    }
    sketchup.boot = boot;
    function load_room() {
        const loadingManager = new THREE.LoadingManager(function () {
        });
        const loader = new collada_loader(loadingManager);
        loader.load('./assets/metal_place.dae', function (collada) {
            const myScene = collada.scene;
            myScene.updateMatrixWorld();
            console.log('myscene', myScene.scale);
            // myScene.scale.set(1, 1, 1);
            function fix_sticker(material) {
                material.transparent = true;
                material.polygonOffset = true;
                material.polygonOffsetFactor = -4;
            }
            function drain(object, index) {
                const old = index == -1 ? object.material : object.material[index];
                const prefab = library[old.name];
                if (!prefab)
                    return;
                const dupe = prefab.clone();
                activeMaterials.push(dupe);
                // dupe.color.set('red'); // debug
                if (old.map) {
                    dupe.map.wrapS = old.map.wrapS;
                    dupe.map.wrapT = old.map.wrapT;
                    if (dupe.normalMap) {
                        dupe.normalMap.wrapS = old.map.wrapS;
                        dupe.normalMap.wrapT = old.map.wrapT;
                    }
                    if (dupe.specularMap) {
                        dupe.specularMap.wrapS = old.map.wrapS;
                        dupe.specularMap.wrapT = old.map.wrapT;
                    }
                    if (dupe.aoMap) {
                        dupe.aoMap.wrapS = old.map.wrapS;
                        dupe.aoMap.wrapT = old.map.wrapT;
                    }
                }
                if (dupe.aoMap) {
                    var uvs = object.geometry.attributes.uv.array;
                    object.geometry.setAttribute('uv2', new THREE.BufferAttribute(uvs, 2));
                    object.geometry.attributes.uv2 = object.geometry.attributes.uv.clone();
                }
                if (index == -1)
                    object.material = dupe;
                else
                    object.material[index] = dupe;
                if (old.name.includes('sticker'))
                    fix_sticker(old);
            }
            const propss = [];
            function traversal(object) {
                object.castShadow = true;
                object.receiveShadow = true;
                if (object.material) {
                    if (!object.material.length) {
                        drain(object, -1);
                    }
                    else {
                        console.warn('multiple materials');
                        for (let index in object.material) {
                            drain(object, index);
                        }
                    }
                }
                const prop = props.factory(object);
                if (prop) {
                    prop.master = myScene;
                    propss.push(prop);
                }
                //return true;
            }
            myScene.traverse(traversal);
            for (let prop of propss) {
                prop.complete();
            }
            const group = new THREE.Group();
            group.add(myScene);
            renderer.scene.add(group);
        });
    }
    sketchup.load_room = load_room;
})(sketchup || (sketchup = {}));
export default sketchup;
