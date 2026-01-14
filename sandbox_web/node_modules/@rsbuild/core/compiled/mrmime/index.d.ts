declare const mimes: Record<string, string>;
declare function lookup(extension: string): string | undefined;

export { lookup, mimes };
