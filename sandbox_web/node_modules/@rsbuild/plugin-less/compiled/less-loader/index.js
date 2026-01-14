(() => {
  "use strict";
  var __webpack_modules__ = {
    885: (module, __unused_webpack_exports, __nccwpck_require__) => {
      module.exports = __nccwpck_require__(831)["default"];
    },
    831: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var __webpack_unused_export__;
      __webpack_unused_export__ = { value: true };
      exports["default"] = void 0;
      var _path = _interopRequireDefault(__nccwpck_require__(928));
      var _options = _interopRequireDefault(__nccwpck_require__(510));
      var _utils = __nccwpck_require__(954);
      function _interopRequireDefault(e) {
        return e && e.__esModule ? e : { default: e };
      }
      async function lessLoader(source) {
        const options = this.getOptions(_options.default);
        const callback = this.async();
        let implementation;
        try {
          implementation = (0, _utils.getLessImplementation)(
            this,
            options.implementation,
          );
        } catch (error) {
          callback(error);
          return;
        }
        if (!implementation) {
          callback(
            new Error(
              `The Less implementation "${options.implementation}" not found`,
            ),
          );
          return;
        }
        const lessOptions = (0, _utils.getLessOptions)(
          this,
          options,
          implementation,
        );
        const useSourceMap =
          typeof options.sourceMap === "boolean"
            ? options.sourceMap
            : this.sourceMap;
        if (useSourceMap) {
          lessOptions.sourceMap = { outputSourceFiles: true };
        }
        let data = source;
        if (typeof options.additionalData !== "undefined") {
          data =
            typeof options.additionalData === "function"
              ? `${await options.additionalData(data, this)}`
              : `${options.additionalData}\n${data}`;
        }
        const logger = this.getLogger("less-loader");
        const loaderContext = this;
        const loggerListener = {
          error(message) {
            if (options.lessLogAsWarnOrErr) {
              loaderContext.emitError(new Error(message));
            } else {
              logger.error(message);
            }
          },
          warn(message) {
            if (options.lessLogAsWarnOrErr) {
              loaderContext.emitWarning(new Error(message));
            } else {
              logger.warn(message);
            }
          },
          info(message) {
            logger.log(message);
          },
          debug(message) {
            logger.debug(message);
          },
        };
        implementation.logger.addListener(loggerListener);
        let result;
        try {
          result = await implementation.render(data, lessOptions);
        } catch (error) {
          if (error.filename) {
            this.addDependency(_path.default.normalize(error.filename));
          }
          callback((0, _utils.errorFactory)(error));
          return;
        } finally {
          implementation.logger.removeListener(loggerListener);
          delete lessOptions.pluginManager.webpackLoaderContext;
          delete lessOptions.pluginManager;
        }
        const { css, imports } = result;
        imports.forEach((item) => {
          if ((0, _utils.isUnsupportedUrl)(item)) {
            return;
          }
          const normalizedItem = _path.default.normalize(item);
          if (_path.default.isAbsolute(normalizedItem)) {
            this.addDependency(normalizedItem);
          }
        });
        let map =
          typeof result.map === "string" ? JSON.parse(result.map) : result.map;
        if (map && useSourceMap) {
          map = (0, _utils.normalizeSourceMap)(map, this.rootContext);
        }
        callback(null, css, map);
      }
      var _default = (exports["default"] = lessLoader);
    },
    954: (__unused_webpack_module, exports, __nccwpck_require__) => {
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.errorFactory = errorFactory;
      exports.getLessImplementation = getLessImplementation;
      exports.getLessOptions = getLessOptions;
      exports.isUnsupportedUrl = isUnsupportedUrl;
      exports.normalizeSourceMap = normalizeSourceMap;
      var _path = _interopRequireDefault(__nccwpck_require__(928));
      function _interopRequireDefault(e) {
        return e && e.__esModule ? e : { default: e };
      }
      const trailingSlash = /[/\\]$/;
      const IS_SPECIAL_MODULE_IMPORT = /^~[^/]+$/;
      const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;
      const IS_MODULE_IMPORT =
        /^~([^/]+|[^/]+\/|@[^/]+[/][^/]+|@[^/]+\/?|@[^/]+[/][^/]+\/)$/;
      const MODULE_REQUEST_REGEX = /^[^?]*~/;
      function createWebpackLessPlugin(loaderContext, implementation) {
        const lessOptions = loaderContext.getOptions();
        const resolve = loaderContext.getResolve({
          dependencyType: "less",
          conditionNames: ["less", "style", "..."],
          mainFields: ["less", "style", "main", "..."],
          mainFiles: ["index", "..."],
          extensions: [".less", ".css"],
          preferRelative: true,
        });
        class WebpackFileManager extends implementation.FileManager {
          supports(filename) {
            if (filename[0] === "/" || IS_NATIVE_WIN32_PATH.test(filename)) {
              return true;
            }
            if (this.isPathAbsolute(filename)) {
              return false;
            }
            return true;
          }
          supportsSync() {
            return false;
          }
          async resolveFilename(filename, currentDirectory) {
            const context = currentDirectory.replace(trailingSlash, "");
            let request = filename;
            if (MODULE_REQUEST_REGEX.test(filename)) {
              request = request.replace(MODULE_REQUEST_REGEX, "");
            }
            if (IS_MODULE_IMPORT.test(filename)) {
              request =
                request[request.length - 1] === "/" ? request : `${request}/`;
            }
            return this.resolveRequests(context, [
              ...new Set([request, filename]),
            ]);
          }
          async resolveRequests(context, possibleRequests) {
            if (possibleRequests.length === 0) {
              return Promise.reject();
            }
            let result;
            try {
              result = await resolve(context, possibleRequests[0]);
            } catch (error) {
              const [, ...tailPossibleRequests] = possibleRequests;
              if (tailPossibleRequests.length === 0) {
                throw error;
              }
              result = await this.resolveRequests(
                context,
                tailPossibleRequests,
              );
            }
            return result;
          }
          async loadFile(filename, ...args) {
            let result;
            try {
              if (
                IS_SPECIAL_MODULE_IMPORT.test(filename) ||
                lessOptions.webpackImporter === "only"
              ) {
                const error = new Error();
                error.type = "Next";
                throw error;
              }
              result = await super.loadFile(filename, ...args);
            } catch (error) {
              if (error.type !== "File" && error.type !== "Next") {
                return Promise.reject(error);
              }
              try {
                result = await this.resolveFilename(filename, ...args);
              } catch (webpackResolveError) {
                error.message =
                  `Less resolver error:\n${error.message}\n\n` +
                  `Webpack resolver error details:\n${webpackResolveError.details}\n\n` +
                  `Webpack resolver error missing:\n${webpackResolveError.missing}\n\n`;
                return Promise.reject(error);
              }
              loaderContext.addDependency(result);
              return super.loadFile(result, ...args);
            }
            const absoluteFilename = _path.default.isAbsolute(result.filename)
              ? result.filename
              : _path.default.resolve(".", result.filename);
            loaderContext.addDependency(
              _path.default.normalize(absoluteFilename),
            );
            return result;
          }
        }
        return {
          install(lessInstance, pluginManager) {
            pluginManager.addFileManager(new WebpackFileManager());
          },
          minVersion: [3, 0, 0],
        };
      }
      function getLessOptions(loaderContext, loaderOptions, implementation) {
        const options =
          typeof loaderOptions.lessOptions === "function"
            ? loaderOptions.lessOptions(loaderContext) || {}
            : loaderOptions.lessOptions || {};
        const lessOptions = {
          plugins: [],
          relativeUrls: true,
          filename: loaderContext.resourcePath,
          ...options,
        };
        const plugins = lessOptions.plugins.slice();
        const shouldUseWebpackImporter =
          typeof loaderOptions.webpackImporter === "boolean" ||
          loaderOptions.webpackImporter === "only"
            ? loaderOptions.webpackImporter
            : true;
        if (shouldUseWebpackImporter) {
          plugins.unshift(
            createWebpackLessPlugin(loaderContext, implementation),
          );
        }
        plugins.unshift({
          install(lessProcessor, pluginManager) {
            pluginManager.webpackLoaderContext = loaderContext;
            lessOptions.pluginManager = pluginManager;
          },
        });
        lessOptions.plugins = plugins;
        return lessOptions;
      }
      function isUnsupportedUrl(url) {
        if (IS_NATIVE_WIN32_PATH.test(url)) {
          return false;
        }
        return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
      }
      function normalizeSourceMap(map) {
        const newMap = map;
        delete newMap.file;
        newMap.sourceRoot = "";
        newMap.sources = newMap.sources.map((source) =>
          _path.default.normalize(source),
        );
        return newMap;
      }
      function getLessImplementation(loaderContext, implementation) {
        let resolvedImplementation = implementation;
        if (!implementation || typeof implementation === "string") {
          const lessImplPkg = implementation || "less";
          resolvedImplementation = require(lessImplPkg);
        }
        return resolvedImplementation;
      }
      function getFileExcerptIfPossible(error) {
        if (typeof error.extract === "undefined") {
          return [];
        }
        const excerpt = error.extract.slice(0, 2);
        const column = Math.max(error.column - 1, 0);
        if (typeof excerpt[0] === "undefined") {
          excerpt.shift();
        }
        excerpt.push(`${new Array(column).join(" ")}^`);
        return excerpt;
      }
      function errorFactory(error) {
        const message = [
          "\n",
          ...getFileExcerptIfPossible(error),
          error.message.charAt(0).toUpperCase() + error.message.slice(1),
          error.filename
            ? `      Error in ${_path.default.normalize(error.filename)} (line ${error.line}, column ${error.column})`
            : "",
        ].join("\n");
        const obj = new Error(message, { cause: error });
        obj.stack = null;
        return obj;
      }
    },
    928: (module) => {
      module.exports = require("path");
    },
    510: (module) => {
      module.exports = JSON.parse(
        '{"title":"Less Loader options","type":"object","properties":{"lessOptions":{"description":"Options to pass through to `Less`.","link":"https://github.com/webpack-contrib/less-loader#lessoptions","anyOf":[{"type":"object","additionalProperties":true},{"instanceof":"Function"}]},"additionalData":{"description":"Prepends/Appends `Less` code to the actual entry file.","link":"https://github.com/webpack-contrib/less-loader#additionalData","anyOf":[{"type":"string"},{"instanceof":"Function"}]},"sourceMap":{"description":"Enables/Disables generation of source maps.","link":"https://github.com/webpack-contrib/less-loader#sourcemap","type":"boolean"},"webpackImporter":{"description":"Enables/Disables default `webpack` importer.","link":"https://github.com/webpack-contrib/less-loader#webpackimporter","anyOf":[{"type":"boolean"},{"type":"string","enum":["only"]}]},"implementation":{"description":"The implementation of the `Less` to be used.","link":"https://github.com/webpack-contrib/less-loader#implementation","anyOf":[{"type":"string"},{"type":"object"}]},"lessLogAsWarnOrErr":{"description":"Less warnings and errors will be webpack warnings or errors.","link":"https://github.com/webpack-contrib/less-loader#lesslogaswarnorerr","type":"boolean"}},"additionalProperties":false}',
      );
    },
  };
  var __webpack_module_cache__ = {};
  function __nccwpck_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }
    var module = (__webpack_module_cache__[moduleId] = { exports: {} });
    var threw = true;
    try {
      __webpack_modules__[moduleId](
        module,
        module.exports,
        __nccwpck_require__,
      );
      threw = false;
    } finally {
      if (threw) delete __webpack_module_cache__[moduleId];
    }
    return module.exports;
  }
  if (typeof __nccwpck_require__ !== "undefined")
    __nccwpck_require__.ab = __dirname + "/";
  var __webpack_exports__ = __nccwpck_require__(885);
  module.exports = __webpack_exports__;
})();
