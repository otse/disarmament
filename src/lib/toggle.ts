/// taken from the lod of wastes

// it is both silly and brilliant

// derived by props, tunnels, etc

export class toggle {
    _active = false;
    get active() {
        return this._active;
    }
    constructor() {
    }
    on() {
        if (this.active)
            return true; // It was already on
        this._active = true;
        return false; // It was not on
    }
    off() {
        if (!this.active)
            return true;
        this._active = false;
        return false;
    }

}

export default toggle;