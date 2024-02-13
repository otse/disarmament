import app from "./app.js";
import glob from "./lib/glob.js";
import props from "./props.js";
import renderer from "./renderer.js";

namespace sketchup {

	type tuple = [path: string, shininess?: number, normal?: boolean, specular?: boolean, transparent?: boolean]

	const paths: { [index: string]: tuple } = {
		'ebony': ['./assets/textures/black', 10, false, false],
		'crete1': ['./assets/textures/crete1', 30, false, false],
		'brick1': ['./assets/textures/brick1', 30, true, true],
		'bulkhead1': ['./assets/textures/bulkhead1', 30, true, true, true],
		'floor1': ['./assets/textures/floor1', 1, true],
		'metal2': ['./assets/textures/metal2', 30, true, false, false],
		'metal3': ['./assets/textures/metal3', 30, false, false, true],
		'rust1': ['./assets/textures/rust1', 30, false, false, false],
		'twotonewall': ['./assets/textures/twotonewall', 20, true, true],
		'scrappyfloor': ['./assets/textures/scrappyfloor', 20, true, false],
		'rustydoorframe': ['./assets/textures/rustydoorframe', 30, false, false],
	}

	const stickers = ['rust1']

	const library = {}

	const activeMaterials: any[] = []

	export function loop() {
		if (glob.developer) {
			if (app.proompt('r') == 1) {
				reload_textures();
			}
			if (app.proompt('m') == 1) {
				minecraftMode = !minecraftMode;
				massCubify();
			}
		}
	}

	function reload_textures() {
		for (const material of activeMaterials) {
			const tuple = paths[material.name];
			const loader = new THREE.TextureLoader();
			const old = material.map;
			material.map = loader.load(`${tuple[0]}.png`);
			material.map.wrapS = old.wrapS;
			material.map.wrapT = old.wrapT;
			if (tuple[2]) {
				material.normalMap = loader.load(`${tuple[0]}_normal.png`);
				material.normalMap.wrapS = old.wrapS;
				material.normalMap.wrapT = old.wrapT;
			}
			if (tuple[3]) {
				material.specularMap = loader.load(`${tuple[0]}_specular.png`);
				material.specularMap.wrapS = old.wrapS;
				material.specularMap.wrapT = old.wrapT;
			}
			cubify(material.map);
		}
	}

	function cubify(map) {
		//map.minFilter = map.magFilter = THREE.NearestFilter;
	}

	let minecraftMode = false;

	function massCubify() {
		console.log('masscubify');
		for (const material of activeMaterials) {
			material.map.minFilter = material.map.magFilter =
				minecraftMode ? THREE.NearestFilter : THREE.LinearFilter;
			material.map.needsUpdate = true;
		}
	}

	export function boot() {
		const textureLoader = new THREE.TextureLoader();
		const maxAnisotropy = renderer.renderer.capabilities.getMaxAnisotropy();
		for (let name in paths) {
			const tuple = paths[name];
			const map = textureLoader.load(`${tuple[0]}.png`);
			const material = new THREE.MeshPhongMaterial({
				name: name,
				map: map,
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
			material.specular.set(0.09, 0.09, 0.09);
			material.shininess = tuple[1] || 30;

			if (tuple[2]) {
				const map = textureLoader.load(`${tuple[0]}_normal.png`);
				material.normalMap = map;
				material.normalScale.set(0.4, -0.4);
			}
			if (tuple[3]) {
				const map = textureLoader.load(`${tuple[0]}_specular.png`);
				// material.specularMap = map;
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
			map.wrapS = map.wrapT = THREE.RepeatWrapping;
			cubify(material.map);
			//material.map.minFilter = material.map.magFilter = THREE.NearestFilter;
			library[name] = material;
		}

		load_room();
	}

	export function load_room() {

		const loadingManager = new THREE.LoadingManager(function () {
		});

		const loader = new ColladaLoader(loadingManager);

		loader.load('./assets/metal_place.dae', function (collada) {

			const myScene = collada.scene;
			myScene.updateMatrixWorld();

			console.log('myscene', myScene.scale);

			// myScene.scale.set(1, 1, 1);

			function fix_sticker(material) {
				console.log('fix sticker', material);

				material.transparent = true;
				material.polygonOffset = true;
				material.polygonOffsetFactor = -1;
				material.polygonOffsetUnits = 1;
				material.needsUpdate = true;
			}

			function drain(object, index) {
				const old = index == -1 ? object.material : object.material[index];
				const prefab = library[old.name];
				if (!prefab)
					return;
				const dupe = prefab;//.clone();
				dupe.name = old.name;
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
					object.geometry.attributes.uv2 = object.geometry.attributes.uv.clone()
				}
				if (index == -1)
					object.material = dupe;
				else
					object.material[index] = dupe;
				if (old.name.includes('sticker'))
					fix_sticker(dupe);
				if (stickers.includes(old.name))
					fix_sticker(dupe);
			}

			const propss: props.prop[] = [];
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
}

export default sketchup;