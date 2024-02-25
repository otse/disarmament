import app from "./app.js";
import glob from "./lib/glob.js";
import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
    const paths = {
        'ebony': ['./assets/textures/black', 10, false, false],
        'crete1': ['./assets/textures/crete1', 15, false, false],
        'crete2': ['./assets/textures/crete2', 15, false, false],
        'brick1': ['./assets/textures/brick1', 15, true, true],
        'bulkhead1': ['./assets/textures/bulkhead1', 30, true, true, true],
        'floor1': ['./assets/textures/floor1', 5, true],
        'metrofloor1': ['./assets/textures/metrofloor1', 2, false],
        'metal2': ['./assets/textures/metal2', 30, true, false, false],
        'metal2b': ['./assets/textures/metal2b', 5, true, false, false],
        'metal3': ['./assets/textures/metal3', 30, false, false, true],
        'rust1': ['./assets/textures/rust1', 30, false, false, false],
        'twotonewall': ['./assets/textures/twotonewall', 15, true, true],
        'twotonewallb': ['./assets/textures/twotonewallb', 15, true, false],
        'scrappyfloor': ['./assets/textures/scrappyfloor', 20, true, false],
        'rustydoorframe': ['./assets/textures/rustydoorframe', 30, false, false],
        'locker1': ['./assets/textures/locker1', 40, false, false],
    };
    const stickers = ['rust1'];
    const library = {};
    const activeMaterials = [];
    function loop() {
        if (glob.developer) {
            if (app.proompt('r') == 1) {
                dynamic_reload_textures();
            }
            if (app.proompt('t') == 1) {
                props.clear();
                props.boot();
                renderer.scene.remove(levelGroup);
                load_room();
            }
            if (app.proompt('m') == 1) {
            }
        }
    }
    sketchup.loop = loop;
    function dynamic_reload_textures() {
        for (const i in library) {
            const material = library[i];
            console.log(' reloading material ', material.name);
            const tuple = paths[material.name];
            const textureLoader = new THREE.TextureLoader();
            const map = textureLoader.load(`${tuple[0]}.png`);
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            material.map = map;
            if (tuple[2]) {
                const map = textureLoader.load(`${tuple[0]}_normal.png`);
                map.wrapS = map.wrapT = THREE.RepeatWrapping;
                material.normalMap = map;
            }
            if (tuple[3]) {
                const map = textureLoader.load(`${tuple[0]}_specular.png`);
                map.wrapS = map.wrapT = THREE.RepeatWrapping;
                material.specularMap = map;
            }
        }
    }
    function boot() {
        const textureLoader = new THREE.TextureLoader();
        const maxAnisotropy = renderer.renderer.capabilities.getMaxAnisotropy();
        for (let name in paths) {
            const tuple = paths[name];
            const colorMap = textureLoader.load(`${tuple[0]}.png`);
            colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
            const material = new THREE.MeshPhongMaterial({
                name: name,
                map: colorMap,
                //flatShading: true,
                //dithering: true,
            });
            /*material.onBeforeCompile = (shader) => {
                console.log('onbeforecompile');
                shader.defines = { AL_GORE: '', GORE: '', GEORGE: '' };
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <tonemapping_fragment>`,
                    `#include <tonemapping_fragment>

                    vec3 lumaWeights = vec3(.25,.50,.25);

                    vec3 grey;
                    float saturation = 0.5;
                    float factor = 150.0;
                    float saturation2 = 3.0;
                    float factor2 = 100.0;
                    //vec3 diffuse = material.diffuseColor.rgb;
                    vec3 diffuse = gl_FragColor.rgb;
                    #ifdef AL_GORE
                    grey = vec3(dot(lumaWeights, diffuse.rgb));
                    diffuse = vec3(grey + saturation * (diffuse.rgb - grey));
                    #endif
                    #ifdef GORE
                    diffuse *= factor;
                    diffuse = vec3( ceil(diffuse.r), ceil(diffuse.g), ceil(diffuse.b) );
                    diffuse /= factor;
                    #endif
                    #ifdef GEORGE
                    grey = vec3(dot(lumaWeights, diffuse.rgb));
                    diffuse = vec3(grey + saturation2 * (diffuse.rgb - grey));
                    diffuse *= factor2;
                    diffuse = vec3( ceil(diffuse.r), ceil(diffuse.g), ceil(diffuse.b) );
                    diffuse /= factor2;
                    #endif

                    // when at before lighting pass
                    //material.diffuseColor.rgb = diffuse.rgb;

                    // when at tone mapping pass
                    gl_FragColor.rgb = diffuse.rgb;
                    `
                );
            }
            material.customProgramCacheKey = function () {
                return 'clucked';
            }*/
            material.specular.set(0.1, 0.1, 0.1);
            material.shininess = tuple[1] || 30;
            if (tuple[2]) {
                const map = textureLoader.load(`${tuple[0]}_normal.png`);
                map.wrapS = map.wrapT = colorMap.wrapS;
                material.normalMap = map;
                material.normalScale.set(0.4, -0.4);
            }
            if (tuple[3]) {
                const map = textureLoader.load(`${tuple[0]}_specular.png`);
                map.wrapS = map.wrapT = colorMap.wrapS;
                material.specularMap = map;
            }
            //if (tuple[4]) {
            //	const map = textureLoader.load(`${tuple[0]}_aomap.png`);
            //	material.aoMap = map;
            //}
            //if (tuple[5]) {
            //	const map = textureLoader.load(`${tuple[0]}_alpha.png`);
            //	material.alphaMap = map;
            //}
            if (tuple[4]) {
                console.log('material', name, 'is transparent');
                material.transparent = true;
                //material.side = THREE.DoubleSided; 
                material.alphaTest = 0.9;
            }
            colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
            //cubify(material.map);
            //material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
            library[name] = material;
        }
        load_room();
    }
    sketchup.boot = boot;
    function fix_sticker(material) {
        console.warn(' fix sticker ', material);
        material.transparent = true;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = 1;
        material.needsUpdate = true;
    }
    function adapt_from_materials_library(object, index) {
        const current = index == -1 ? object.material : object.material[index];
        const definition = library[current.name];
        if (!definition)
            return;
        if (index == -1)
            object.material = definition;
        else
            object.material[index] = definition;
        activeMaterials.push(definition);
        if (definition.name.includes('sticker'))
            fix_sticker(definition);
    }
    let levelGroup;
    function load_room() {
        const loadingManager = new THREE.LoadingManager(function () {
        });
        const colladaLoader = new ColladaLoader(loadingManager);
        colladaLoader.load('./assets/metal_place.dae', function (collada) {
            const scene = collada.scene;
            scene.updateMatrixWorld(); // without this everything explodes
            console.log(' collada scene ', scene.scale);
            const queue = [];
            function traversal(object) {
                object.castShadow = true;
                object.receiveShadow = true;
                if (object.material) {
                    if (!object.material.length) {
                        adapt_from_materials_library(object, -1);
                    }
                    else {
                        console.warn(' multiple materials ');
                        for (let index in object.material) {
                            adapt_from_materials_library(object, index);
                        }
                    }
                }
                const prop = props.factory(object);
                if (prop)
                    queue.push(prop);
            }
            scene.traverse(traversal);
            for (let prop of queue)
                prop.complete();
            const helper = new THREE.AxesHelper(1);
            const group = new THREE.Group();
            levelGroup = group;
            group.add(scene);
            console.log('sketchup scene rotation', scene.rotation);
            //group.add(helper);
            renderer.scene.add(group);
        });
    }
    sketchup.load_room = load_room;
})(sketchup || (sketchup = {}));
export default sketchup;
