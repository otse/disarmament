/// Client game component

interface mycomponent {
    componentName: string;
    boot: () => Promise<void>;
}

export default mycomponent;