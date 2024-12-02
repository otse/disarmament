import glob from "./lib/glob.js";
import { hooks } from "./lib/hooks.js";
import points from "./lib/pts.js";
import garbage from "./garbage.js";
var app;
(function (app) {
    let KEY;
    (function (KEY) {
        KEY[KEY["UNPRESSED"] = 0] = "UNPRESSED";
        KEY[KEY["PRESSED"] = 1] = "PRESSED";
        KEY[KEY["REPEAT_DELAY"] = 2] = "REPEAT_DELAY";
        KEY[KEY["REPEAT"] = 3] = "REPEAT";
        KEY[KEY["RELEASED"] = 4] = "RELEASED";
    })(KEY = app.KEY || (app.KEY = {}));
    let MB;
    (function (MB) {
        MB[MB["UP"] = -1] = "UP";
        MB[MB["OFF"] = 0] = "OFF";
        MB[MB["DOWN"] = 1] = "DOWN";
        MB[MB["STILL"] = 2] = "STILL";
    })(MB = app.MB || (app.MB = {}));
    const keys = {};
    const mb = {};
    var pos = [0, 0];
    app.wheel = 0;
    function mousepos() {
        return [...pos];
    }
    app.mousepos = mousepos;
    function onkeys(event) {
        const key = event.key.toLowerCase();
        if ('keydown' == event.type)
            keys[key] = keys[key]
                ? KEY.REPEAT : KEY.PRESSED;
        else if ('keyup' == event.type)
            keys[key] = KEY.RELEASED;
        if (event.keyCode == 114)
            event.preventDefault();
    }
    app.onkeys = onkeys;
    function proompt(k) {
        return keys[k] || KEY.UNPRESSED;
    }
    app.proompt = proompt;
    async function boot(version) {
        console.log(' app boot ');
        hooks.emit('appBoot', null);
        if ('xr' in navigator)
            await navigator.xr.isSessionSupported('immersive-vr').then(x => glob.hasHeadset = x);
        await garbage.boot();
        glob.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        function onmousemove(e) {
            pos[0] = e.clientX;
            pos[1] = e.clientY;
        }
        function onmousedown(e) {
            mb[e.button] = MB.DOWN;
            if (e.button == 1)
                return false;
        }
        function onmouseup(e) {
            mb[e.button] = MB.UP;
        }
        function onwheel(e) {
            app.wheel = e.deltaY < 0 ? 1 : -1;
        }
        let touchStart = [0, 0];
        function ontouchstart(e) {
            //message("ontouchstart");
            touchStart = [e.pageX, e.pageY];
            pos[0] = e.pageX;
            pos[1] = e.pageY;
            mb[2] = MB.UP;
        }
        function ontouchmove(e) {
            pos[0] = e.pageX;
            pos[1] = e.pageY;
            if (!mb[0])
                mb[0] = MB.DOWN;
            e.preventDefault();
            return false;
        }
        function ontouchend(e) {
            const touchEnd = [e.pageX, e.pageY];
            mb[0] = MB.UP;
            mb[2] = MB.UP;
            if (points.equals(touchEnd, touchStart) /*&& buttons[2] != MOUSE.STILL*/) {
                mb[2] = MB.DOWN;
            } /*
            else if (!pts.equals(touchEnd, touchStart)) {
                buttons[2] = MOUSE.UP;
            }
            //message("ontouchend");*/
            //return false;
        }
        function onerror(message) {
            document.querySelectorAll('garbage-stats')[0].innerHTML = message;
        }
        if (glob.mobile) {
            document.ontouchstart = ontouchstart;
            document.ontouchmove = ontouchmove;
            document.ontouchend = ontouchend;
        }
        else {
            document.onkeydown = document.onkeyup = onkeys;
            document.onmousemove = onmousemove;
            document.onmousedown = onmousedown;
            document.onmouseup = onmouseup;
            document.onwheel = onwheel;
        }
        window.onerror = onerror;
        if (!glob.hasHeadset)
            app.blockable = trick_animation_frame(base_loop);
    }
    app.boot = boot;
    function post_keys() {
        for (let i in keys) {
            if (keys[i] == KEY.PRESSED)
                keys[i] = KEY.REPEAT_DELAY;
            else if (keys[i] == KEY.RELEASED)
                keys[i] = KEY.UNPRESSED;
        }
    }
    function post_mouse_buttons() {
        for (let b of [0, 1, 2])
            if (mb[b] == MB.DOWN)
                mb[b] = MB.STILL;
            else if (mb[b] == MB.UP)
                mb[b] = MB.OFF;
    }
    app.delta = 0;
    app.last = 0;
    async function base_loop() {
        //await new Promise(resolve => setTimeout(resolve, 16.6)); // 60 fps mode
        const now = (performance || Date).now();
        app.delta = (now - app.last) / 1000;
        app.last = now;
        await garbage.loop(app.delta);
        app.wheel = 0;
        post_keys();
        post_mouse_buttons();
    }
    app.base_loop = base_loop;
    async function sleep() {
        return new Promise(requestAnimationFrame);
    }
    async function trick_animation_frame(callback) {
        let run = true;
        do {
            await sleep();
            await callback();
        } while (run);
        return {
            runs: () => run,
            stop: () => run = false,
        };
    }
    app.trick_animation_frame = trick_animation_frame;
    function selector_innerhtml(selector, html) {
        let element = document.querySelectorAll(selector)[0];
        element.innerHTML = html;
    }
    app.selector_innerhtml = selector_innerhtml;
    function selector_style(selector, style, property) {
        let element = document.querySelectorAll(selector)[0];
        element.style[style] = property;
    }
    app.selector_style = selector_style;
})(app || (app = {}));
window['App'] = app;
export default app;
