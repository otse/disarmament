/// Game Components have to follow the
// boot, loop and clear idiom

interface mycomponent {
    componentName: string;
    boot: () => Promise<void>;
}

export default mycomponent;