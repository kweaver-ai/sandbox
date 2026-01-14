(() => {
  var __webpack_modules__ = {
    284: function (module, __unused_webpack_exports, __nccwpck_require__) {
      module = __nccwpck_require__.nmd(module);
      (function (global, factory) {
        if (true) {
          factory(module, __nccwpck_require__(73), __nccwpck_require__(462));
          module.exports = def(module);
        } else {
        }
        function def(m) {
          return "default" in m.exports ? m.exports.default : m.exports;
        }
      })(this, function (module, require_sourcemapCodec, require_traceMapping) {
        "use strict";
        var __create = Object.create;
        var __defProp = Object.defineProperty;
        var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __getProtoOf = Object.getPrototypeOf;
        var __hasOwnProp = Object.prototype.hasOwnProperty;
        var __commonJS = (cb, mod) =>
          function __require() {
            return (
              mod ||
                (0, cb[__getOwnPropNames(cb)[0]])(
                  (mod = { exports: {} }).exports,
                  mod,
                ),
              mod.exports
            );
          };
        var __export = (target, all) => {
          for (var name in all)
            __defProp(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps = (to, from, except, desc) => {
          if (
            (from && typeof from === "object") ||
            typeof from === "function"
          ) {
            for (let key of __getOwnPropNames(from))
              if (!__hasOwnProp.call(to, key) && key !== except)
                __defProp(to, key, {
                  get: () => from[key],
                  enumerable:
                    !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
                });
          }
          return to;
        };
        var __toESM = (mod, isNodeMode, target) => (
          (target = mod != null ? __create(__getProtoOf(mod)) : {}),
          __copyProps(
            isNodeMode || !mod || !mod.__esModule
              ? __defProp(target, "default", { value: mod, enumerable: true })
              : target,
            mod,
          )
        );
        var __toCommonJS = (mod) =>
          __copyProps(__defProp({}, "__esModule", { value: true }), mod);
        var require_sourcemap_codec = __commonJS({
          "umd:@jridgewell/sourcemap-codec"(exports, module2) {
            module2.exports = require_sourcemapCodec;
          },
        });
        var require_trace_mapping = __commonJS({
          "umd:@jridgewell/trace-mapping"(exports, module2) {
            module2.exports = require_traceMapping;
          },
        });
        var gen_mapping_exports = {};
        __export(gen_mapping_exports, {
          GenMapping: () => GenMapping,
          addMapping: () => addMapping,
          addSegment: () => addSegment,
          allMappings: () => allMappings,
          fromMap: () => fromMap,
          maybeAddMapping: () => maybeAddMapping,
          maybeAddSegment: () => maybeAddSegment,
          setIgnore: () => setIgnore,
          setSourceContent: () => setSourceContent,
          toDecodedMap: () => toDecodedMap,
          toEncodedMap: () => toEncodedMap,
        });
        module.exports = __toCommonJS(gen_mapping_exports);
        var SetArray = class {
          constructor() {
            this._indexes = { __proto__: null };
            this.array = [];
          }
        };
        function cast(set) {
          return set;
        }
        function get(setarr, key) {
          return cast(setarr)._indexes[key];
        }
        function put(setarr, key) {
          const index = get(setarr, key);
          if (index !== void 0) return index;
          const { array, _indexes: indexes } = cast(setarr);
          const length = array.push(key);
          return (indexes[key] = length - 1);
        }
        function remove(setarr, key) {
          const index = get(setarr, key);
          if (index === void 0) return;
          const { array, _indexes: indexes } = cast(setarr);
          for (let i = index + 1; i < array.length; i++) {
            const k = array[i];
            array[i - 1] = k;
            indexes[k]--;
          }
          indexes[key] = void 0;
          array.pop();
        }
        var import_sourcemap_codec = __toESM(require_sourcemap_codec());
        var import_trace_mapping = __toESM(require_trace_mapping());
        var COLUMN = 0;
        var SOURCES_INDEX = 1;
        var SOURCE_LINE = 2;
        var SOURCE_COLUMN = 3;
        var NAMES_INDEX = 4;
        var NO_NAME = -1;
        var GenMapping = class {
          constructor({ file, sourceRoot } = {}) {
            this._names = new SetArray();
            this._sources = new SetArray();
            this._sourcesContent = [];
            this._mappings = [];
            this.file = file;
            this.sourceRoot = sourceRoot;
            this._ignoreList = new SetArray();
          }
        };
        function cast2(map) {
          return map;
        }
        function addSegment(
          map,
          genLine,
          genColumn,
          source,
          sourceLine,
          sourceColumn,
          name,
          content,
        ) {
          return addSegmentInternal(
            false,
            map,
            genLine,
            genColumn,
            source,
            sourceLine,
            sourceColumn,
            name,
            content,
          );
        }
        function addMapping(map, mapping) {
          return addMappingInternal(false, map, mapping);
        }
        var maybeAddSegment = (
          map,
          genLine,
          genColumn,
          source,
          sourceLine,
          sourceColumn,
          name,
          content,
        ) =>
          addSegmentInternal(
            true,
            map,
            genLine,
            genColumn,
            source,
            sourceLine,
            sourceColumn,
            name,
            content,
          );
        var maybeAddMapping = (map, mapping) =>
          addMappingInternal(true, map, mapping);
        function setSourceContent(map, source, content) {
          const { _sources: sources, _sourcesContent: sourcesContent } =
            cast2(map);
          const index = put(sources, source);
          sourcesContent[index] = content;
        }
        function setIgnore(map, source, ignore = true) {
          const {
            _sources: sources,
            _sourcesContent: sourcesContent,
            _ignoreList: ignoreList,
          } = cast2(map);
          const index = put(sources, source);
          if (index === sourcesContent.length) sourcesContent[index] = null;
          if (ignore) put(ignoreList, index);
          else remove(ignoreList, index);
        }
        function toDecodedMap(map) {
          const {
            _mappings: mappings,
            _sources: sources,
            _sourcesContent: sourcesContent,
            _names: names,
            _ignoreList: ignoreList,
          } = cast2(map);
          removeEmptyFinalLines(mappings);
          return {
            version: 3,
            file: map.file || void 0,
            names: names.array,
            sourceRoot: map.sourceRoot || void 0,
            sources: sources.array,
            sourcesContent,
            mappings,
            ignoreList: ignoreList.array,
          };
        }
        function toEncodedMap(map) {
          const decoded = toDecodedMap(map);
          return Object.assign({}, decoded, {
            mappings: (0, import_sourcemap_codec.encode)(decoded.mappings),
          });
        }
        function fromMap(input) {
          const map = new import_trace_mapping.TraceMap(input);
          const gen = new GenMapping({
            file: map.file,
            sourceRoot: map.sourceRoot,
          });
          putAll(cast2(gen)._names, map.names);
          putAll(cast2(gen)._sources, map.sources);
          cast2(gen)._sourcesContent =
            map.sourcesContent || map.sources.map(() => null);
          cast2(gen)._mappings = (0, import_trace_mapping.decodedMappings)(map);
          if (map.ignoreList) putAll(cast2(gen)._ignoreList, map.ignoreList);
          return gen;
        }
        function allMappings(map) {
          const out = [];
          const {
            _mappings: mappings,
            _sources: sources,
            _names: names,
          } = cast2(map);
          for (let i = 0; i < mappings.length; i++) {
            const line = mappings[i];
            for (let j = 0; j < line.length; j++) {
              const seg = line[j];
              const generated = { line: i + 1, column: seg[COLUMN] };
              let source = void 0;
              let original = void 0;
              let name = void 0;
              if (seg.length !== 1) {
                source = sources.array[seg[SOURCES_INDEX]];
                original = {
                  line: seg[SOURCE_LINE] + 1,
                  column: seg[SOURCE_COLUMN],
                };
                if (seg.length === 5) name = names.array[seg[NAMES_INDEX]];
              }
              out.push({ generated, source, original, name });
            }
          }
          return out;
        }
        function addSegmentInternal(
          skipable,
          map,
          genLine,
          genColumn,
          source,
          sourceLine,
          sourceColumn,
          name,
          content,
        ) {
          const {
            _mappings: mappings,
            _sources: sources,
            _sourcesContent: sourcesContent,
            _names: names,
          } = cast2(map);
          const line = getIndex(mappings, genLine);
          const index = getColumnIndex(line, genColumn);
          if (!source) {
            if (skipable && skipSourceless(line, index)) return;
            return insert(line, index, [genColumn]);
          }
          assert(sourceLine);
          assert(sourceColumn);
          const sourcesIndex = put(sources, source);
          const namesIndex = name ? put(names, name) : NO_NAME;
          if (sourcesIndex === sourcesContent.length)
            sourcesContent[sourcesIndex] = content != null ? content : null;
          if (
            skipable &&
            skipSource(
              line,
              index,
              sourcesIndex,
              sourceLine,
              sourceColumn,
              namesIndex,
            )
          ) {
            return;
          }
          return insert(
            line,
            index,
            name
              ? [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex]
              : [genColumn, sourcesIndex, sourceLine, sourceColumn],
          );
        }
        function assert(_val) {}
        function getIndex(arr, index) {
          for (let i = arr.length; i <= index; i++) {
            arr[i] = [];
          }
          return arr[index];
        }
        function getColumnIndex(line, genColumn) {
          let index = line.length;
          for (let i = index - 1; i >= 0; index = i--) {
            const current = line[i];
            if (genColumn >= current[COLUMN]) break;
          }
          return index;
        }
        function insert(array, index, value) {
          for (let i = array.length; i > index; i--) {
            array[i] = array[i - 1];
          }
          array[index] = value;
        }
        function removeEmptyFinalLines(mappings) {
          const { length } = mappings;
          let len = length;
          for (let i = len - 1; i >= 0; len = i, i--) {
            if (mappings[i].length > 0) break;
          }
          if (len < length) mappings.length = len;
        }
        function putAll(setarr, array) {
          for (let i = 0; i < array.length; i++) put(setarr, array[i]);
        }
        function skipSourceless(line, index) {
          if (index === 0) return true;
          const prev = line[index - 1];
          return prev.length === 1;
        }
        function skipSource(
          line,
          index,
          sourcesIndex,
          sourceLine,
          sourceColumn,
          namesIndex,
        ) {
          if (index === 0) return false;
          const prev = line[index - 1];
          if (prev.length === 1) return false;
          return (
            sourcesIndex === prev[SOURCES_INDEX] &&
            sourceLine === prev[SOURCE_LINE] &&
            sourceColumn === prev[SOURCE_COLUMN] &&
            namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME)
          );
        }
        function addMappingInternal(skipable, map, mapping) {
          const { generated, source, original, name, content } = mapping;
          if (!source) {
            return addSegmentInternal(
              skipable,
              map,
              generated.line - 1,
              generated.column,
              null,
              null,
              null,
              null,
              null,
            );
          }
          assert(original);
          return addSegmentInternal(
            skipable,
            map,
            generated.line - 1,
            generated.column,
            source,
            original.line - 1,
            original.column,
            name,
            content,
          );
        }
      });
    },
    767: function (module, __unused_webpack_exports, __nccwpck_require__) {
      module = __nccwpck_require__.nmd(module);
      (function (global, factory) {
        if (true) {
          factory(module, __nccwpck_require__(284), __nccwpck_require__(462));
          module.exports = def(module);
        } else {
        }
        function def(m) {
          return "default" in m.exports ? m.exports.default : m.exports;
        }
      })(this, function (module, require_genMapping, require_traceMapping) {
        "use strict";
        var __create = Object.create;
        var __defProp = Object.defineProperty;
        var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __getProtoOf = Object.getPrototypeOf;
        var __hasOwnProp = Object.prototype.hasOwnProperty;
        var __commonJS = (cb, mod) =>
          function __require() {
            return (
              mod ||
                (0, cb[__getOwnPropNames(cb)[0]])(
                  (mod = { exports: {} }).exports,
                  mod,
                ),
              mod.exports
            );
          };
        var __export = (target, all) => {
          for (var name in all)
            __defProp(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps = (to, from, except, desc) => {
          if (
            (from && typeof from === "object") ||
            typeof from === "function"
          ) {
            for (let key of __getOwnPropNames(from))
              if (!__hasOwnProp.call(to, key) && key !== except)
                __defProp(to, key, {
                  get: () => from[key],
                  enumerable:
                    !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
                });
          }
          return to;
        };
        var __toESM = (mod, isNodeMode, target) => (
          (target = mod != null ? __create(__getProtoOf(mod)) : {}),
          __copyProps(
            isNodeMode || !mod || !mod.__esModule
              ? __defProp(target, "default", { value: mod, enumerable: true })
              : target,
            mod,
          )
        );
        var __toCommonJS = (mod) =>
          __copyProps(__defProp({}, "__esModule", { value: true }), mod);
        var require_trace_mapping = __commonJS({
          "umd:@jridgewell/trace-mapping"(exports, module2) {
            module2.exports = require_traceMapping;
          },
        });
        var require_gen_mapping = __commonJS({
          "umd:@jridgewell/gen-mapping"(exports, module2) {
            module2.exports = require_genMapping;
          },
        });
        var remapping_exports = {};
        __export(remapping_exports, { default: () => remapping });
        module.exports = __toCommonJS(remapping_exports);
        var import_trace_mapping2 = __toESM(require_trace_mapping());
        var import_gen_mapping = __toESM(require_gen_mapping());
        var import_trace_mapping = __toESM(require_trace_mapping());
        var SOURCELESS_MAPPING = SegmentObject("", -1, -1, "", null, false);
        var EMPTY_SOURCES = [];
        function SegmentObject(source, line, column, name, content, ignore) {
          return { source, line, column, name, content, ignore };
        }
        function Source(map, sources, source, content, ignore) {
          return { map, sources, source, content, ignore };
        }
        function MapSource(map, sources) {
          return Source(map, sources, "", null, false);
        }
        function OriginalSource(source, content, ignore) {
          return Source(null, EMPTY_SOURCES, source, content, ignore);
        }
        function traceMappings(tree) {
          const gen = new import_gen_mapping.GenMapping({
            file: tree.map.file,
          });
          const { sources: rootSources, map } = tree;
          const rootNames = map.names;
          const rootMappings = (0, import_trace_mapping.decodedMappings)(map);
          for (let i = 0; i < rootMappings.length; i++) {
            const segments = rootMappings[i];
            for (let j = 0; j < segments.length; j++) {
              const segment = segments[j];
              const genCol = segment[0];
              let traced = SOURCELESS_MAPPING;
              if (segment.length !== 1) {
                const source2 = rootSources[segment[1]];
                traced = originalPositionFor(
                  source2,
                  segment[2],
                  segment[3],
                  segment.length === 5 ? rootNames[segment[4]] : "",
                );
                if (traced == null) continue;
              }
              const { column, line, name, content, source, ignore } = traced;
              (0, import_gen_mapping.maybeAddSegment)(
                gen,
                i,
                genCol,
                source,
                line,
                column,
                name,
              );
              if (source && content != null)
                (0, import_gen_mapping.setSourceContent)(gen, source, content);
              if (ignore) (0, import_gen_mapping.setIgnore)(gen, source, true);
            }
          }
          return gen;
        }
        function originalPositionFor(source, line, column, name) {
          if (!source.map) {
            return SegmentObject(
              source.source,
              line,
              column,
              name,
              source.content,
              source.ignore,
            );
          }
          const segment = (0, import_trace_mapping.traceSegment)(
            source.map,
            line,
            column,
          );
          if (segment == null) return null;
          if (segment.length === 1) return SOURCELESS_MAPPING;
          return originalPositionFor(
            source.sources[segment[1]],
            segment[2],
            segment[3],
            segment.length === 5 ? source.map.names[segment[4]] : name,
          );
        }
        function asArray(value) {
          if (Array.isArray(value)) return value;
          return [value];
        }
        function buildSourceMapTree(input, loader) {
          const maps = asArray(input).map(
            (m) => new import_trace_mapping2.TraceMap(m, ""),
          );
          const map = maps.pop();
          for (let i = 0; i < maps.length; i++) {
            if (maps[i].sources.length > 1) {
              throw new Error(
                `Transformation map ${i} must have exactly one source file.\nDid you specify these with the most recent transformation maps first?`,
              );
            }
          }
          let tree = build(map, loader, "", 0);
          for (let i = maps.length - 1; i >= 0; i--) {
            tree = MapSource(maps[i], [tree]);
          }
          return tree;
        }
        function build(map, loader, importer, importerDepth) {
          const { resolvedSources, sourcesContent, ignoreList } = map;
          const depth = importerDepth + 1;
          const children = resolvedSources.map((sourceFile, i) => {
            const ctx = {
              importer,
              depth,
              source: sourceFile || "",
              content: void 0,
              ignore: void 0,
            };
            const sourceMap = loader(ctx.source, ctx);
            const { source, content, ignore } = ctx;
            if (sourceMap)
              return build(
                new import_trace_mapping2.TraceMap(sourceMap, source),
                loader,
                source,
                depth,
              );
            const sourceContent =
              content !== void 0
                ? content
                : sourcesContent
                  ? sourcesContent[i]
                  : null;
            const ignored =
              ignore !== void 0
                ? ignore
                : ignoreList
                  ? ignoreList.includes(i)
                  : false;
            return OriginalSource(source, sourceContent, ignored);
          });
          return MapSource(map, children);
        }
        var import_gen_mapping2 = __toESM(require_gen_mapping());
        var SourceMap = class {
          constructor(map, options) {
            const out = options.decodedMappings
              ? (0, import_gen_mapping2.toDecodedMap)(map)
              : (0, import_gen_mapping2.toEncodedMap)(map);
            this.version = out.version;
            this.file = out.file;
            this.mappings = out.mappings;
            this.names = out.names;
            this.ignoreList = out.ignoreList;
            this.sourceRoot = out.sourceRoot;
            this.sources = out.sources;
            if (!options.excludeContent) {
              this.sourcesContent = out.sourcesContent;
            }
          }
          toString() {
            return JSON.stringify(this);
          }
        };
        function remapping(input, loader, options) {
          const opts =
            typeof options === "object"
              ? options
              : { excludeContent: !!options, decodedMappings: false };
          const tree = buildSourceMapTree(input, loader);
          return new SourceMap(traceMappings(tree), opts);
        }
      });
    },
    73: function (module, __unused_webpack_exports, __nccwpck_require__) {
      module = __nccwpck_require__.nmd(module);
      (function (global, factory) {
        if (true) {
          factory(module);
          module.exports = def(module);
        } else {
        }
        function def(m) {
          return "default" in m.exports ? m.exports.default : m.exports;
        }
      })(this, function (module) {
        "use strict";
        var __defProp = Object.defineProperty;
        var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __hasOwnProp = Object.prototype.hasOwnProperty;
        var __export = (target, all) => {
          for (var name in all)
            __defProp(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps = (to, from, except, desc) => {
          if (
            (from && typeof from === "object") ||
            typeof from === "function"
          ) {
            for (let key of __getOwnPropNames(from))
              if (!__hasOwnProp.call(to, key) && key !== except)
                __defProp(to, key, {
                  get: () => from[key],
                  enumerable:
                    !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
                });
          }
          return to;
        };
        var __toCommonJS = (mod) =>
          __copyProps(__defProp({}, "__esModule", { value: true }), mod);
        var sourcemap_codec_exports = {};
        __export(sourcemap_codec_exports, {
          decode: () => decode,
          decodeGeneratedRanges: () => decodeGeneratedRanges,
          decodeOriginalScopes: () => decodeOriginalScopes,
          encode: () => encode,
          encodeGeneratedRanges: () => encodeGeneratedRanges,
          encodeOriginalScopes: () => encodeOriginalScopes,
        });
        module.exports = __toCommonJS(sourcemap_codec_exports);
        var comma = ",".charCodeAt(0);
        var semicolon = ";".charCodeAt(0);
        var chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var intToChar = new Uint8Array(64);
        var charToInt = new Uint8Array(128);
        for (let i = 0; i < chars.length; i++) {
          const c = chars.charCodeAt(i);
          intToChar[i] = c;
          charToInt[c] = i;
        }
        function decodeInteger(reader, relative) {
          let value = 0;
          let shift = 0;
          let integer = 0;
          do {
            const c = reader.next();
            integer = charToInt[c];
            value |= (integer & 31) << shift;
            shift += 5;
          } while (integer & 32);
          const shouldNegate = value & 1;
          value >>>= 1;
          if (shouldNegate) {
            value = -2147483648 | -value;
          }
          return relative + value;
        }
        function encodeInteger(builder, num, relative) {
          let delta = num - relative;
          delta = delta < 0 ? (-delta << 1) | 1 : delta << 1;
          do {
            let clamped = delta & 31;
            delta >>>= 5;
            if (delta > 0) clamped |= 32;
            builder.write(intToChar[clamped]);
          } while (delta > 0);
          return num;
        }
        function hasMoreVlq(reader, max) {
          if (reader.pos >= max) return false;
          return reader.peek() !== comma;
        }
        var bufLength = 1024 * 16;
        var td =
          typeof TextDecoder !== "undefined"
            ? new TextDecoder()
            : typeof Buffer !== "undefined"
              ? {
                  decode(buf) {
                    const out = Buffer.from(
                      buf.buffer,
                      buf.byteOffset,
                      buf.byteLength,
                    );
                    return out.toString();
                  },
                }
              : {
                  decode(buf) {
                    let out = "";
                    for (let i = 0; i < buf.length; i++) {
                      out += String.fromCharCode(buf[i]);
                    }
                    return out;
                  },
                };
        var StringWriter = class {
          constructor() {
            this.pos = 0;
            this.out = "";
            this.buffer = new Uint8Array(bufLength);
          }
          write(v) {
            const { buffer } = this;
            buffer[this.pos++] = v;
            if (this.pos === bufLength) {
              this.out += td.decode(buffer);
              this.pos = 0;
            }
          }
          flush() {
            const { buffer, out, pos } = this;
            return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
          }
        };
        var StringReader = class {
          constructor(buffer) {
            this.pos = 0;
            this.buffer = buffer;
          }
          next() {
            return this.buffer.charCodeAt(this.pos++);
          }
          peek() {
            return this.buffer.charCodeAt(this.pos);
          }
          indexOf(char) {
            const { buffer, pos } = this;
            const idx = buffer.indexOf(char, pos);
            return idx === -1 ? buffer.length : idx;
          }
        };
        var EMPTY = [];
        function decodeOriginalScopes(input) {
          const { length } = input;
          const reader = new StringReader(input);
          const scopes = [];
          const stack = [];
          let line = 0;
          for (; reader.pos < length; reader.pos++) {
            line = decodeInteger(reader, line);
            const column = decodeInteger(reader, 0);
            if (!hasMoreVlq(reader, length)) {
              const last = stack.pop();
              last[2] = line;
              last[3] = column;
              continue;
            }
            const kind = decodeInteger(reader, 0);
            const fields = decodeInteger(reader, 0);
            const hasName = fields & 1;
            const scope = hasName
              ? [line, column, 0, 0, kind, decodeInteger(reader, 0)]
              : [line, column, 0, 0, kind];
            let vars = EMPTY;
            if (hasMoreVlq(reader, length)) {
              vars = [];
              do {
                const varsIndex = decodeInteger(reader, 0);
                vars.push(varsIndex);
              } while (hasMoreVlq(reader, length));
            }
            scope.vars = vars;
            scopes.push(scope);
            stack.push(scope);
          }
          return scopes;
        }
        function encodeOriginalScopes(scopes) {
          const writer = new StringWriter();
          for (let i = 0; i < scopes.length; ) {
            i = _encodeOriginalScopes(scopes, i, writer, [0]);
          }
          return writer.flush();
        }
        function _encodeOriginalScopes(scopes, index, writer, state) {
          const scope = scopes[index];
          const {
            0: startLine,
            1: startColumn,
            2: endLine,
            3: endColumn,
            4: kind,
            vars,
          } = scope;
          if (index > 0) writer.write(comma);
          state[0] = encodeInteger(writer, startLine, state[0]);
          encodeInteger(writer, startColumn, 0);
          encodeInteger(writer, kind, 0);
          const fields = scope.length === 6 ? 1 : 0;
          encodeInteger(writer, fields, 0);
          if (scope.length === 6) encodeInteger(writer, scope[5], 0);
          for (const v of vars) {
            encodeInteger(writer, v, 0);
          }
          for (index++; index < scopes.length; ) {
            const next = scopes[index];
            const { 0: l, 1: c } = next;
            if (l > endLine || (l === endLine && c >= endColumn)) {
              break;
            }
            index = _encodeOriginalScopes(scopes, index, writer, state);
          }
          writer.write(comma);
          state[0] = encodeInteger(writer, endLine, state[0]);
          encodeInteger(writer, endColumn, 0);
          return index;
        }
        function decodeGeneratedRanges(input) {
          const { length } = input;
          const reader = new StringReader(input);
          const ranges = [];
          const stack = [];
          let genLine = 0;
          let definitionSourcesIndex = 0;
          let definitionScopeIndex = 0;
          let callsiteSourcesIndex = 0;
          let callsiteLine = 0;
          let callsiteColumn = 0;
          let bindingLine = 0;
          let bindingColumn = 0;
          do {
            const semi = reader.indexOf(";");
            let genColumn = 0;
            for (; reader.pos < semi; reader.pos++) {
              genColumn = decodeInteger(reader, genColumn);
              if (!hasMoreVlq(reader, semi)) {
                const last = stack.pop();
                last[2] = genLine;
                last[3] = genColumn;
                continue;
              }
              const fields = decodeInteger(reader, 0);
              const hasDefinition = fields & 1;
              const hasCallsite = fields & 2;
              const hasScope = fields & 4;
              let callsite = null;
              let bindings = EMPTY;
              let range;
              if (hasDefinition) {
                const defSourcesIndex = decodeInteger(
                  reader,
                  definitionSourcesIndex,
                );
                definitionScopeIndex = decodeInteger(
                  reader,
                  definitionSourcesIndex === defSourcesIndex
                    ? definitionScopeIndex
                    : 0,
                );
                definitionSourcesIndex = defSourcesIndex;
                range = [
                  genLine,
                  genColumn,
                  0,
                  0,
                  defSourcesIndex,
                  definitionScopeIndex,
                ];
              } else {
                range = [genLine, genColumn, 0, 0];
              }
              range.isScope = !!hasScope;
              if (hasCallsite) {
                const prevCsi = callsiteSourcesIndex;
                const prevLine = callsiteLine;
                callsiteSourcesIndex = decodeInteger(
                  reader,
                  callsiteSourcesIndex,
                );
                const sameSource = prevCsi === callsiteSourcesIndex;
                callsiteLine = decodeInteger(
                  reader,
                  sameSource ? callsiteLine : 0,
                );
                callsiteColumn = decodeInteger(
                  reader,
                  sameSource && prevLine === callsiteLine ? callsiteColumn : 0,
                );
                callsite = [callsiteSourcesIndex, callsiteLine, callsiteColumn];
              }
              range.callsite = callsite;
              if (hasMoreVlq(reader, semi)) {
                bindings = [];
                do {
                  bindingLine = genLine;
                  bindingColumn = genColumn;
                  const expressionsCount = decodeInteger(reader, 0);
                  let expressionRanges;
                  if (expressionsCount < -1) {
                    expressionRanges = [[decodeInteger(reader, 0)]];
                    for (let i = -1; i > expressionsCount; i--) {
                      const prevBl = bindingLine;
                      bindingLine = decodeInteger(reader, bindingLine);
                      bindingColumn = decodeInteger(
                        reader,
                        bindingLine === prevBl ? bindingColumn : 0,
                      );
                      const expression = decodeInteger(reader, 0);
                      expressionRanges.push([
                        expression,
                        bindingLine,
                        bindingColumn,
                      ]);
                    }
                  } else {
                    expressionRanges = [[expressionsCount]];
                  }
                  bindings.push(expressionRanges);
                } while (hasMoreVlq(reader, semi));
              }
              range.bindings = bindings;
              ranges.push(range);
              stack.push(range);
            }
            genLine++;
            reader.pos = semi + 1;
          } while (reader.pos < length);
          return ranges;
        }
        function encodeGeneratedRanges(ranges) {
          if (ranges.length === 0) return "";
          const writer = new StringWriter();
          for (let i = 0; i < ranges.length; ) {
            i = _encodeGeneratedRanges(
              ranges,
              i,
              writer,
              [0, 0, 0, 0, 0, 0, 0],
            );
          }
          return writer.flush();
        }
        function _encodeGeneratedRanges(ranges, index, writer, state) {
          const range = ranges[index];
          const {
            0: startLine,
            1: startColumn,
            2: endLine,
            3: endColumn,
            isScope,
            callsite,
            bindings,
          } = range;
          if (state[0] < startLine) {
            catchupLine(writer, state[0], startLine);
            state[0] = startLine;
            state[1] = 0;
          } else if (index > 0) {
            writer.write(comma);
          }
          state[1] = encodeInteger(writer, range[1], state[1]);
          const fields =
            (range.length === 6 ? 1 : 0) |
            (callsite ? 2 : 0) |
            (isScope ? 4 : 0);
          encodeInteger(writer, fields, 0);
          if (range.length === 6) {
            const { 4: sourcesIndex, 5: scopesIndex } = range;
            if (sourcesIndex !== state[2]) {
              state[3] = 0;
            }
            state[2] = encodeInteger(writer, sourcesIndex, state[2]);
            state[3] = encodeInteger(writer, scopesIndex, state[3]);
          }
          if (callsite) {
            const {
              0: sourcesIndex,
              1: callLine,
              2: callColumn,
            } = range.callsite;
            if (sourcesIndex !== state[4]) {
              state[5] = 0;
              state[6] = 0;
            } else if (callLine !== state[5]) {
              state[6] = 0;
            }
            state[4] = encodeInteger(writer, sourcesIndex, state[4]);
            state[5] = encodeInteger(writer, callLine, state[5]);
            state[6] = encodeInteger(writer, callColumn, state[6]);
          }
          if (bindings) {
            for (const binding of bindings) {
              if (binding.length > 1) encodeInteger(writer, -binding.length, 0);
              const expression = binding[0][0];
              encodeInteger(writer, expression, 0);
              let bindingStartLine = startLine;
              let bindingStartColumn = startColumn;
              for (let i = 1; i < binding.length; i++) {
                const expRange = binding[i];
                bindingStartLine = encodeInteger(
                  writer,
                  expRange[1],
                  bindingStartLine,
                );
                bindingStartColumn = encodeInteger(
                  writer,
                  expRange[2],
                  bindingStartColumn,
                );
                encodeInteger(writer, expRange[0], 0);
              }
            }
          }
          for (index++; index < ranges.length; ) {
            const next = ranges[index];
            const { 0: l, 1: c } = next;
            if (l > endLine || (l === endLine && c >= endColumn)) {
              break;
            }
            index = _encodeGeneratedRanges(ranges, index, writer, state);
          }
          if (state[0] < endLine) {
            catchupLine(writer, state[0], endLine);
            state[0] = endLine;
            state[1] = 0;
          } else {
            writer.write(comma);
          }
          state[1] = encodeInteger(writer, endColumn, state[1]);
          return index;
        }
        function catchupLine(writer, lastLine, line) {
          do {
            writer.write(semicolon);
          } while (++lastLine < line);
        }
        function decode(mappings) {
          const { length } = mappings;
          const reader = new StringReader(mappings);
          const decoded = [];
          let genColumn = 0;
          let sourcesIndex = 0;
          let sourceLine = 0;
          let sourceColumn = 0;
          let namesIndex = 0;
          do {
            const semi = reader.indexOf(";");
            const line = [];
            let sorted = true;
            let lastCol = 0;
            genColumn = 0;
            while (reader.pos < semi) {
              let seg;
              genColumn = decodeInteger(reader, genColumn);
              if (genColumn < lastCol) sorted = false;
              lastCol = genColumn;
              if (hasMoreVlq(reader, semi)) {
                sourcesIndex = decodeInteger(reader, sourcesIndex);
                sourceLine = decodeInteger(reader, sourceLine);
                sourceColumn = decodeInteger(reader, sourceColumn);
                if (hasMoreVlq(reader, semi)) {
                  namesIndex = decodeInteger(reader, namesIndex);
                  seg = [
                    genColumn,
                    sourcesIndex,
                    sourceLine,
                    sourceColumn,
                    namesIndex,
                  ];
                } else {
                  seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
                }
              } else {
                seg = [genColumn];
              }
              line.push(seg);
              reader.pos++;
            }
            if (!sorted) sort(line);
            decoded.push(line);
            reader.pos = semi + 1;
          } while (reader.pos <= length);
          return decoded;
        }
        function sort(line) {
          line.sort(sortComparator);
        }
        function sortComparator(a, b) {
          return a[0] - b[0];
        }
        function encode(decoded) {
          const writer = new StringWriter();
          let sourcesIndex = 0;
          let sourceLine = 0;
          let sourceColumn = 0;
          let namesIndex = 0;
          for (let i = 0; i < decoded.length; i++) {
            const line = decoded[i];
            if (i > 0) writer.write(semicolon);
            if (line.length === 0) continue;
            let genColumn = 0;
            for (let j = 0; j < line.length; j++) {
              const segment = line[j];
              if (j > 0) writer.write(comma);
              genColumn = encodeInteger(writer, segment[0], genColumn);
              if (segment.length === 1) continue;
              sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex);
              sourceLine = encodeInteger(writer, segment[2], sourceLine);
              sourceColumn = encodeInteger(writer, segment[3], sourceColumn);
              if (segment.length === 4) continue;
              namesIndex = encodeInteger(writer, segment[4], namesIndex);
            }
          }
          return writer.flush();
        }
      });
    },
    462: (module) => {
      "use strict";
      module.exports = require("../trace-mapping/index.js");
    },
  };
  var __webpack_module_cache__ = {};
  function __nccwpck_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }
    var module = (__webpack_module_cache__[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {},
    });
    var threw = true;
    try {
      __webpack_modules__[moduleId].call(
        module.exports,
        module,
        module.exports,
        __nccwpck_require__,
      );
      threw = false;
    } finally {
      if (threw) delete __webpack_module_cache__[moduleId];
    }
    module.loaded = true;
    return module.exports;
  }
  (() => {
    __nccwpck_require__.nmd = (module) => {
      module.paths = [];
      if (!module.children) module.children = [];
      return module;
    };
  })();
  if (typeof __nccwpck_require__ !== "undefined")
    __nccwpck_require__.ab = __dirname + "/";
  var __webpack_exports__ = __nccwpck_require__(767);
  module.exports = __webpack_exports__;
})();
