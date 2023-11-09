import hooks from "./lib/hooks.js";
import hunt from "./hunt.js";
import renderer from "./renderer.js";
class asd {
    bluh;
}
var audio;
(function (audio) {
    var listener;
    let gestured = false;
    audio.loaded = false;
    audio.cardboard = [
        './assets/sound/cardboard/cardboard_box_impact_hard1.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard2.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard3.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard4.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard5.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard6.wav',
        './assets/sound/cardboard/cardboard_box_impact_hard7.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft1.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft2.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft3.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft4.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft5.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft6.wav',
        './assets/sound/cardboard/cardboard_box_impact_soft7.wav'
    ];
    audio.plastic = [
        './assets/sound/plastic/plastic_box_impact_hard1.wav',
        './assets/sound/plastic/plastic_box_impact_hard2.wav',
        './assets/sound/plastic/plastic_box_impact_hard3.wav',
        './assets/sound/plastic/plastic_box_impact_hard4.wav',
        './assets/sound/plastic/plastic_box_impact_soft1.wav',
        './assets/sound/plastic/plastic_box_impact_soft2.wav',
        './assets/sound/plastic/plastic_box_impact_soft3.wav',
        './assets/sound/plastic/plastic_box_impact_soft4.wav'
    ];
    audio.metal = [
        './assets/sound/metal/metal_solid_impact_hard1.wav',
        './assets/sound/metal/metal_solid_impact_hard4.wav',
        './assets/sound/metal/metal_solid_impact_hard5.wav',
        './assets/sound/metal/metal_solid_impact_soft1.wav',
        './assets/sound/metal/metal_solid_impact_soft2.wav',
        './assets/sound/metal/metal_solid_impact_soft3.wav',
    ];
    audio.environment = [
        './assets/sound/env/gorge.mp3',
        './assets/sound/env/env_wind.mp3',
    ];
    audio.other = [
        './assets/sound/other/whoosh.wav',
    ];
    audio.footsteps = [
        './assets/sound/other/whoosh.wav',
    ];
    audio.buffers = {};
    function boot() {
        hunt.locker.addEventListener('click', function () {
            console.log('create gesture');
            gesture();
        });
    }
    audio.boot = boot;
    function gesture() {
        if (gestured)
            return;
        load();
        gestured = true;
    }
    function load() {
        listener = new THREE.AudioListener();
        renderer.camera.add(listener);
        console.log('audio load');
        let loads = [];
        loads = loads.concat(audio.other, audio.cardboard, audio.plastic, audio.metal, audio.environment);
        const loader = new THREE.AudioLoader();
        for (let path of loads) {
            let basename = path.replace(/^.*[\\/]/, '');
            basename = basename.split('.')[0];
            loader.load(path, function (buffer) {
                audio.buffers[basename] = buffer;
            }, function () { }, function () {
                console.warn(' hunt audio cannot load ', basename);
            });
        }
        audio.loaded = true;
        setTimeout(() => hooks.call('audioGestured', 1), 500);
    }
    function playOnce(id, volume = 1, loop = false) {
        const buffer = audio.buffers[id];
        if (!buffer) {
            console.warn(' sound doesnt exist ', id);
            return;
        }
        let positional = new THREE.PositionalAudio(listener);
        positional.setBuffer(buffer);
        positional.setLoop(loop);
        positional.setVolume(volume);
        positional.play();
        return positional;
    }
    audio.playOnce = playOnce;
})(audio || (audio = {}));
export default audio;
