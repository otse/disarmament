import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
    const drainage = {
        'twotonewall': './files/textures/twotonewall.png',
        'scrappyfloor': './files/textures/scrappyfloor.png',
    };
    const sewer = {};
    function boot() {
        const textureLoader = new THREE.TextureLoader();
        const maxAnisotropy = renderer.renderer_.capabilities.getMaxAnisotropy();
        for (let name in drainage) {
            let path = drainage[name];
            const map = textureLoader.load(path);
            const material = new THREE.MeshLambertMaterial({
                map: map,
                flatShading: true,
            });
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
            sewer[name] = material;
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
            function fix_sticker(material) {
                material.transparent = true;
                material.polygonOffset = true;
                material.polygonOffsetFactor = -4;
            }
            function drain(object) {
                const sewage = sewer[object.material.name];
                if (!sewage)
                    return;
                const dupe = sewage.clone();
                const old = object.material;
                if (old.map) {
                    dupe.map.wrapS = old.map.wrapS;
                    dupe.map.wrapT = old.map.wrapT;
                }
                if (old.name.includes('sticker'))
                    fix_sticker(old);
            }
            const propss = [];
            function traversal(object) {
                object.castShadow = true;
                object.receiveShadow = true;
                if (object.material) {
                    if (!object.material.length) {
                        drain(object);
                    }
                    else {
                        console.warn('multiple materials');
                        for (let material of object.material) {
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
