import app from "./app.js";
import glob from "./lib/glob.js";
import { hooks } from "./lib/hooks.js";
import renderer from "./renderer.js";
import tunnels from "./components/tunnels.js";
import garbage from "./garbage.js";
import props from "./components/props.js";
import vr from "./vr/vr.js";

namespace sketchup {

	const disable_fake_ambient_occlusion = true;

	type matTuple = [
		color?: string,
		path?: string,
		normalScale?: number,
		roughness?: number,
		metalness?: number,
		normal?: boolean,
		transparent?: boolean,
		emissive?: boolean,
		displacement?: boolean,
	]

	const stickers = ['wallsewerhole', 'concretecornerdamage', 'ambientocclusion', 'rustylatch']

	var figsMats = {}
	const mats = {}

	var loresToggle = true;
	var normalToggle = true;

	export async function getMats() {
		const seed = `?x=${Math.random()}`;
		let url = `figs/mats.json${seed}`;
		let response = await fetch(url);
		const arrSales = await response.json();
		figsMats = arrSales;
	}

	export async function boot() {
		hooks.create('environmentReady');
		hooks.create('environmentCleanup');
		hooks.create('garbageStep');
		await getMats();
		await buildMats();
		await loadLevel();
		for (const marker of props.markers) {
			if (marker.preset === 'start') {
				glob.yawGroup.position.copy(marker.get_center());
				break;
			}
		}
	}

	export async function loop() {
		if (glob.developer) {
			if (app.proompt('r') == 1) {
				await getMats();
				await buildMats();
				objectsTakeMats(glob.levelGroup);
				objectsTakeMats(glob.propsGroup);
			}
			if (app.proompt('t') == 1) {
				console.log('[t]');
				hooks.emit('environmentCleanup', 0);
				renderer.scene.remove(glob.levelGroup);
				await props.reload();
				await loadLevel();
			}
			if (app.proompt('f3') == 1) {
				loresToggle = !loresToggle;
				hooks.emit('environmentCleanup', 0);
				renderer.scene.remove(glob.levelGroup);
				await props.reload();
				await getMats();
				await buildMats();
				await loadLevel();
			}
			if (app.proompt('n') == 1) {
				await toggleNormalmap();
			}
		}
	}

	async function toggleNormalmap() {
		normalToggle = !normalToggle;
		const funcs: any[] = [];
		for (let name in figsMats) {
			const tuple = figsMats[name];
			const mat = mats[name];
			if (!normalToggle)
				mat.normalScale.set(0, 0);
			else
				mat.normalScale.set(tuple[2], -tuple[2]);
		}
	}

	async function bakeMaterialFromTuple(name: string, tuple: matTuple) {
		// console.log('bake material', name, tuple);
		const seed = `?x=same`;
		let texture;
		if (tuple[1]) {
			texture = await <any>createTextureFromImage(`${tuple[1]}.png${seed}`, 8);
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			texture.minFilter = texture.magFilter = THREE.LinearFilter;
		}
		const mat = new THREE.MeshPhysicalMaterial({
			name: name,
			color: tuple[0],
			map: texture
		});
		// material.clearcoat = 1.0;
		mat.roughness = tuple[3] ?? 0.3;
		mat.metalness = tuple[4] ?? 0;
		mat.transparent = tuple[6];
		// mat.clearCoat = 0.5;
		mat.iridescence = 0.15;
		if (name == 'ambientocclusion') {
			console.warn('we r ao');
			//mat.aoMap = mat.map;
			//mat.aoMapIntensity = 10;
			//mat.map =  await <any>createTextureFromImage(`./assets/textures/transparent.png${seed}`, 1);
			if (disable_fake_ambient_occlusion)
				mat.opacity = 0;
		}
		if (tuple[5] && true) {
			const texture = await <any>createTextureFromImage(`${tuple[1]}_normal.png${seed}`, 4);
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			if (!normalToggle)
				mat.normalScale.set(0, 0);
			else
				mat.normalScale.set(tuple[2], -tuple[2]!);
			mat.normalMap = texture;
		}
		if (tuple[7] && true) {
			mat.emissive = new THREE.Color('white');
			const texture = await <any>createTextureFromImage(`${tuple[1]}_emissive.png${seed}`, 4);
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			mat.emissiveMap = texture;
			//mat.emissive.set('#82834a');
			console.warn(' emis ');
		}
		if (tuple[8] && true) {
			const texture = await <any>createTextureFromImage(`${tuple[1]}_displacement.png${seed}`, 1);
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			mat.displacementMap = texture;
			mat.displacementScale = 4;
			console.warn(' displaces ');
		}
		mat.onBeforeCompile = (shader) => {
			console.warn(' onbeforecompile ', mat.name);
			shader.defines = { SAT: '', REDUCE: '', xRESAT: '', xREREDUCE: '' };
			shader.fragmentShader = shader.fragmentShader.replace(
				`#include <tonemapping_fragment>`,
				`#include <tonemapping_fragment>

			vec3 lumaWeights = vec3(0.2126, 0.7152, 0.0722);

			vec3 grey;
			float sat = 1.5;
			float reduce = 127.0;
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
			`
			);
		}
		mat.customProgramCacheKey = function () {
			return 'clucked';
		}
		mats[name] = mat;
	}

