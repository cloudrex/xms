import path from "path";

type AssetPaths = {
    readonly resources: string[];
};

export default class Asset {
    private static basePaths: AssetPaths = {
        resources: ["resources"]
    };

    public static resource(name: string, baseDirectory: string, ext: string): string {
        return Asset.join(...Asset.basePaths.resources, baseDirectory, `${name}.${ext}`);
    }

    private static join(...args: string[]): string {
        return path.join("..", ...args);
    }
}
