/// Game Components have to follow the boot, loop and clear idiom used by the client

interface mycomponent {
    componentName: string;
    boot: () => Promise<void>;
}

export default mycomponent;