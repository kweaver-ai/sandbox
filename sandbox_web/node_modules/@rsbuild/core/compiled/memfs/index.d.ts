import { Buffer as Buffer$1 } from 'node:buffer';
import { URL as URL$1 } from 'node:url';
import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';

type FanOutUnsubscribe = () => void;
type FanOutListener<D> = (data: D) => void;
declare class FanOut<D> {
    readonly listeners: Set<FanOutListener<D>>;
    emit(data: D): void;
    listen(listener: FanOutListener<D>): FanOutUnsubscribe;
}

type NodeEventModify = [type: 'modify'];
type NodeEventDelete = [type: 'delete'];
type NodeEvent = NodeEventModify | NodeEventDelete;
/**
 * Node in a file system (like i-node, v-node).
 */
declare class Node {
    readonly changes: FanOut<NodeEvent>;
    ino: number;
    private _uid;
    private _gid;
    private _atime;
    private _mtime;
    private _ctime;
    buf: Buffer$1;
    /** Total allocated memory capacity for this node. */
    private capacity;
    /** Actually used bytes to store content. */
    private size;
    rdev: number;
    mode: number;
    private _nlink;
    symlink: string;
    constructor(ino: number, mode?: number);
    set ctime(ctime: Date);
    get ctime(): Date;
    set uid(uid: number);
    get uid(): number;
    set gid(gid: number);
    get gid(): number;
    set atime(atime: Date);
    get atime(): Date;
    set mtime(mtime: Date);
    get mtime(): Date;
    get perm(): number;
    set perm(perm: number);
    set nlink(nlink: number);
    get nlink(): number;
    getString(encoding?: BufferEncoding): string;
    setString(str: string): void;
    getBuffer(): Buffer$1;
    setBuffer(buf: Buffer$1): void;
    private _setBuf;
    getSize(): number;
    setModeProperty(property: number): void;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymlink(): boolean;
    isCharacterDevice(): boolean;
    makeSymlink(symlink: string): void;
    write(buf: Buffer$1, off?: number, len?: number, pos?: number): number;
    /**
     * Read data from the file.
     *
     * @param buf Buffer to read data into.
     * @param off Offset int the `buf` where to start writing data.
     * @param len How many bytes to read. Equals to `buf.byteLength` by default.
     * @param pos Position offset in file where to start reading. Defaults to `0`.
     * @returns Returns the number of bytes read.
     */
    read(buf: Buffer$1 | ArrayBufferView | DataView, off?: number, len?: number, pos?: number): number;
    truncate(len?: number): void;
    chmod(perm: number): void;
    chown(uid: number, gid: number): void;
    touch(): void;
    canRead(uid?: number, gid?: number): boolean;
    canWrite(uid?: number, gid?: number): boolean;
    canExecute(uid?: number, gid?: number): boolean;
    del(): void;
    toJSON(): {
        ino: number;
        uid: number;
        gid: number;
        atime: number;
        mtime: number;
        ctime: number;
        perm: number;
        mode: number;
        nlink: number;
        symlink: string;
        data: string;
    };
}

/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 *
 * @todo Rename to `OpenFile`.
 */
declare class File {
    readonly link: Link;
    readonly node: Node;
    flags: number;
    fd: number;
    /**
     * A cursor/offset position in a file, where data will be written on write.
     * User can "seek" this position.
     */
    position: number;
    /**
     * Open a Link-Node pair. `node` is provided separately as that might be a different node
     * rather the one `link` points to, because it might be a symlink.
     * @param link
     * @param node
     * @param flags
     * @param fd
     */
    constructor(link: Link, node: Node, flags: number, fd: number);
    getString(encoding?: string): string;
    setString(str: string): void;
    getBuffer(): Buffer$1;
    setBuffer(buf: Buffer$1): void;
    getSize(): number;
    truncate(len?: number): void;
    seekTo(position: number): void;
    write(buf: Buffer$1, offset?: number, length?: number, position?: number | null): number;
    read(buf: Buffer$1 | ArrayBufferView | DataView, offset?: number, length?: number, position?: number): number;
    chmod(perm: number): void;
    chown(uid: number, gid: number): void;
}

type DirectoryContent = string | Buffer$1 | null;
interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
    [key: string]: T;
}
interface NestedDirectoryJSON<T extends DirectoryContent = DirectoryContent> {
    [key: string]: T | NestedDirectoryJSON;
}

type PathLike$1 = string | Buffer$1 | URL$1;
declare namespace symlink {
    type Type = 'dir' | 'file' | 'junction';
}

declare const constants: {
    O_RDONLY: number;
    O_WRONLY: number;
    O_RDWR: number;
    S_IFMT: number;
    S_IFREG: number;
    S_IFDIR: number;
    S_IFCHR: number;
    S_IFBLK: number;
    S_IFIFO: number;
    S_IFLNK: number;
    S_IFSOCK: number;
    O_CREAT: number;
    O_EXCL: number;
    O_NOCTTY: number;
    O_TRUNC: number;
    O_APPEND: number;
    O_DIRECTORY: number;
    O_NOATIME: number;
    O_NOFOLLOW: number;
    O_SYNC: number;
    O_SYMLINK: number;
    O_DIRECT: number;
    O_NONBLOCK: number;
    S_IRWXU: number;
    S_IRUSR: number;
    S_IWUSR: number;
    S_IXUSR: number;
    S_IRWXG: number;
    S_IRGRP: number;
    S_IWGRP: number;
    S_IXGRP: number;
    S_IRWXO: number;
    S_IROTH: number;
    S_IWOTH: number;
    S_IXOTH: number;
    F_OK: number;
    R_OK: number;
    W_OK: number;
    X_OK: number;
    UV_FS_SYMLINK_DIR: number;
    UV_FS_SYMLINK_JUNCTION: number;
    UV_FS_COPYFILE_EXCL: number;
    UV_FS_COPYFILE_FICLONE: number;
    UV_FS_COPYFILE_FICLONE_FORCE: number;
    COPYFILE_EXCL: number;
    COPYFILE_FICLONE: number;
    COPYFILE_FICLONE_FORCE: number;
};

type TSetTimeout = (callback: (...args: any[]) => void, time?: number, args?: any[]) => any;

