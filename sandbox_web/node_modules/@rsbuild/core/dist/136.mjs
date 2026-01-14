import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
let constants_dirname = dirname(fileURLToPath(import.meta.url));
process.platform, join(constants_dirname), join(constants_dirname, '../static'), join(constants_dirname, 'client');
let COMPILED_PATH = join(constants_dirname, '../compiled'), vendors_require = createRequire(import.meta.url), requireCompiledPackage = (name)=>vendors_require(`${COMPILED_PATH}/${name}/index.js`);
requireCompiledPackage('picocolors');
let transformLoader = async function transform(source, map) {
    let callback = this.async(), bypass = ()=>{
        callback(null, source, map);
    }, { id: transformId, getEnvironment } = this.getOptions();
    if (!transformId) return void bypass();
    let transform = this._compiler?.__rsbuildTransformer?.[transformId];
    if (!transform) return void bypass();
    try {
        var generatedSourceMap;
        let result = await transform({
            code: source,
            context: this.context,
            resource: this.resource,
            resourcePath: this.resourcePath,
            resourceQuery: this.resourceQuery,
            environment: getEnvironment(),
            addDependency: this.addDependency.bind(this),
            addMissingDependency: this.addMissingDependency.bind(this),
            addContextDependency: this.addContextDependency.bind(this),
            emitFile: this.emitFile.bind(this),
            importModule: this.importModule.bind(this),
            resolve: this.resolve.bind(this)
        });
        if (null == result) return void bypass();
        if ('string' == typeof result || Buffer.isBuffer(result)) return void callback(null, result, map);
        let mergedMap = (generatedSourceMap = result.map, map && generatedSourceMap ? requireCompiledPackage('@jridgewell/remapping')([
            generatedSourceMap,
            map
        ], ()=>null) : generatedSourceMap ?? map);
        callback(null, result.code, mergedMap);
    } catch (error) {
        error instanceof Error ? callback(error) : callback(Error(String(error)));
    }
};
export default transformLoader;
