import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
    const paths = {
        'crete1': ['./assets/textures/crete1', false, false],
        'brick1': ['./assets/textures/brick1', true, true],
        'metal1': ['./assets/textures/metal1', true, false, true],
        'twotonewall': ['./assets/textures/twotonewall', true, true],
        'scrappyfloor': ['./assets/textures/scrappyfloor', false, false],
        'rustydoorframe': ['./assets/textures/rustydoorframe', false, false],
    };
    const library = {};
    function boot() {
        const textureLoader = new THREE.TextureLoader();
        const maxAnisotropy = renderer.renderer_.capabilities.getMaxAnisotropy();
        for (let name in paths) {
            const tuple = paths[name];
            const map = textureLoader.load(`${tuple[0]}.png`);
            const material = new THREE.MeshPhongMaterial({
                map: map,
                flatShading: true
            });
            if (tuple[1]) {
                const map = textureLoader.load(`${tuple[0]}_normal.png`);
                material.normalMap = map;
            }
            if (tuple[2]) {
                console.log('attach a specular to', tuple[0]);
                const map = textureLoader.load(`${tuple[0]}_specular.png`);
                material.specular.set(0.04, 0.04, 0.04);
                //material.emissive.set(0.01, 0, 0);
                material.shininess = 120;
                material.specularMap = map;
            }
            if (tuple[3]) {
                const map = textureLoader.load(`${tuple[0]}_aomap.png`);
                material.aoMap = map;
            }
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
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