interface IOptions {
    encoding?: BufferEncoding | TEncodingExtended$1;
}
interface IFileOptions extends IOptions {
    mode?: TMode$1;
    flag?: TFlags$1;
}
interface IWriteFileOptions extends IFileOptions {
}
interface IReadFileOptions extends IOptions {
    flag?: string;
}
interface IRealpathOptions {
    encoding?: TEncodingExtended$1;
}
interface IStatOptions {
    bigint?: boolean;
    throwIfNoEntry?: boolean;
}
interface IFStatOptions {
    bigint?: boolean;
}
interface IAppendFileOptions$1 extends IFileOptions {
}
interface IAppendFileOptions$1 extends IFileOptions {
}
interface IReadableWebStreamOptions {
    type?: 'bytes' | undefined;
    autoClose?: boolean;
}
interface IFileHandleReadStreamOptions {
    encoding?: BufferEncoding;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number | undefined;
    end?: number;
    highWaterMark?: number;
    flush?: boolean;
    signal?: AbortSignal | undefined;
}
interface IFileHandleWriteStreamOptions {
    encoding?: BufferEncoding;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number;
    highWaterMark?: number;
    flush?: boolean;
}
interface IReaddirOptions extends IOptions {
    recursive?: boolean;
    withFileTypes?: boolean;
}
interface IMkdirOptions {
    mode?: TMode$1;
    recursive?: boolean;
}
interface IRmdirOptions {
    recursive?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
interface IRmOptions {
    force?: boolean;
    maxRetries?: number;
    recursive?: boolean;
    retryDelay?: number;
}
interface IWatchFileOptions$1 {
    persistent?: boolean;
    interval?: number;
}
interface IReadStreamOptions extends IOptions {
    /** Defaults to `'r'`. */
    flags?: TFlags$1;
    /** Defaults to `null`. */
    encoding?: BufferEncoding;
    /** Defaults to `null`. */
    fd?: number | IFileHandle | null;
    /** Defaults to 0o666 */
    mode?: TMode$1;
    /** Defaults to `true`. */
    autoClose?: boolean;
    /** Defaults to `true`. */
    emitClose?: boolean;
    start?: number;
    /** Defaults to `Infinity`. */
    end?: number;
    /** Defaults to `64 * 1024`. */
    highWaterMark?: number;
    /** Defaults to `null`. */
    fs?: object | null;
    /** Defaults to `null`. */
    signal?: AbortSignal | null;
}
interface IWriteStreamOptions {
    flags?: TFlags$1;
    encoding?: BufferEncoding;
    fd?: number | IFileHandle;
    mode?: TMode$1;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number;
}
interface IWatchOptions$1 extends IOptions {
    /**
     * Indicates whether the process should continue to run as long as files are
     * being watched. Default: true.
     */
    persistent?: boolean;
    /**
     * Indicates whether all subdirectories should be watched, or only the current
     * directory. This applies when a directory is specified, and only on
     * supported platforms (See caveats). Default: false.
     */
    recursive?: boolean;
    /**
     * Allows closing the watcher with an {@link AbortSignal}.
     */
    signal?: AbortSignal;
    /**
     * Specifies the number of events to queue between iterations of the AsyncIterator.
     * Default: 2048.
     */
    maxQueue?: number;
    /**
     * Either 'ignore' or 'throw' when there are more events to be queued than maxQueue allows.
     * 'ignore' means overflow events are dropped and a warning is emitted, while 'throw'
     * means to throw an exception. Default: 'ignore'.
     */
    overflow?: 'ignore' | 'throw';
}
interface ICpOptions {
    /** dereference symlinks. Default: false. */
    dereference?: boolean;
    /**
     * When force is false, and the destination exists, throw an error.
     * Default: false.
     */
    errorOnExist?: boolean;
    /**
     * Function to filter copied files/directories. Return true to copy the item,
     * false to ignore it. Default: undefined.
     */
    filter?: (src: string, dest: string) => boolean;
    /**
     * Overwrite existing file or directory. The copy operation will ignore errors
     * if you set this to false and the destination exists. Use the errorOnExist
     * option to change this behavior. Default: true.
     */
    force?: boolean;
    /**
     * Integer, modifiers for copy operation. Default: 0. See mode flag of
     * `fs.copyFileSync()`.
     */
    mode?: number;
    /** When true timestamps from src will be preserved. Default: false. */
    preserveTimestamps?: boolean;
    /** Copy directories recursively Default: false. */
    recursive?: boolean;
    /** When true, path resolution for symlinks will be skipped. Default: false. */
    verbatimSymlinks?: boolean;
}
interface IStafsOptions {
    /** Whether the numeric values in the returned `StatFs` object should be bigint. */
    bigint?: boolean;
}
interface IOpenAsBlobOptions {
    /** An optional mime type for the blob. */
    type?: string;
}
interface IGlobOptions {
    /** Current working directory. */
    cwd?: string | URL;
    /** Exclude patterns. */
    exclude?: string | string[];
    /** Maximum search depth. */
    maxdepth?: number;
    /** Whether to include symbolic links. */
    withFileTypes?: boolean;
}
interface IOpendirOptions extends IOptions {
    /**
     * Number of directory entries that are buffered internally when reading from
     * the directory. Higher values lead to better performance but higher memory
     * usage. Default: 32.
     */
    bufferSize?: number;
    /** Default: false. */
    recursive?: boolean;
}

type PathLike = PathLike$1 | Uint8Array;
type TDataOut$1 = string | Buffer;
type TEncodingExtended$1 = BufferEncoding | 'buffer';
type TFileId$1 = PathLike | number;
type TData$1 = TDataOut$1 | ArrayBufferView | DataView;
type TPromisesData = TData$1 | Readable;
type TFlags$1 = string | number;
type TMode$1 = string | number;
type TTime$1 = number | string | Date;
type TCallback<TData> = (error?: IError | null, data?: TData) => void;
type TCallback2<T1, T2> = (error: IError | null, bytesRead?: T1, buffers?: T2) => void;
interface IError extends Error {
    code?: string;
}
type TFlagsCopy$1 = typeof constants.COPYFILE_EXCL | typeof constants.COPYFILE_FICLONE | typeof constants.COPYFILE_FICLONE_FORCE;
type TStatNumber$2 = number | bigint;
interface IStats<T = TStatNumber$2> {
    uid: T;
    gid: T;
    rdev: T;
    blksize: T;
    ino: T;
    size: T;
    blocks: T;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    dev: T;
    mode: T;
    nlink: T;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
interface IStatFs<T = TStatNumber$2> {
    bavail: T;
    bfree: T;
    blocks: T;
    bsize: T;
    ffree: T;
    files: T;
    type: T;
}
interface IDir {
    path: string;
    close(): Promise<void>;
    close(callback?: (err?: Error) => void): void;
    closeSync(): void;
    read(): Promise<IDirent | null>;
    read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
    readSync(): IDirent | null;
    [Symbol.asyncIterator](): AsyncIterableIterator<IDirent>;
}
interface IDirent {
    name: TDataOut$1;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
interface IStatWatcher extends EventEmitter {
    filename: string;
    interval: number;
    timeoutRef?: any;
    setTimeout: TSetTimeout;
    prev: IStats;
    start(path: string, persistent?: boolean, interval?: number): void;
    stop(): void;
}
interface IReadStream extends Readable {
    bytesRead: number;
    path: string | Buffer;
    pending: boolean;
}
interface IWriteStream$1 extends Writable {
    bytesWritten: number;
    path: string;
    pending: boolean;
    close(callback?: (err?: Error) => void): void;
}
interface IFSWatcher extends EventEmitter {
    start(path: PathLike, persistent?: boolean, recursive?: boolean, encoding?: BufferEncoding): void;
    close(): void;
}
/**
 * Declare ReadableStream in case dom.d.ts is not added to the tsconfig lib causing
 * ReadableStream interface is not defined. For developers with dom.d.ts added,
 * the ReadableStream interface will be merged correctly.
 */
declare global {
    export interface ReadableStream {
    }
}
interface IFileHandle extends EventEmitter {
    fd: number;
    getAsyncId(): number;
    appendFile(data: TData$1, options?: IAppendFileOptions$1 | string): Promise<void>;
    chmod(mode: TMode$1): Promise<void>;
    chown(uid: number, gid: number): Promise<void>;
    close(): Promise<void>;
    createReadStream(options: IFileHandleReadStreamOptions): IReadStream;
    createWriteStream(options: IFileHandleWriteStreamOptions): IWriteStream$1;
    datasync(): Promise<void>;
    readableWebStream(options?: IReadableWebStreamOptions): ReadableStream;
    read(buffer: Buffer | Uint8Array, offset: number, length: number, position?: number | null): Promise<TFileHandleReadResult>;
    readv(buffers: ArrayBufferView[], position?: number | null): Promise<TFileHandleReadvResult>;
    readFile(options?: IReadFileOptions | string): Promise<TDataOut$1>;
    stat(options?: IStatOptions): Promise<IStats>;
    truncate(len?: number): Promise<void>;
    utimes(atime: TTime$1, mtime: TTime$1): Promise<void>;
    write(buffer: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): Promise<TFileHandleWriteResult>;
    writev(buffers: ArrayBufferView[], position?: number | null): Promise<TFileHandleWritevResult>;
    writeFile(data: TData$1, options?: IWriteFileOptions): Promise<void>;
}
type TFileHandle = PathLike | IFileHandle;
interface TFileHandleReadResult {
    bytesRead: number;
    buffer: Buffer | Uint8Array;
}
interface TFileHandleWriteResult {
    bytesWritten: number;
    buffer: Buffer | Uint8Array;
}
interface TFileHandleReadvResult {
    bytesRead: number;
    buffers: ArrayBufferView[];
}
interface TFileHandleWritevResult {
    bytesWritten: number;
    buffers: ArrayBufferView[];
}

type TFileId = PathLike | number;

/**
 * Represents a filesystem superblock, which is the root of a virtual
 * filesystem in Linux.
 * @see https://lxr.linux.no/linux+v3.11.2/include/linux/fs.h#L1242
 */
declare class Superblock {
    static fromJSON(json: DirectoryJSON, cwd?: string): Superblock;
    static fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): Superblock;
    /**
     * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
     * up, so here, in order not to conflict with them, we choose some big number and descrease
     * the file descriptor of every new opened file.
     * @type {number}
     * @todo This should not be static, right?
     */
    static fd: number;
    root: Link;
    ino: number;
    inodes: {
        [ino: number]: Node;
    };
    releasedInos: number[];
    fds: {
        [fd: number]: File;
    };
    releasedFds: number[];
    maxFiles: number;
    openFiles: number;
    constructor(props?: {});
    createLink(): Link;
    createLink(parent: Link, name: string, isDirectory?: boolean, mode?: number): Link;
    deleteLink(link: Link): boolean;
    private newInoNumber;
    private newFdNumber;
    createNode(mode: number): Node;
    deleteNode(node: Node): void;
    walk(steps: string[], resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(filename: string, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(link: Link, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(stepsOrFilenameOrLink: string[] | string | Link, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    getLink(steps: string[]): Link | null;
    getLinkOrThrow(filename: string, funcName?: string): Link;
    getResolvedLink(filenameOrSteps: string | string[]): Link | null;
    /**
     * Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
     */
    getResolvedLinkOrThrow(filename: string, funcName?: string): Link;
    resolveSymlinks(link: Link): Link | null;
    /**
     * Just like `getLinkOrThrow`, but also verifies that the link is a directory.
     */
    getLinkAsDirOrThrow(filename: string, funcName?: string): Link;
    getLinkParent(steps: string[]): Link | null;
    getLinkParentAsDirOrThrow(filenameOrSteps: string | string[], funcName?: string): Link;
    getFileByFd(fd: number): File;
    getFileByFdOrThrow(fd: number, funcName?: string): File;
    _toJSON(link?: Link, json?: {}, path?: string, asBuffer?: boolean): DirectoryJSON<string | null>;
    toJSON(paths?: PathLike | PathLike[], json?: {}, isRelative?: boolean, asBuffer?: boolean): DirectoryJSON<string | null>;
    fromJSON(json: DirectoryJSON, cwd?: string): void;
    fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): void;
    reset(): void;
    mountSync(mountpoint: string, json: DirectoryJSON): void;
    openLink(link: Link, flagsNum: number, resolveSymlinks?: boolean): File;
    protected openFile(filename: string, flagsNum: number, modeNum: number | undefined, resolveSymlinks?: boolean): File;
    readonly open: (filename: string, flagsNum: number, modeNum: number, resolveSymlinks?: boolean) => number;
    readonly writeFile: (id: TFileId, buf: Buffer$1, flagsNum: number, modeNum: number) => void;
    readonly read: (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, length: number, position: number | null) => number;
    readonly readv: (fd: number, buffers: ArrayBufferView[], position: number | null) => number;
    readonly link: (filename1: string, filename2: string) => void;
    readonly unlink: (filename: string) => void;
    readonly symlink: (targetFilename: string, pathFilename: string) => Link;
    readonly rename: (oldPathFilename: string, newPathFilename: string) => void;
    readonly mkdir: (filename: string, modeNum: number) => void;
    /**
     * Creates directory tree recursively.
     */
    readonly mkdirp: (filename: string, modeNum: number) => string | undefined;
    readonly rmdir: (filename: string, recursive?: boolean) => void;
    readonly rm: (filename: string, force?: boolean, recursive?: boolean) => void;
    protected closeFile(file: File): void;
    readonly close: (fd: number) => void;
    write(fd: number, buf: Buffer$1, offset?: number, length?: number, position?: number | null): number;
}

type LinkEventChildAdd = [type: 'child:add', link: Link, parent: Link];
type LinkEventChildDelete = [type: 'child:del', link: Link, parent: Link];
type LinkEvent = LinkEventChildAdd | LinkEventChildDelete;
/**
 * Represents a hard link that points to an i-node `node`.
 */
declare class Link {
    readonly changes: FanOut<LinkEvent>;
    vol: Superblock;
    parent: Link | undefined;
    children: Map<string, Link | undefined>;
    private _steps;
    node: Node;
    ino: number;
    length: number;
    name: string;
    get steps(): string[];
    set steps(val: string[]);
    constructor(vol: Superblock, parent: Link | undefined, name: string);
    setNode(node: Node): void;
    getNode(): Node;
    createChild(name: string, node?: Node): Link;
    setChild(name: string, link?: Link): Link;
    deleteChild(link: Link): void;
    getChild(name: string): Link | undefined;
    getPath(): string;
    getParentPath(): string;
    getName(): string;
    toJSON(): {
        steps: string[];
        ino: number;
        children: string[];
    };
    syncSteps(): void;
}

type TStatNumber$1 = number | bigint;
/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
declare class Stats<T = TStatNumber$1> {
    static build(node: Node, bigint: false): Stats<number>;
    static build(node: Node, bigint: true): Stats<bigint>;
    static build(node: Node, bigint?: boolean): Stats<TStatNumber$1>;
    uid: T;
    gid: T;
    rdev: T;
    blksize: T;
    ino: T;
    size: T;
    blocks: T;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    atimeNs: T extends bigint ? T : undefined;
    mtimeNs: T extends bigint ? T : undefined;
    ctimeNs: T extends bigint ? T : undefined;
    birthtimeNs: T extends bigint ? T : undefined;
    dev: T;
    mode: T;
    nlink: T;
    private _checkModeProperty;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}

type TDataOut = string | Buffer$1;
type TEncodingExtended = BufferEncoding | 'buffer';

/**
 * A directory entry, like `fs.Dirent`.
 */
declare class Dirent implements IDirent {
    static build(link: Link, encoding: TEncodingExtended | undefined): Dirent;
    name: TDataOut;
    path: string;
    parentPath: string;
    private mode;
    private _checkModeProperty;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}

type TStatNumber = number | bigint;
/**
 * Statistics about a file system, like `fs.StatFs`.
 */
declare class StatFs<T = TStatNumber> implements IStatFs<T> {
    static build(superblock: Superblock, bigint: false): StatFs<number>;
    static build(superblock: Superblock, bigint: true): StatFs<bigint>;
    static build(superblock: Superblock, bigint?: boolean): StatFs<TStatNumber>;
    type: T;
    bsize: T;
    blocks: T;
    bfree: T;
    bavail: T;
    files: T;
    ffree: T;
}

interface FsCallbackApi {
    access: {
        (path: PathLike, callback: TCallback<void>): void;
        (path: PathLike, mode: number, callback: TCallback<void>): void;
    };
    appendFile: {
        (id: TFileId$1, data: TData$1, callback: TCallback<void>): void;
        (id: TFileId$1, data: TData$1, options: IAppendFileOptions$1 | string, callback: TCallback<void>): void;
    };
    chmod: (path: PathLike, mode: TMode$1, callback: TCallback<void>) => void;
    chown: (path: PathLike, uid: number, gid: number, callback: TCallback<void>) => void;
    close: (fd: number, callback: TCallback<void>) => void;
    copyFile: {
        (src: PathLike, dest: PathLike, callback: TCallback<void>): void;
        (src: PathLike, dest: PathLike, flags: TFlagsCopy$1, callback: TCallback<void>): void;
    };
    cp: {
        (src: string | URL, dest: string | URL, callback: TCallback<void>): void;
        (src: string | URL, dest: string | URL, options: ICpOptions, callback: TCallback<void>): void;
    };
    createReadStream: (path: PathLike, options?: IReadStreamOptions | string) => IReadStream;
    createWriteStream: (path: PathLike, options?: IWriteStreamOptions | string) => IWriteStream$1;
    exists: (path: PathLike, callback: (exists: boolean) => void) => void;
    fchmod: (fd: number, mode: TMode$1, callback: TCallback<void>) => void;
    fchown: (fd: number, uid: number, gid: number, callback: TCallback<void>) => void;
    fdatasync: (fd: number, callback: TCallback<void>) => void;
    fsync: (fd: number, callback: TCallback<void>) => void;
    fstat: {
        (fd: number, callback: TCallback<IStats>): void;
        (fd: number, options: IFStatOptions, callback: TCallback<IStats>): void;
    };
    ftruncate: {
        (fd: number, callback: TCallback<void>): void;
        (fd: number, len: number, callback: TCallback<void>): void;
    };
    futimes: (fd: number, atime: TTime$1, mtime: TTime$1, callback: TCallback<void>) => void;
    glob: {
        (pattern: string, callback: TCallback<string[]>): void;
        (pattern: string, options: IGlobOptions, callback: TCallback<string[]>): void;
    };
    lchmod: (path: PathLike, mode: TMode$1, callback: TCallback<void>) => void;
    lchown: (path: PathLike, uid: number, gid: number, callback: TCallback<void>) => void;
    lutimes: (path: PathLike, atime: number | string | Date, mtime: number | string | Date, callback: TCallback<void>) => void;
    link: (existingPath: PathLike, newPath: PathLike, callback: TCallback<void>) => void;
    lstat: {
        (path: PathLike, callback: TCallback<IStats>): void;
        (path: PathLike, options: IStatOptions, callback: TCallback<IStats>): void;
    };
    mkdir: {
        (path: PathLike, callback: TCallback<void>): void;
        (path: PathLike, mode: TMode$1 | (IMkdirOptions & {
            recursive?: false;
        }), callback: TCallback<void>): void;
        (path: PathLike, mode: IMkdirOptions & {
            recursive: true;
        }, callback: TCallback<string>): void;
        (path: PathLike, mode: TMode$1 | IMkdirOptions, callback: TCallback<string>): void;
    };
    mkdtemp: {
        (prefix: string, callback: TCallback<string>): void;
        (prefix: string, options: IOptions, callback: TCallback<string>): void;
    };
    open: {
        (path: PathLike, flags: TFlags$1, callback: TCallback<number>): void;
        (path: PathLike, flags: TFlags$1, mode: TMode$1, callback: TCallback<number>): void;
    };
    openAsBlob: (path: PathLike, options?: IOpenAsBlobOptions) => Promise<Blob>;
    opendir: (path: PathLike, options: IOpendirOptions, callback: TCallback<IDir>) => void;
    read: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number, callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void) => void;
    readdir: {
        (path: PathLike, callback: TCallback<TDataOut$1[] | IDirent[]>): void;
        (path: PathLike, options: IReaddirOptions | string, callback: TCallback<TDataOut$1[] | IDirent[]>): void;
    };
    readFile: {
        (id: TFileId$1, callback: TCallback<TDataOut$1>): void;
        (id: TFileId$1, options: IReadFileOptions | string, callback: TCallback<TDataOut$1>): void;
    };
    readlink: {
        (path: PathLike, callback: TCallback<TDataOut$1>): void;
        (path: PathLike, options: IOptions, callback: TCallback<TDataOut$1>): void;
    };
    readv: {
        (fd: number, buffers: ArrayBufferView[], callback: TCallback2<number, ArrayBufferView[]>): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: TCallback2<number, ArrayBufferView[]>): void;
    };
    realpath: {
        (path: PathLike, callback: TCallback<TDataOut$1>): void;
        (path: PathLike, options: IRealpathOptions | string, callback: TCallback<TDataOut$1>): void;
    };
    rename: (oldPath: PathLike, newPath: PathLike, callback: TCallback<void>) => void;
    rmdir: {
        (path: PathLike, callback: TCallback<void>): void;
        (path: PathLike, options: IRmdirOptions, callback: TCallback<void>): void;
    };
    rm: {
        (path: PathLike, callback: TCallback<void>): void;
        (path: PathLike, options: IRmOptions, callback: TCallback<void>): void;
    };
    stat: {
        (path: PathLike, callback: TCallback<IStats>): void;
        (path: PathLike, options: IStatOptions, callback: TCallback<IStats>): void;
    };
    statfs: {
        (path: PathLike, callback: TCallback<IStatFs>): void;
        (path: PathLike, options: IStatOptions, callback: TCallback<IStatFs>): void;
    };
    symlink: {
        (target: PathLike, path: PathLike, callback: TCallback<void>): void;
        (target: PathLike, path: PathLike, type: symlink.Type, callback: TCallback<void>): void;
    };
    truncate: {
        (id: PathLike, callback: TCallback<void>): void;
        (id: PathLike, len: number, callback: TCallback<void>): void;
    };
    unlink: (path: PathLike, callback: TCallback<void>) => void;
    unwatchFile: (path: PathLike, listener?: (curr: IStats, prev: IStats) => void) => void;
    utimes: (path: PathLike, atime: TTime$1, mtime: TTime$1, callback: TCallback<void>) => void;
    watch: (path: PathLike, options?: IWatchOptions$1 | string, listener?: (eventType: string, filename: string) => void) => IFSWatcher;
    watchFile: {
        (path: PathLike, listener: (curr: IStats, prev: IStats) => void): IStatWatcher;
        (path: PathLike, options: IWatchFileOptions$1, listener: (curr: IStats, prev: IStats) => void): IStatWatcher;
    };
    write: {
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, callback: (...args: any[]) => void): void;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, callback: (...args: any[]) => void): void;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, callback: (...args: any[]) => void): void;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number, callback: (...args: any[]) => void): void;
        (fd: number, str: string, callback: (...args: any[]) => void): void;
        (fd: number, str: string, position: number, callback: (...args: any[]) => void): void;
        (fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args: any[]) => void): void;
    };
    writeFile: {
        (id: TFileId$1, data: TData$1, callback: TCallback<void>): void;
        (id: TFileId$1, data: TData$1, options: IWriteFileOptions | string, callback: TCallback<void>): void;
    };
    writev: {
        (fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
    };
}
type WritevCallback = (err: Error | null, bytesWritten?: number, buffers?: ArrayBufferView[]) => void;

