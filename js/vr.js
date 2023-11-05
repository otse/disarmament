import app from "./app.js";
import glob from "./glob.js";
import renderer from "./renderer.js";
var vr;
(function (vr) {
    let baseReferenceSpace;
    let snatched = false; // grab the vrrt
    function boot() {
        let button = glob.VRButton.createButton(renderer.renderer);
        console.log('button', button);
        document.body.appendChild(button);
        renderer.renderer.xr.addEventListener('sessionend', () => {
            console.log(' end xr ');
            renderer.tarrt = null;
            //renderer.renderer.xr.enabled = false;
            glob.xr = false;
        });
        renderer.renderer.xr.addEventListener('sessionstart', () => {
            console.error(' hunt : started a xr session ');
            //renderer.renderer.xr.enabled = true;
            glob.xr = true;
            //cancelAnimationFrame(app.af);
            //baseReferenceSpace = renderer.renderer.xr.getReferenceSpace();
            //renderer.renderer.setAnimationLoop(animate);
        });
    }
    vr.boot = boot;
    function start() {
        renderer.renderer.setAnimationLoop(animate);
    }
    vr.start = start;
    function animate() {
        // workaround
        /*if (glob.xr && !snatched) {
            renderer.renderer.render(renderer.scene, renderer.camera);
            const rt = renderer.renderer.getRenderTarget();
            if (rt && !snatched) {
                vrrt = rt;
                renderer.tarrt = vrrt;
                snatched = true;
                console.error('snatched rt', vrrt);
            }
        }*/
        //if (vrrt) {
        app.loop();
        //renderer.renderer.setRenderTarget(vrrt);
        //renderer.renderer.clear();
        //renderer.renderer.render(renderer.scene, renderer.camera);
        //}
    }
    function loop() {
        // the step code
        //console.log('renderer.xr.isPresenting', renderer.renderer.xr.isPresenting);
        //renderer.renderer.xr.enabled = renderer.renderer.xr.isPresenting;
    }
    vr.loop = loop;
})(vr || (vr = {}));
export default vr;
