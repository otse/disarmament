/// taken from the lod of wastes
// it is both silly and brilliant
export class toggle {
    _active = -1;
    get active() {
        return this._active;
    }
    constructor() {
    }
    on() {
        if (this.active == 1)
            return true; // It was already on
        this._active = 1;
        return false;
    }
    off() {
        if (this.active == 0)
            return true;
        this._active = 0;
        return false;
    }
}
export default toggle;
