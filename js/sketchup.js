import app from "./app.js";
import glob from "./lib/glob.js";
import props from "./props.js";
import renderer from "./renderer.js";
var sketchup;
(function (sketchup) {
    const stickers = ['lockerssplat'];
    var mats = {};
    var scaleToggle = true;
    async function get_mats() {
        let url = 'figs/mats.json';
        let response = await fetch(url);
        const arrSales = await response.json();
        mats = arrSales;
    }
    sketchup.get_mats = get_mats;
    async function loop() {
        if (glob.developer) {
            if (app.proompt('r') == 1) {
                await get_mats();
                await reload_textures();
                steal_from_the_library(levelGroup);
            }
            if (app.proompt('t') == 1) {
                props.clear();
                renderer.scene.remove(levelGroup);
                await props.boot();
                await get_mats();
                await reload_textures();
                await load_level();
            }
            if (app.proompt('f3') == 1) {
                scaleToggle = !scaleToggle;
                props.clear();
                renderer.scene.remove(levelGroup);
                await props.boot();
                await get_mats();
                await reload_textures();
                await load_level();
            }
            if (app.proompt('m') == 1) {
            }
        }
    }
    sketchup.loop = loop;
    async function reload_textures() {
        /* this uses the magic of promises

           it loads all textures at once, whilst at the same time,
           asynchronously waiting for each of them before continuing
        */
        const funcs = [];
        for (let name in mats) {
            const func = async (name) => {
                console.log('func', name);
                const existing = mats[name];
                const tuple = mats[name];
                const salt = `?x=same`;
                const texture = await createTextureFromImage(`${tuple[0]}.png${salt}`, 8);
                console.log('name mats', name);
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = texture.magFilter = THREE.LinearFilter;
                const material = new THREE.MeshPhysicalMaterial({
                    name: name,
                    map: texture
                });
                material.roughness = tuple[2];
                material.metalness = tuple[3];
                material.clearCoat = 0.5;
                material.iridescence = 0.15;
                if (tuple[7]) {
                    material.emissive = new THREE.Color('white');
                    console.log(' emissive ');
                }
                if (tuple[4] && false) {
                    const texture = await createTextureFromImage(`${tuple[0]}_normal.png${salt}`, 2);
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    material.normalScale.set(tuple[1], -tuple[1]);
                    material.normalMap = texture;
                }
                if (tuple[5] && false) {
                    const texture = await createTextureFromImage(`${tuple[0]}_specular.png${salt}`, 4);
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    //material.specularMap = texture;
                }
                material.onBeforeCompile = (shader) => {
                    console.warn('onbeforecompile');
                    shader.defines = { SAT: '', xREDUCE: '', xRESAT: '', REREDUCE: '' };
                    shader.fragmentShader = shader.fragmentShader.replace(`#include <tonemapping_fragment>`, `#include <tonemapping_fragment>

					vec3 lumaWeights = vec3(.25,.50,.25);

					vec3 grey;
					float sat = 3.0;
					float reduce = 100.0;
					float resat = 2.0;
					float rereduce = 100.0;

					//vec3 diffuse = material.diffuseColor.rgb;
					vec3 diffuse = gl_FragColor.rgb;

					#ifdef SAT
					grey = vec3(dot(lumaWeights, diffuse.rgb));
					diffuse = vec3(grey + sat * (diffuse.rgb - grey));
					#endif

					#ifdef REDUCE
					diffuse *= reduce;
					diffuse = vec3( ceil(diffuse.r), ceil(diffuse.g), ceil(diffuse.b) );
					diffuse /= reduce;
					#endif

					#ifdef RESAT
					grey = vec3(dot(lumaWeights, diffuse.rgb));
					diffuse = vec3(grey + resat * (diffuse.rgb - grey));
					#endif

					#ifdef REREDUCE
					diffuse *= rereduce;
					diffuse = vec3( ceil(diffuse.r), ceil(diffuse.g), ceil(diffuse.b) );
					diffuse /= rereduce;
					#endif

					// when at before lighting pass
					//material.diffuseColor.rgb = diffuse.rgb;

					// when at tone mapping pass
					gl_FragColor.rgb = diffuse.rgb;
					`);
                };
                material.customProgramCacheKey = function () {
                    return 'clucked';
                };
                //material.specular?.set(0.1, 0.1, 0.1);
                //material.shininess = tuple[1] || 30;
                mats[name] = material;
            };
            const promise = /*await*/ func(name);
            funcs.push(promise);
        }
        return Promise.all(funcs);
    }
    const downscale = true;
    const createTextureFromImage = async (imageUrl, scale) => {
        return new Promise(async (resolve) => {
            if (!scaleToggle)
                scale = 1;
            if (!downscale)
                resolve(await new THREE.TextureLoader().loadAsync(imageUrl));
            else {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const texture = new THREE.CanvasTexture(canvas);
                new THREE.ImageLoader().loadAsync(imageUrl).then((image) => {
                    console.log('from', image.width, image.height, 'to', image.width / scale, image.height / scale);
                    canvas.width = image.width / scale;
                    canvas.height = image.height / scale;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(texture);
                });
            }
        });
    };
    async function boot() {
        const maxAnisotropy = renderer.renderer.capabilities.getMaxAnisotropy();
        await get_mats();
        await reload_textures();
        await load_level();
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
    function adapt_color(color) {
        for (const i in mats) {
            const mat = mats[i];
            mat.color = new THREE.Color(color);
        }
    }
    sketchup.adapt_color = adapt_color;
    function object_takes_mat(object, index) {
        const current = index == -1 ? object.material : object.material[index];
        const mat = mats[current.name];
        if (!mat)
            return;
        if (index == -1)
            object.material = mat;
        else
            object.material[index] = mat;
        if (stickers.includes(current.name))
            fix_sticker(mat);
    }
    let levelGroup;
    function steal_from_the_library(scene) {
        function traversal(object) {
            if (object.material) {
                if (!object.material.length) {
                    object_takes_mat(object, -1);
                }
                else {
                    for (let index in object.material) {
                        object_takes_mat(object, index);
                    }
                }
            }
        }
        scene.traverse(traversal);
    }
    sketchup.steal_from_the_library = steal_from_the_library;
    async function load_level_config(name) {
        let url = `./assets/${name}.json`;
        let response = await fetch(url);
        const arrSales = await response.json();
        return arrSales;
    }
    sketchup.load_level_config = load_level_config;
    async function load_level() {
        const name = glob.level;
        //await new Promise(resolve => setTimeout(resolve, 200));
        const loadingManager = new THREE.LoadingManager(function () {
        });
        const colladaLoader = new ColladaLoader(loadingManager);
        const levelConfig = await load_level_config(name);
        props.presets = Object.assign(props.presets, levelConfig);
        await colladaLoader.loadAsync(`./assets/${name}.dae`).then((collada) => {
            const scene = collada.scene;
            scene.updateMatrix();
            scene.updateMatrixWorld(); // without this everything explodes
            console.log(' collada scene ', scene);
            const queue = [];
            function find_make_props(object) {
                object.castShadow = true;
                object.receiveShadow = true;
                const prop = props.factory(object);
                if (prop)
                    queue.push(prop);
            }
            scene.traverse(find_make_props);
            steal_from_the_library(scene);
            for (let prop of queue)
                prop.complete();
            const group = new THREE.Group();
            group.add(scene);
            renderer.scene.add(group);
            levelGroup = group;
        });
    }
    sketchup.load_level = load_level;
})(sketchup || (sketchup = {}));
export default sketchup;
