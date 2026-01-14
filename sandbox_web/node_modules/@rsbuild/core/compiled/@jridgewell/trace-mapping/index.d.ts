type GeneratedColumn = number;
type SourcesIndex = number;
type SourceLine = number;
type SourceColumn = number;
type NamesIndex = number;
type SourceMapSegment = [GeneratedColumn] | [GeneratedColumn, SourcesIndex, SourceLine, SourceColumn] | [GeneratedColumn, SourcesIndex, SourceLine, SourceColumn, NamesIndex];

interface SourceMapV3 {
    file?: string | null;
    names: string[];
    sourceRoot?: string;
    sources: (string | null)[];
    sourcesContent?: (string | null)[];
    version: 3;
    ignoreList?: number[];
}
interface EncodedSourceMap extends SourceMapV3 {
    mappings: string;
}
interface DecodedSourceMap extends SourceMapV3 {
    mappings: SourceMapSegment[][];
}
interface Section {
    offset: {
        line: number;
        column: number;
    };
    map: EncodedSourceMap | DecodedSourceMap | SectionedSourceMap;
}
interface SectionedSourceMap {
    file?: string | null;
    sections: Section[];
    version: 3;
}
type OriginalMapping = {
    source: string | null;
    line: number;
    column: number;
    name: string | null;
};
type InvalidOriginalMapping = {
    source: null;
    line: null;
    column: null;
    name: null;
};
type GeneratedMapping = {
    line: number;
    column: number;
};
type InvalidGeneratedMapping = {
    line: null;
    column: null;
};
type Bias = typeof GREATEST_LOWER_BOUND | typeof LEAST_UPPER_BOUND;
type XInput = {
    x_google_ignoreList?: SourceMapV3['ignoreList'];
};
type EncodedSourceMapXInput = EncodedSourceMap & XInput;
type DecodedSourceMapXInput = DecodedSourceMap & XInput;
type SectionedSourceMapXInput = Omit<SectionedSourceMap, 'sections'> & {
    sections: SectionXInput[];
};
type SectionXInput = Omit<Section, 'map'> & {
    map: SectionedSourceMapInput;
};
type SourceMapInput = string | EncodedSourceMapXInput | DecodedSourceMapXInput | TraceMap;
type SectionedSourceMapInput = SourceMapInput | SectionedSourceMapXInput;
type Needle = {
    line: number;
    column: number;
    bias?: Bias;
};
type SourceNeedle = {
    source: string;
    line: number;
    column: number;
    bias?: Bias;
};
type EachMapping = {
    generatedLine: number;
    generatedColumn: number;
    source: null;
    originalLine: null;
    originalColumn: null;
    name: null;
} | {
    generatedLine: number;
    generatedColumn: number;
    source: string | null;
    originalLine: number;
    originalColumn: number;
    name: string | null;
};
declare abstract class SourceMap {
    version: SourceMapV3['version'];
    file: SourceMapV3['file'];
    names: SourceMapV3['names'];
    sourceRoot: SourceMapV3['sourceRoot'];
    sources: SourceMapV3['sources'];
    sourcesContent: SourceMapV3['sourcesContent'];
    resolvedSources: SourceMapV3['sources'];
    ignoreList: SourceMapV3['ignoreList'];
}
type Ro<T> = T extends Array<infer V> ? V[] | Readonly<V[]> | RoArray<V> | Readonly<RoArray<V>> : T extends object ? T | Readonly<T> | RoObject<T> | Readonly<RoObject<T>> : T;
type RoArray<T> = Ro<T>[];
type RoObject<T> = {
    [K in keyof T]: T[K] | Ro<T[K]>;
};

type FlattenMap = {
    new (map: Ro<SectionedSourceMapInput>, mapUrl?: string | null): TraceMap;
    (map: Ro<SectionedSourceMapInput>, mapUrl?: string | null): TraceMap;
};
declare const FlattenMap: FlattenMap;

declare const LEAST_UPPER_BOUND = -1;
declare const GREATEST_LOWER_BOUND = 1;

declare class TraceMap implements SourceMap {
    version: SourceMapV3['version'];
    file: SourceMapV3['file'];
    names: SourceMapV3['names'];
    sourceRoot: SourceMapV3['sourceRoot'];
    sources: SourceMapV3['sources'];
    sourcesContent: SourceMapV3['sourcesContent'];
    ignoreList: SourceMapV3['ignoreList'];
    resolvedSources: string[];
    private _encoded;
    private _decoded;
    private _decodedMemo;
    private _bySources;
    private _bySourceMemos;
    constructor(map: Ro<SourceMapInput>, mapUrl?: string | null);
}
/**
 * Returns the encoded (VLQ string) form of the SourceMap's mappings field.
 */
declare function encodedMappings(map: TraceMap): EncodedSourceMap['mappings'];
/**
 * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
 */
declare function decodedMappings(map: TraceMap): Readonly<DecodedSourceMap['mappings']>;
/**
 * A low-level API to find the segment associated with a generated line/column (think, from a
 * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
 */
declare function traceSegment(map: TraceMap, line: number, column: number): Readonly<SourceMapSegment> | null;
/**
 * A higher-level API to find the source/line/column associated with a generated line/column
 * (think, from a stack trace). Line is 1-based, but column is 0-based, due to legacy behavior in
 * `source-map` library.
 */
declare function originalPositionFor(map: TraceMap, needle: Needle): OriginalMapping | InvalidOriginalMapping;
/**
 * Finds the generated line/column position of the provided source/line/column source position.
 */
declare function generatedPositionFor(map: TraceMap, needle: SourceNeedle): GeneratedMapping | InvalidGeneratedMapping;
/**
 * Finds all generated line/column positions of the provided source/line/column source position.
 */
declare function allGeneratedPositionsFor(map: TraceMap, needle: SourceNeedle): GeneratedMapping[];
/**
 * Iterates each mapping in generated position order.
 */
declare function eachMapping(map: TraceMap, cb: (mapping: EachMapping) => void): void;
/**
 * Retrieves the source content for a particular source, if its found. Returns null if not.
 */
declare function sourceContentFor(map: TraceMap, source: string): string | null;
/**
 * Determines if the source is marked to ignore by the source map.
 */
declare function isIgnored(map: TraceMap, source: string): boolean;
/**
 * A helper that skips sorting of the input map's mappings array, which can be expensive for larger
 * maps.
 */
declare function presortedDecodedMap(map: DecodedSourceMap, mapUrl?: string): TraceMap;
/**
 * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
declare function decodedMap(map: TraceMap): Omit<DecodedSourceMap, 'mappings'> & {
    mappings: readonly SourceMapSegment[][];
};
/**
 * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
declare function encodedMap(map: TraceMap): EncodedSourceMap;

export { FlattenMap as AnyMap, FlattenMap, GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND, SourceMap, TraceMap, allGeneratedPositionsFor, decodedMap, decodedMappings, eachMapping, encodedMap, encodedMappings, generatedPositionFor, isIgnored, originalPositionFor, presortedDecodedMap, sourceContentFor, traceSegment };
export type { Bias, DecodedSourceMap, DecodedSourceMapXInput, EachMapping, EncodedSourceMap, EncodedSourceMapXInput, GeneratedMapping, InvalidGeneratedMapping, InvalidOriginalMapping, OriginalMapping as Mapping, Needle, OriginalMapping, Section, SectionXInput, SectionedSourceMap, SectionedSourceMapInput, SectionedSourceMapXInput, SourceMapInput, SourceMapSegment, SourceMapV3, SourceNeedle, XInput };
