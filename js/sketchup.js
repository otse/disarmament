import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
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
            function fix(material) {
                //console.log(material);
                material.flatShading = true;
                material.needsUpdate = true;
                if (material.name.includes('sticker'))
                    fix_sticker(material);
                if (material.map) {
                    // mineify
                    //THREE.NearestFilter
                    //material.map.rotation = (Math.PI * Math.random());
                    material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
                    material.map.anisotropy = renderer.renderer_.capabilities.getMaxAnisotropy();
                }
            }
            const propss = [];
            function traversal(object) {
                object.castShadow = true;
                object.receiveShadow = true;
                if (object.material) {
                    if (!object.material.length)
                        fix(object.material);
                    else
                        for (let material of object.material)
                            fix(material);
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
