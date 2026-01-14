import type { CliShortcut, NormalizedConfig } from '../types/config';
export declare const isCliShortcutsEnabled: (config: NormalizedConfig) => boolean;
export declare function setupCliShortcuts({ help, openPage, closeServer, printUrls, restartServer, customShortcuts, }: {
    help?: boolean | string;
    openPage: () => Promise<void>;
    closeServer: () => Promise<void>;
    printUrls: () => void;
    restartServer?: () => Promise<boolean>;
    customShortcuts?: (shortcuts: CliShortcut[]) => CliShortcut[];
}): Promise<() => void>;