interface FsSynchronousApi {
    accessSync: (path: PathLike, mode?: number) => void;
    appendFileSync: (id: TFileId$1, data: TData$1, options?: IAppendFileOptions$1 | string) => void;
    chmodSync: (path: PathLike, mode: TMode$1) => void;
    chownSync: (path: PathLike, uid: number, gid: number) => void;
    closeSync: (fd: number) => void;
    copyFileSync: (src: PathLike, dest: PathLike, flags?: TFlagsCopy$1) => void;
    cpSync: (src: string | URL, dest: string | URL, options?: ICpOptions) => void;
    existsSync: (path: PathLike) => boolean;
    fchmodSync: (fd: number, mode: TMode$1) => void;
    fchownSync: (fd: number, uid: number, gid: number) => void;
    fdatasyncSync: (fd: number) => void;
    fstatSync: {
        (fd: number, options: {
            bigint: false;
        }): IStats<number>;
        (fd: number, options: {
            bigint: true;
        }): IStats<bigint>;
        (fd: number): IStats<number>;
    };
    fsyncSync: (fd: number) => void;
    ftruncateSync: (fd: number, len?: number) => void;
    futimesSync: (fd: number, atime: TTime$1, mtime: TTime$1) => void;
    globSync: (pattern: string, options?: IGlobOptions) => string[];
    lchmodSync: (path: PathLike, mode: TMode$1) => void;
    lchownSync: (path: PathLike, uid: number, gid: number) => void;
    lutimesSync: (path: PathLike, atime: number | string | Date, time: number | string | Date) => void;
    linkSync: (existingPath: PathLike, newPath: PathLike) => void;
    lstatSync: {
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): IStats<number> | undefined;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true | undefined;
        }): IStats<number>;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): IStats<bigint> | undefined;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true | undefined;
        }): IStats<bigint>;
        (path: PathLike, options: {
            throwIfNoEntry: false;
        }): IStats<number> | undefined;
        (path: PathLike, options: {
            throwIfNoEntry?: true | undefined;
        }): IStats<number>;
        (path: PathLike): IStats<number>;
    };
    mkdirSync: {
        (path: PathLike, options: IMkdirOptions & {
            recursive: true;
        }): string | undefined;
        (path: PathLike, options?: TMode$1 | (IMkdirOptions & {
            recursive?: false;
        })): void;
        (path: PathLike, options?: TMode$1 | IMkdirOptions): string | undefined;
    };
    mkdtempSync: (prefix: string, options?: IOptions) => TDataOut$1;
    openSync: (path: PathLike, flags: TFlags$1, mode?: TMode$1) => number;
    opendirSync: (path: PathLike, options?: IOpendirOptions) => IDir;
    readdirSync: (path: PathLike, options?: IReaddirOptions | string) => TDataOut$1[] | IDirent[];
    readlinkSync: (path: PathLike, options?: IOptions) => TDataOut$1;
    readSync: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number) => number;
    readFileSync: (file: TFileId$1, options?: IReadFileOptions | string) => TDataOut$1;
    readvSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    realpathSync: (path: PathLike, options?: IRealpathOptions | string) => TDataOut$1;
    renameSync: (oldPath: PathLike, newPath: PathLike) => void;
    rmdirSync: (path: PathLike, options?: IRmdirOptions) => void;
    rmSync: (path: PathLike, options?: IRmOptions) => void;
    statSync: {
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): IStats<number> | undefined;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true;
        }): IStats<number>;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): IStats<bigint> | undefined;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true;
        }): IStats<bigint>;
        (path: PathLike, options: {
            throwIfNoEntry: false;
        }): IStats<number> | undefined;
        (path: PathLike, options: {
            throwIfNoEntry?: true;
        }): IStats<number>;
        (path: PathLike): IStats<number>;
    };
    statfsSync: (path: PathLike, options?: IStafsOptions) => IStatFs;
    symlinkSync: (target: PathLike, path: PathLike, type?: symlink.Type) => void;
    truncateSync: (id: TFileId$1, len?: number) => void;
    unlinkSync: (path: PathLike) => void;
    utimesSync: (path: PathLike, atime: TTime$1, mtime: TTime$1) => void;
    writeFileSync: (id: TFileId$1, data: TData$1, options?: IWriteFileOptions) => void;
    writeSync: {
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): number;
        (fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
    };
    writevSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
}