	async function buildMats() {
		/* promises - nero
		*/
		const funcs: any[] = [];
		for (let name in figsMats) {
			const tuple = figsMats[name];
			const promise = /*don't await*/ bakeMaterialFromTuple(name, tuple);
			funcs.push(promise);
		}
		// Instead of awaiting one, wait for all of them
		return Promise.all(funcs);
	}

	const downscale = true;

	const createTextureFromImage = async (imageUrl, scale) => {
		return new Promise(async resolve => {
			if (!loresToggle)
				scale = 1;
			if (!downscale)
				resolve(await new THREE.TextureLoader().loadAsync(imageUrl));
			else {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d')!;
				const texture = new THREE.CanvasTexture(canvas);
				texture.anisotropy = renderer.maxAnisotropy;
				new THREE.ImageLoader().loadAsync(imageUrl).then((image) => {
					// console.log('from', image.width, image.height, 'to', image.width / scale, image.height / scale);
					canvas.width = image.width / scale;
					canvas.height = image.height / scale;
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
					resolve(texture);
				});
			}
		});
	}

	async function loadGuns() {
		const g3a3 = await loadGun('g3a3');
		vr.rightController.grip.add(g3a3);
		rotateGunForGripping(g3a3);

		//const g3a32 = await loadGun('g3a3');
		//props.markers.find(marker => marker.preset === 'gunstand')!.master.add(g3a32);
	}

	function fix_sticker(material) {
		material.polygonOffset = true;
		material.polygonOffsetFactor = -2;
		material.polygonOffsetUnits = 1;
		material.needsUpdate = true;
		if (material.name == 'ambientocclusion') {
			material.polygonOffsetFactor = -1;
		}
	}

	// Todo Jesus christ clean this up
	async function objectTakesMat(object, index) {
		const current = index == -1 ? object.material : object.material[index];
		//console.log('object', object);
		//if (!object.geometry.attributes.uv2) {
		//	console.warn('new uv2');
		//	object.geometry.setAttribute('uv2', new THREE.BufferAttribute(object.geometry.attributes.uv.array, 2));
		//}
		let mat;
		mat = mats[current.name];
		if (!mat)
			await bakeMaterialFromTuple(current.name, [current.color, '', 1] as matTuple);
		mat = mats[current.name];
		if (index == -1)
			object.material = mat;
		else
			object.material[index] = mat;
		if (stickers.includes(current.name))
			fix_sticker(mat);
	}

	export async function objectsTakeMats(group) {
		async function traversal(object) {
			if (object.material)
				if (!object.material.length)
					await objectTakesMat(object, -1);

				else
					// Why would there be multiple materials in object?
					// This complicates things
					for (let index in object.material)
						await objectTakesMat(object, index);
		}
		group.traverse(traversal);
	}

	export async function load_level_config(name) {
		const seed = `?x=${Math.random()}`;
		let url = `./assets/${name}.json${seed}`;
		let response = await fetch(url);
		const arrSales = await response.json();
		return arrSales;
	}

	export async function loadLevel() {
		const name = glob.level;
		const loadingManager = new THREE.LoadingManager(function () {
		});
		const colladaLoader = new ColladaLoader(loadingManager);
		const levelConfig = await load_level_config(name);
		props.presets = Object.assign(props.presets, levelConfig);
		const seed = `?x=${Math.random()}`;
		await colladaLoader.loadAsync(`./assets/${name}.dae${seed}`).then((collada) => {
			const scene = collada.scene;
			scene.updateMatrix();
			scene.updateMatrixWorld(true); // without this everything explodes
			scene.updateWorldMatrix(true, true);
			console.log(' collada scene ', scene);
			// todo sheesh cleanup!
			function setRenderFlags(object) {
				object.castShadow = true;
				object.receiveShadow = true;
				object.frustumCulled = false;
				object.matrixAutoUpdate = false;
				object.updateMatrix();
				object.updateMatrixWorld(true);
			}
			scene.traverse(setRenderFlags);
			objectsTakeMats(scene);
			hooks.emit('environmentReady', scene);
			const group = new THREE.Group();
			group.add(scene);
			group.updateMatrix();
			group.updateMatrixWorld();
			glob.scene.add(group);
			glob.levelGroup = group;
		});
		await loadGuns();

	}

	export function rotateGunForGripping(group) {
		group.rotation.x = -Math.PI / 2;
		group.rotation.y = Math.PI / 2;
		group.updateMatrix();
	}

	export async function loadGun(name) {
		const group = new THREE.Group();
		const loadingManager = new THREE.LoadingManager(function () {
		});
		const colladaLoader = new ColladaLoader(loadingManager);
		await colladaLoader.loadAsync(`./assets/${name}.dae`).then((collada) => {
			const scene = collada.scene;
			scene.updateMatrix();
			scene.updateMatrixWorld(); // without this everything explodes
			console.log(' collada scene ', scene);
			objectsTakeMats(scene);
			group.add(scene);
			renderer.scene.add(group);
		});
		return group;
	}
}

export default sketchup;