interface FsPromisesApi {
    constants: typeof constants;
    FileHandle: new (...args: unknown[]) => IFileHandle;
    access: (path: PathLike, mode?: number) => Promise<void>;
    appendFile: (path: TFileHandle, data: TData$1, options?: IAppendFileOptions$1 | string) => Promise<void>;
    chmod: (path: PathLike, mode: TMode$1) => Promise<void>;
    chown: (path: PathLike, uid: number, gid: number) => Promise<void>;
    copyFile: (src: PathLike, dest: PathLike, flags?: TFlagsCopy$1) => Promise<void>;
    cp: (src: string | URL, dest: string | URL, options?: ICpOptions) => Promise<void>;
    lchmod: (path: PathLike, mode: TMode$1) => Promise<void>;
    lchown: (path: PathLike, uid: number, gid: number) => Promise<void>;
    lutimes: (path: PathLike, atime: TTime$1, mtime: TTime$1) => Promise<void>;
    link: (existingPath: PathLike, newPath: PathLike) => Promise<void>;
    lstat: (path: PathLike, options?: IStatOptions) => Promise<IStats>;
    mkdir: (path: PathLike, options?: TMode$1 | IMkdirOptions) => Promise<string | undefined>;
    mkdtemp: (prefix: string, options?: IOptions) => Promise<TDataOut$1>;
    open: (path: PathLike, flags?: TFlags$1, mode?: TMode$1) => Promise<IFileHandle>;
    opendir: (path: PathLike, options?: IOpendirOptions) => Promise<IDir>;
    readdir: (path: PathLike, options?: IReaddirOptions | string) => Promise<TDataOut$1[] | IDirent[]>;
    readFile: (id: TFileHandle, options?: IReadFileOptions | string) => Promise<TDataOut$1>;
    readlink: (path: PathLike, options?: IOptions) => Promise<TDataOut$1>;
    realpath: (path: PathLike, options?: IRealpathOptions | string) => Promise<TDataOut$1>;
    rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;
    rmdir: (path: PathLike, options?: IRmdirOptions) => Promise<void>;
    rm: (path: PathLike, options?: IRmOptions) => Promise<void>;
    stat: (path: PathLike, options?: IStatOptions) => Promise<IStats>;
    statfs: (path: PathLike, options?: IStatOptions) => Promise<IStatFs>;
    symlink: (target: PathLike, path: PathLike, type?: symlink.Type) => Promise<void>;
    truncate: (path: PathLike, len?: number) => Promise<void>;
    unlink: (path: PathLike) => Promise<void>;
    utimes: (path: PathLike, atime: TTime$1, mtime: TTime$1) => Promise<void>;
    watch: (filename: PathLike, options?: IWatchOptions$1) => AsyncIterableIterator<{
        eventType: string;
        filename: string | Buffer;
    }>;
    writeFile: (id: TFileHandle, data: TPromisesData, options?: IWriteFileOptions) => Promise<void>;
    glob: (pattern: string, options?: IGlobOptions) => Promise<string[]>;
}

interface ToTreeOptions {
    dir?: string;
    tab?: string;
    depth?: number;
    separator?: '/' | '\\';
    sort?: boolean;
}

/**
 * A directory stream, like `fs.Dir`.
 */
declare class Dir implements IDir {
    protected readonly link: Link;
    protected options: IOpendirOptions;
    private iteratorInfo;
    private closed;
    private operationQueue;
    constructor(link: Link, options: IOpendirOptions);
    private closeBase;
    private readBase;
    readonly path: string;
    close(): Promise<void>;
    close(callback?: (err?: Error) => void): void;
    closeSync(): void;
    read(): Promise<IDirent | null>;
    read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
    readSync(): IDirent | null;
    [Symbol.asyncIterator](): AsyncIterableIterator<IDirent>;
}

type TData = TDataOut | ArrayBufferView | DataView;
type TFlags = string | number;
type TMode = string | number;
type TTime = number | string | Date;
type TFlagsCopy = typeof constants.COPYFILE_EXCL | typeof constants.COPYFILE_FICLONE | typeof constants.COPYFILE_FICLONE_FORCE;
interface IAppendFileOptions extends IFileOptions {
}
interface IWatchFileOptions {
    persistent?: boolean;
    interval?: number;
}
interface IWatchOptions extends IOptions {
    persistent?: boolean;
    recursive?: boolean;
}
/**
 * `Volume` represents a file system.
 */
declare class Volume implements FsCallbackApi, FsSynchronousApi {
    readonly _core: Superblock;
    static readonly fromJSON: (json: DirectoryJSON, cwd?: string) => Volume;
    static readonly fromNestedJSON: (json: NestedDirectoryJSON, cwd?: string) => Volume;
    StatWatcher: new () => StatWatcher;
    ReadStream: new (...args: any[]) => IReadStream;
    WriteStream: new (...args: any[]) => IWriteStream;
    FSWatcher: new () => FSWatcher;
    realpath: {
        (path: PathLike, callback: TCallback<TDataOut>): void;
        (path: PathLike, options: IRealpathOptions | string, callback: TCallback<TDataOut>): void;
        native: {
            (path: PathLike, callback: TCallback<TDataOut>): void;
            (path: PathLike, options: IRealpathOptions | string, callback: TCallback<TDataOut>): void;
        };
    };
    realpathSync: {
        (path: PathLike, options?: IRealpathOptions | string): TDataOut;
        native: (path: PathLike, options?: IRealpathOptions | string) => TDataOut;
    };
    private promisesApi;
    get promises(): FsPromisesApi;
    constructor(_core?: Superblock);
    private wrapAsync;
    toTree(opts?: ToTreeOptions): string;
    reset(): void;
    toJSON(paths?: PathLike | PathLike[], json?: {}, isRelative?: boolean, asBuffer?: boolean): DirectoryJSON<string | null>;
    fromJSON(json: DirectoryJSON, cwd?: string): void;
    fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): void;
    mountSync(mountpoint: string, json: DirectoryJSON): void;
    openSync: (path: PathLike, flags: TFlags, mode?: TMode) => number;
    open: {
        (path: PathLike, flags: TFlags, /* ... */ callback: TCallback<number>): void;
        (path: PathLike, flags: TFlags, mode: TMode, callback: TCallback<number>): void;
    };
    closeSync: (fd: number) => void;
    close: (fd: number, callback: TCallback<void>) => void;
    readSync: (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, length: number, position: number | null) => number;
    read: (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, length: number, position: number | null, callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer$1 | ArrayBufferView | DataView) => void) => void;
    readv: {
        (fd: number, buffers: ArrayBufferView[], callback: TCallback2<number, ArrayBufferView[]>): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: TCallback2<number, ArrayBufferView[]>): void;
    };
    readvSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    private readonly _readfile;
    readFileSync: (file: TFileId, options?: IReadFileOptions | string) => TDataOut;
    readFile: {
        (id: TFileId, callback: TCallback<TDataOut>): any;
        (id: TFileId, options: IReadFileOptions | string, callback: TCallback<TDataOut>): any;
    };
    private _write;
    writeSync: {
        (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): number;
        (fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
    };
    write: {
        (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, length: number, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer$1 | ArrayBufferView | DataView, offset: number, length: number, position: number, callback: (...args: any[]) => void): any;
        (fd: number, str: string, callback: (...args: any[]) => void): any;
        (fd: number, str: string, position: number, callback: (...args: any[]) => void): any;
        (fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args: any[]) => void): any;
    };
    private writevBase;
    writev: {
        (fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
    };
    writevSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    writeFileSync: (id: TFileId, data: TData, options?: IWriteFileOptions) => void;
    writeFile: {
        (id: TFileId, data: TData, callback: TCallback<void>): void;
        (id: TFileId, data: TData, options: IWriteFileOptions | string, callback: TCallback<void>): void;
    };
    private _copyFile;
    copyFileSync: (src: PathLike, dest: PathLike, flags?: TFlagsCopy) => void;
    copyFile: {
        (src: PathLike, dest: PathLike, callback: TCallback<void>): any;
        (src: PathLike, dest: PathLike, flags: TFlagsCopy, callback: TCallback<void>): any;
    };
    private readonly _cp;
    private isSrcSubdir;
    private cpFileSync;
    private cpDirSync;
    private cpSymlinkSync;
    linkSync: (existingPath: PathLike, newPath: PathLike) => void;
    link: (existingPath: PathLike, newPath: PathLike, callback: TCallback<void>) => void;
    unlinkSync: (path: PathLike) => void;
    unlink: (path: PathLike, callback: TCallback<void>) => void;
    /**
     * `type` argument works only on Windows.
     * @param target
     * @param path
     * @param type
     */
    symlinkSync: (target: PathLike, path: PathLike, type?: symlink.Type) => void;
    symlink: {
        (target: PathLike, path: PathLike, callback: TCallback<void>): any;
        (target: PathLike, path: PathLike, type: symlink.Type, callback: TCallback<void>): any;
    };
    private readonly _lstat;
    lstatSync: {
        (path: PathLike): Stats<number>;
        (path: PathLike, options: {
            throwIfNoEntry?: true | undefined;
        }): Stats<number>;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true | undefined;
        }): Stats<number>;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true | undefined;
        }): Stats<bigint>;
        (path: PathLike, options: {
            throwIfNoEntry: false;
        }): Stats<number> | undefined;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): Stats<number> | undefined;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): Stats<bigint> | undefined;
    };
    lstat(path: PathLike, callback: TCallback<Stats>): void;
    lstat(path: PathLike, options: IStatOptions, callback: TCallback<Stats>): void;
    private _stat;
    statSync(path: PathLike): Stats<number>;
    statSync(path: PathLike, options: {
        throwIfNoEntry?: true;
    }): Stats<number>;
    statSync(path: PathLike, options: {
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
    statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry?: true;
    }): Stats<number>;
    statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry?: true;
    }): Stats<bigint>;
    statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
    statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry: false;
    }): Stats<bigint> | undefined;
    stat(path: PathLike, callback: TCallback<Stats>): void;
    stat(path: PathLike, options: IStatOptions, callback: TCallback<Stats>): void;
    private fstatBase;
    fstatSync(fd: number): Stats<number>;
    fstatSync(fd: number, options: {
        bigint: false;
    }): Stats<number>;
    fstatSync(fd: number, options: {
        bigint: true;
    }): Stats<bigint>;
    fstat(fd: number, callback: TCallback<Stats>): void;
    fstat(fd: number, options: IFStatOptions, callback: TCallback<Stats>): void;
    renameSync: (oldPath: PathLike, newPath: PathLike) => void;
    rename: (oldPath: PathLike, newPath: PathLike, callback: TCallback<void>) => void;
    private _exists;
    existsSync: (path: PathLike) => boolean;
    exists: (path: PathLike, callback: (exists: boolean) => void) => void;
    private _access;
    accessSync: (path: PathLike, mode?: number) => void;
    access: {
        (path: PathLike, callback: TCallback<void>): any;
        (path: PathLike, mode: number, callback: TCallback<void>): any;
    };
    appendFileSync: (id: TFileId, data: TData, options?: IAppendFileOptions | string) => void;
    appendFile: {
        (id: TFileId, data: TData, callback: TCallback<void>): any;
        (id: TFileId, data: TData, options: IAppendFileOptions | string, callback: TCallback<void>): any;
    };
    private readonly _readdir;
    readdirSync: (path: PathLike, options?: IReaddirOptions | string) => TDataOut[] | Dirent[];
    readdir: {
        (path: PathLike, callback: TCallback<TDataOut[] | Dirent[]>): any;
        (path: PathLike, options: IReaddirOptions | string, callback: TCallback<TDataOut[] | Dirent[]>): any;
    };
    private readonly _readlink;
    readlinkSync: (path: PathLike, options?: IOptions) => TDataOut;
    readlink: {
        (path: PathLike, callback: TCallback<TDataOut>): any;
        (path: PathLike, options: IOptions, callback: TCallback<TDataOut>): any;
    };
    private readonly _fsync;
    fsyncSync: (fd: number) => void;
    fsync: (fd: number, callback: TCallback<void>) => void;
    private readonly _fdatasync;
    fdatasyncSync: (fd: number) => void;
    fdatasync: (fd: number, callback: TCallback<void>) => void;
    private readonly _ftruncate;
    ftruncateSync: (fd: number, len?: number) => void;
    ftruncate: {
        (fd: number, callback: TCallback<void>): any;
        (fd: number, len: number, callback: TCallback<void>): any;
    };
    private readonly _truncate;
    /**
     * `id` should be a file descriptor or a path. `id` as file descriptor will
     * not be supported soon.
     */
    truncateSync: (id: TFileId, len?: number) => void;
    truncate: {
        (id: TFileId, callback: TCallback<void>): any;
        (id: TFileId, len: number, callback: TCallback<void>): any;
    };
    private readonly _futimes;
    futimesSync: (fd: number, atime: TTime, mtime: TTime) => void;
    futimes: (fd: number, atime: TTime, mtime: TTime, callback: TCallback<void>) => void;
    private readonly _utimes;
    utimesSync: (path: PathLike, atime: TTime, mtime: TTime) => void;
    utimes: (path: PathLike, atime: TTime, mtime: TTime, callback: TCallback<void>) => void;
    lutimesSync: (path: PathLike, atime: TTime, mtime: TTime) => void;
    lutimes: (path: PathLike, atime: TTime, mtime: TTime, callback: TCallback<void>) => void;
    mkdirSync: {
        (path: PathLike, options: IMkdirOptions & {
            recursive: true;
        }): string | undefined;
        (path: PathLike, options?: TMode | (IMkdirOptions & {
            recursive?: false;
        })): void;
        (path: PathLike, options?: TMode | IMkdirOptions): string | undefined;
    };
    mkdir: {
        (path: PathLike, callback: TCallback<void>): any;
        (path: PathLike, mode: TMode | (IMkdirOptions & {
            recursive?: false;
        }), callback: TCallback<void>): any;
        (path: PathLike, mode: IMkdirOptions & {
            recursive: true;
        }, callback: TCallback<string>): any;
        (path: PathLike, mode: TMode | IMkdirOptions, callback: TCallback<string>): any;
    };
    private readonly _mkdtemp;
    mkdtempSync: (prefix: string, options?: IOptions) => TDataOut;
    mkdtemp: {
        (prefix: string, callback: TCallback<string>): any;
        (prefix: string, options: IOptions, callback: TCallback<string>): any;
    };
    rmdirSync: (path: PathLike, options?: IRmdirOptions) => void;
    rmdir: {
        (path: PathLike, callback: TCallback<void>): any;
        (path: PathLike, options: IRmdirOptions, callback: TCallback<void>): any;
    };
    rmSync: (path: PathLike, options?: IRmOptions) => void;
    rm: {
        (path: PathLike, callback: TCallback<void>): void;
        (path: PathLike, options: IRmOptions, callback: TCallback<void>): void;
    };
    private readonly _fchmod;
    fchmodSync: (fd: number, mode: TMode) => void;
    fchmod: (fd: number, mode: TMode, callback: TCallback<void>) => void;
    private readonly _chmod;
    chmodSync: (path: PathLike, mode: TMode) => void;
    chmod: (path: PathLike, mode: TMode, callback: TCallback<void>) => void;
    private readonly _lchmod;
    lchmodSync: (path: PathLike, mode: TMode) => void;
    lchmod: (path: PathLike, mode: TMode, callback: TCallback<void>) => void;
    private readonly _fchown;
    fchownSync: (fd: number, uid: number, gid: number) => void;
    fchown: (fd: number, uid: number, gid: number, callback: TCallback<void>) => void;
    private readonly _chown;
    chownSync: (path: PathLike, uid: number, gid: number) => void;
    chown: (path: PathLike, uid: number, gid: number, callback: TCallback<void>) => void;
    private readonly _lchown;
    lchownSync: (path: PathLike, uid: number, gid: number) => void;
    lchown: (path: PathLike, uid: number, gid: number, callback: TCallback<void>) => void;
    private statWatchers;
    watchFile(path: PathLike, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    watchFile(path: PathLike, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    unwatchFile(path: PathLike, listener?: (curr: Stats, prev: Stats) => void): void;
    createReadStream(path: PathLike, options?: IReadStreamOptions | string): IReadStream;
    createWriteStream(path: PathLike, options?: IWriteStreamOptions | string): IWriteStream;
    watch(path: PathLike, options?: IWatchOptions | string, listener?: (eventType: string, filename: string) => void): FSWatcher;
    cpSync: (src: string | URL, dest: string | URL, options?: ICpOptions) => void;
    cp: {
        (src: string | URL, dest: string | URL, callback: TCallback<void>): any;
        (src: string | URL, dest: string | URL, options: ICpOptions, callback: TCallback<void>): any;
    };
    private _statfs;
    statfsSync(path: PathLike): StatFs<number>;
    statfsSync(path: PathLike, options: {
        bigint: false;
    }): StatFs<number>;
    statfsSync(path: PathLike, options: {
        bigint: true;
    }): StatFs<bigint>;
    statfs(path: PathLike, callback: TCallback<StatFs>): void;
    statfs(path: PathLike, options: IStafsOptions, callback: TCallback<StatFs>): void;
    openAsBlob: (path: PathLike, options?: IOpenAsBlobOptions) => Promise<Blob>;
    glob: FsCallbackApi['glob'];
    globSync: FsSynchronousApi['globSync'];
    private readonly _globSync;
    private readonly _opendir;
    opendirSync: (path: PathLike, options?: IOpendirOptions | string) => Dir;
    opendir: {
        (path: PathLike, callback: TCallback<Dir>): any;
        (path: PathLike, options: IOpendirOptions | string, callback: TCallback<Dir>): any;
    };
}
declare class StatWatcher extends EventEmitter {
    vol: Volume;
    filename: string;
    interval: number;
    timeoutRef?: any;
    setTimeout: TSetTimeout;
    prev: Stats;
    constructor(vol: Volume);
    private loop;
    private hasChanged;
    private onInterval;
    start(path: string, persistent?: boolean, interval?: number): void;
    stop(): void;
}
interface IWriteStream extends Writable {
    bytesWritten: number;
    path: string;
    pending: boolean;
    new (path: PathLike, options: IWriteStreamOptions): any;
    open(): any;
    close(): any;
}
declare class FSWatcher extends EventEmitter {
    _vol: Volume;
    _filename: string;
    _steps: string[];
    _filenameEncoded: TDataOut;
    _recursive: boolean;
    _encoding: BufferEncoding;
    _link: Link;
    _timer: any;
    private _listenerRemovers;
    constructor(vol: Volume);
    private _getName;
    private _onParentChild;
    private _emit;
    private _persist;
    start(path: PathLike, persistent?: boolean, recursive?: boolean, encoding?: BufferEncoding): void;
    protected _parentChangesUnsub: FanOutUnsubscribe;
    close(): void;
}

declare const vol: Volume;
interface IFs extends Volume {
    constants: typeof constants;
    Stats: new (...args: any[]) => Stats;
    Dirent: new (...args: any[]) => Dirent;
    StatWatcher: new () => StatWatcher;
    FSWatcher: new () => FSWatcher;
    ReadStream: new (...args: any[]) => IReadStream;
    WriteStream: new (...args: any[]) => IWriteStream;
    promises: FsPromisesApi;
    _toUnixTimestamp: any;
}
declare function createFsFromVolume(vol: Volume): IFs;
declare const fs: IFs;
/**
 * Creates a new file system instance.
 *
 * @param json File system structure expressed as a JSON object.
 *        Use `null` for empty directories and empty string for empty files.
 * @param cwd Current working directory. The JSON structure will be created
 *        relative to this path.
 * @returns A `memfs` file system instance, which is a drop-in replacement for
 *          the `fs` module.
 */
declare const memfs: (json?: NestedDirectoryJSON, cwd?: string) => {
    fs: IFs;
    vol: Volume;
};
type IFsWithVolume = IFs & {
    __vol: Volume;
};

export { Volume, createFsFromVolume, fs, memfs, vol };
export type { DirectoryJSON, IFs, IFsWithVolume, NestedDirectoryJSON };
