"use strict";
const __rslib_import_meta_url__ = "u" < typeof document ? new (require('url'.replace('', ''))).URL('file:' + __filename).href : document.currentScript && document.currentScript.src || new URL('main.js', document.baseURI).href;
exports.ids = [
    "664"
], exports.modules = {
    "../../node_modules/.pnpm/open@11.0.0/node_modules/open/index.js" (__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
        let isDockerCached, cachedResult, canAccessPowerShellPromise, mountPoint, defaultMountPoint;
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>node_modules_open,
            apps: ()=>open_apps
        });
        var external_node_process_ = __webpack_require__("node:process"), external_node_path_ = __webpack_require__("node:path"), external_node_url_ = __webpack_require__("node:url"), external_node_child_process_ = __webpack_require__("node:child_process"), promises_ = __webpack_require__("node:fs/promises"), external_node_os_ = __webpack_require__("node:os"), external_node_fs_ = __webpack_require__("node:fs");
        function hasDockerEnv() {
            try {
                return external_node_fs_.statSync('/.dockerenv'), !0;
            } catch  {
                return !1;
            }
        }
        function hasDockerCGroup() {
            try {
                return external_node_fs_.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
            } catch  {
                return !1;
            }
        }
        function isDocker() {
            return void 0 === isDockerCached && (isDockerCached = hasDockerEnv() || hasDockerCGroup()), isDockerCached;
        }
        function isInsideContainer() {
            return void 0 === cachedResult && (cachedResult = (()=>{
                try {
                    return external_node_fs_.statSync('/run/.containerenv'), !0;
                } catch  {
                    return !1;
                }
            })() || isDocker()), cachedResult;
        }
        let isWsl = ()=>{
            if ('linux' !== external_node_process_.platform) return !1;
            if (external_node_os_.release().toLowerCase().includes('microsoft')) return !isInsideContainer();
            try {
                return !!external_node_fs_.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft') && !isInsideContainer();
            } catch  {
                return !1;
            }
        }, is_wsl = external_node_process_.env.__IS_WSL_TEST__ ? isWsl : isWsl();
        var external_node_util_ = __webpack_require__("node:util"), external_node_buffer_ = __webpack_require__("node:buffer");
        let execFile = (0, external_node_util_.promisify)(external_node_child_process_.execFile), powerShellPath = ()=>`${external_node_process_.env.SYSTEMROOT || external_node_process_.env.windir || String.raw`C:\Windows`}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`, executePowerShell = async (command, options = {})=>{
            let { powerShellPath: psPath, ...execFileOptions } = options, encodedCommand = executePowerShell.encodeCommand(command);
            return execFile(psPath ?? powerShellPath(), [
                ...executePowerShell.argumentsPrefix,
                encodedCommand
            ], {
                encoding: 'utf8',
                ...execFileOptions
            });
        };
        executePowerShell.argumentsPrefix = [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-EncodedCommand'
        ], executePowerShell.encodeCommand = (command)=>external_node_buffer_.Buffer.from(command, 'utf16le').toString('base64'), executePowerShell.escapeArgument = (value)=>`'${String(value).replaceAll('\'', '\'\'')}'`;
        let wsl_utils_execFile = (0, external_node_util_.promisify)(external_node_child_process_.execFile), wslDrivesMountPoint = (defaultMountPoint = '/mnt/', async function() {
            if (mountPoint) return mountPoint;
            let configFilePath = '/etc/wsl.conf', isConfigFileExists = !1;
            try {
                await promises_.access(configFilePath, promises_.constants.F_OK), isConfigFileExists = !0;
            } catch  {}
            if (!isConfigFileExists) return defaultMountPoint;
            let configContent = await promises_.readFile(configFilePath, {
                encoding: 'utf8'
            }), configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(configContent);
            return configMountPoint ? mountPoint = (mountPoint = configMountPoint.groups.mountPoint.trim()).endsWith('/') ? mountPoint : `${mountPoint}/` : defaultMountPoint;
        }), powerShellPathFromWsl = async ()=>{
            let mountPoint = await wslDrivesMountPoint();
            return `${mountPoint}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
        }, wsl_utils_powerShellPath = is_wsl ? powerShellPathFromWsl : powerShellPath, wsl_utils_canAccessPowerShell = async ()=>canAccessPowerShellPromise ??= (async ()=>{
                try {
                    let psPath = await wsl_utils_powerShellPath();
                    return await promises_.access(psPath, promises_.constants.X_OK), !0;
                } catch  {
                    return !1;
                }
            })(), wslDefaultBrowser = async ()=>{
            let psPath = await wsl_utils_powerShellPath(), command = String.raw`(Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice").ProgId`, { stdout } = await executePowerShell(command, {
                powerShellPath: psPath
            });
            return stdout.trim();
        }, convertWslPathToWindows = async (path)=>{
            if (/^[a-z]+:\/\//i.test(path)) return path;
            try {
                let { stdout } = await wsl_utils_execFile('wslpath', [
                    '-aw',
                    path
                ], {
                    encoding: 'utf8'
                });
                return stdout.trim();
            } catch  {
                return path;
            }
        };
        function defineLazyProperty(object, propertyName, valueGetter) {
            let define = (value)=>Object.defineProperty(object, propertyName, {
                    value,
                    enumerable: !0,
                    writable: !0
                });
            return Object.defineProperty(object, propertyName, {
                configurable: !0,
                enumerable: !0,
                get () {
                    let result = valueGetter();
                    return define(result), result;
                },
                set (value) {
                    define(value);
                }
            }), object;
        }
        let execFileAsync = (0, external_node_util_.promisify)(external_node_child_process_.execFile), windowsBrowserProgIds = {
            MSEdgeHTM: {
                name: 'Edge',
                id: 'com.microsoft.edge'
            },
            MSEdgeBHTML: {
                name: 'Edge Beta',
                id: 'com.microsoft.edge.beta'
            },
            MSEdgeDHTML: {
                name: 'Edge Dev',
                id: 'com.microsoft.edge.dev'
            },
            AppXq0fevzme2pys62n3e0fbqa7peapykr8v: {
                name: 'Edge',
                id: 'com.microsoft.edge.old'
            },
            ChromeHTML: {
                name: 'Chrome',
                id: 'com.google.chrome'
            },
            ChromeBHTML: {
                name: 'Chrome Beta',
                id: 'com.google.chrome.beta'
            },
            ChromeDHTML: {
                name: 'Chrome Dev',
                id: 'com.google.chrome.dev'
            },
            ChromiumHTM: {
                name: 'Chromium',
                id: 'org.chromium.Chromium'
            },
            BraveHTML: {
                name: 'Brave',
                id: 'com.brave.Browser'
            },
            BraveBHTML: {
                name: 'Brave Beta',
                id: 'com.brave.Browser.beta'
            },
            BraveDHTML: {
                name: 'Brave Dev',
                id: 'com.brave.Browser.dev'
            },
            BraveSSHTM: {
                name: 'Brave Nightly',
                id: 'com.brave.Browser.nightly'
            },
            FirefoxURL: {
                name: 'Firefox',
                id: 'org.mozilla.firefox'
            },
            OperaStable: {
                name: 'Opera',
                id: 'com.operasoftware.Opera'
            },
            VivaldiHTM: {
                name: 'Vivaldi',
                id: 'com.vivaldi.Vivaldi'
            },
            'IE.HTTP': {
                name: 'Internet Explorer',
                id: 'com.microsoft.ie'
            }
        }, _windowsBrowserProgIdMap = new Map(Object.entries(windowsBrowserProgIds));
        class UnknownBrowserError extends Error {
        }
        async function defaultBrowser(_execFileAsync = execFileAsync) {
            let { stdout } = await _execFileAsync('reg', [
                'QUERY',
                ' HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice',
                '/v',
                'ProgId'
            ]), match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
            if (!match) throw new UnknownBrowserError(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
            let { id } = match.groups, browser = windowsBrowserProgIds[id];
            if (!browser) throw new UnknownBrowserError(`Unknown browser ID: ${id}`);
            return browser;
        }
        let default_browser_id_execFileAsync = (0, external_node_util_.promisify)(external_node_child_process_.execFile);
        async function defaultBrowserId() {
            if ('darwin' !== external_node_process_.platform) throw Error('macOS only');
            let { stdout } = await default_browser_id_execFileAsync('defaults', [
                'read',
                'com.apple.LaunchServices/com.apple.launchservices.secure',
                'LSHandlers'
            ]), match = /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout);
            return match?.groups.id ?? 'com.apple.Safari';
        }
        let run_applescript_execFileAsync = (0, external_node_util_.promisify)(external_node_child_process_.execFile);
        async function runAppleScript(script, { humanReadableOutput = !0, signal } = {}) {
            if ('darwin' !== external_node_process_.platform) throw Error('macOS only');
            let execOptions = {};
            signal && (execOptions.signal = signal);
            let { stdout } = await run_applescript_execFileAsync("osascript", [
                '-e',
                script,
                humanReadableOutput ? [] : [
                    '-ss'
                ]
            ], execOptions);
            return stdout.trim();
        }
        async function bundleName(bundleId) {
            return runAppleScript(`tell application "Finder" to set app_path to application file id "${bundleId}" as string\ntell application "System Events" to get value of property list item "CFBundleName" of property list file (app_path & ":Contents:Info.plist")`);
        }
        let default_browser_execFileAsync = (0, external_node_util_.promisify)(external_node_child_process_.execFile);
        async function default_browser_defaultBrowser() {
            if ('darwin' === external_node_process_.platform) {
                let id = await defaultBrowserId();
                return {
                    name: await bundleName(id),
                    id
                };
            }
            if ('linux' === external_node_process_.platform) {
                let { stdout } = await default_browser_execFileAsync('xdg-mime', [
                    'query',
                    'default',
                    'x-scheme-handler/http'
                ]), id = stdout.trim();
                return {
                    name: id.replace(/.desktop$/, '').replace('-', ' ').toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (x)=>x.toUpperCase()),
                    id
                };
            }
            if ('win32' === external_node_process_.platform) return defaultBrowser();
            throw Error('Only macOS, Linux, and Windows are supported');
        }
        let isInSsh = !!(external_node_process_.env.SSH_CONNECTION || external_node_process_.env.SSH_CLIENT || external_node_process_.env.SSH_TTY), fallbackAttemptSymbol = Symbol('fallbackAttempt'), open_dirname = __rslib_import_meta_url__ ? external_node_path_.dirname((0, external_node_url_.fileURLToPath)(__rslib_import_meta_url__)) : '', localXdgOpenPath = external_node_path_.join(open_dirname, 'xdg-open'), { platform, arch } = external_node_process_, tryEachApp = async (apps, opener)=>{
            if (0 === apps.length) return;
            let errors = [];
            for (let app of apps)try {
                return await opener(app);
            } catch (error) {
                errors.push(error);
            }
            throw AggregateError(errors, 'Failed to open in all supported apps');
        }, baseOpen = async (options)=>{
            let command, isFallbackAttempt = !0 === (options = {
                wait: !1,
                background: !1,
                newInstance: !1,
                allowNonzeroExitCode: !1,
                ...options
            })[fallbackAttemptSymbol];
            if (delete options[fallbackAttemptSymbol], Array.isArray(options.app)) return tryEachApp(options.app, (singleApp)=>baseOpen({
                    ...options,
                    app: singleApp,
                    [fallbackAttemptSymbol]: !0
                }));
            let { name: app, arguments: appArguments = [] } = options.app ?? {};
            if (appArguments = [
                ...appArguments
            ], Array.isArray(app)) return tryEachApp(app, (appName)=>baseOpen({
                    ...options,
                    app: {
                        name: appName,
                        arguments: appArguments
                    },
                    [fallbackAttemptSymbol]: !0
                }));
            if ('browser' === app || 'browserPrivate' === app) {
                let browser, ids = {
                    'com.google.chrome': 'chrome',
                    'google-chrome.desktop': 'chrome',
                    'com.brave.browser': 'brave',
                    'org.mozilla.firefox': 'firefox',
                    'firefox.desktop': 'firefox',
                    'com.microsoft.msedge': 'edge',
                    'com.microsoft.edge': 'edge',
                    'com.microsoft.edgemac': 'edge',
                    'microsoft-edge.desktop': 'edge',
                    'com.apple.safari': 'safari'
                };
                if (is_wsl) {
                    let progId = await wslDefaultBrowser();
                    browser = _windowsBrowserProgIdMap.get(progId) ?? {};
                } else browser = await default_browser_defaultBrowser();
                if (browser.id in ids) {
                    let browserName = ids[browser.id.toLowerCase()];
                    if ('browserPrivate' === app) {
                        if ('safari' === browserName) throw Error('Safari doesn\'t support opening in private mode via command line');
                        appArguments.push({
                            chrome: '--incognito',
                            brave: '--incognito',
                            firefox: '--private-window',
                            edge: '--inPrivate'
                        }[browserName]);
                    }
                    return baseOpen({
                        ...options,
                        app: {
                            name: open_apps[browserName],
                            arguments: appArguments
                        }
                    });
                }
                throw Error(`${browser.name} is not supported as a default browser`);
            }
            let cliArguments = [], childProcessOptions = {}, shouldUseWindowsInWsl = !1;
            if (!is_wsl || isInsideContainer() || isInSsh || app || (shouldUseWindowsInWsl = await wsl_utils_canAccessPowerShell()), 'darwin' === platform) command = 'open', options.wait && cliArguments.push('--wait-apps'), options.background && cliArguments.push('--background'), options.newInstance && cliArguments.push('--new'), app && cliArguments.push('-a', app);
            else if ('win32' === platform || shouldUseWindowsInWsl) {
                command = await wsl_utils_powerShellPath(), cliArguments.push(...executePowerShell.argumentsPrefix), is_wsl || (childProcessOptions.windowsVerbatimArguments = !0), is_wsl && options.target && (options.target = await convertWslPathToWindows(options.target));
                let encodedArguments = [
                    '$ProgressPreference = \'SilentlyContinue\';',
                    'Start'
                ];
                options.wait && encodedArguments.push('-Wait'), app ? (encodedArguments.push(executePowerShell.escapeArgument(app)), options.target && appArguments.push(options.target)) : options.target && encodedArguments.push(executePowerShell.escapeArgument(options.target)), appArguments.length > 0 && encodedArguments.push('-ArgumentList', (appArguments = appArguments.map((argument)=>executePowerShell.escapeArgument(argument))).join(',')), options.target = executePowerShell.encodeCommand(encodedArguments.join(' ')), options.wait || (childProcessOptions.stdio = 'ignore');
            } else {
                if (app) command = app;
                else {
                    let exeLocalXdgOpen = !1;
                    try {
                        await promises_.access(localXdgOpenPath, promises_.constants.X_OK), exeLocalXdgOpen = !0;
                    } catch  {}
                    command = external_node_process_.versions.electron ?? ('android' === platform || !open_dirname || '/' === open_dirname || !exeLocalXdgOpen) ? 'xdg-open' : localXdgOpenPath;
                }
                appArguments.length > 0 && cliArguments.push(...appArguments), options.wait || (childProcessOptions.stdio = 'ignore', childProcessOptions.detached = !0);
            }
            'darwin' === platform && appArguments.length > 0 && cliArguments.push('--args', ...appArguments), options.target && cliArguments.push(options.target);
            let subprocess = external_node_child_process_.spawn(command, cliArguments, childProcessOptions);
            return options.wait ? new Promise((resolve, reject)=>{
                subprocess.once('error', reject), subprocess.once('close', (exitCode)=>{
                    options.allowNonzeroExitCode || 0 === exitCode ? resolve(subprocess) : reject(Error(`Exited with code ${exitCode}`));
                });
            }) : isFallbackAttempt ? new Promise((resolve, reject)=>{
                subprocess.once('error', reject), subprocess.once('spawn', ()=>{
                    subprocess.once('close', (exitCode)=>{
                        (subprocess.off('error', reject), 0 !== exitCode) ? reject(Error(`Exited with code ${exitCode}`)) : (subprocess.unref(), resolve(subprocess));
                    });
                });
            }) : (subprocess.unref(), new Promise((resolve, reject)=>{
                subprocess.once('error', reject), subprocess.once('spawn', ()=>{
                    subprocess.off('error', reject), resolve(subprocess);
                });
            }));
        };
        function detectArchBinary(binary) {
            if ('string' == typeof binary || Array.isArray(binary)) return binary;
            let { [arch]: archBinary } = binary;
            if (!archBinary) throw Error(`${arch} is not supported`);
            return archBinary;
        }
        function detectPlatformBinary({ [platform]: platformBinary }, { wsl } = {}) {
            if (wsl && is_wsl) return detectArchBinary(wsl);
            if (!platformBinary) throw Error(`${platform} is not supported`);
            return detectArchBinary(platformBinary);
        }
        let open_apps = {
            browser: 'browser',
            browserPrivate: 'browserPrivate'
        };
        defineLazyProperty(open_apps, 'chrome', ()=>detectPlatformBinary({
                darwin: 'google chrome',
                win32: 'chrome',
                linux: [
                    'google-chrome',
                    'google-chrome-stable',
                    'chromium',
                    'chromium-browser'
                ]
            }, {
                wsl: {
                    ia32: '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
                    x64: [
                        '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
                        '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
                    ]
                }
            })), defineLazyProperty(open_apps, 'brave', ()=>detectPlatformBinary({
                darwin: 'brave browser',
                win32: 'brave',
                linux: [
                    'brave-browser',
                    'brave'
                ]
            }, {
                wsl: {
                    ia32: '/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',
                    x64: [
                        '/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
                        '/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe'
                    ]
                }
            })), defineLazyProperty(open_apps, 'firefox', ()=>detectPlatformBinary({
                darwin: 'firefox',
                win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`,
                linux: 'firefox'
            }, {
                wsl: '/mnt/c/Program Files/Mozilla Firefox/firefox.exe'
            })), defineLazyProperty(open_apps, 'edge', ()=>detectPlatformBinary({
                darwin: 'microsoft edge',
                win32: 'msedge',
                linux: [
                    'microsoft-edge',
                    'microsoft-edge-dev'
                ]
            }, {
                wsl: '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
            })), defineLazyProperty(open_apps, 'safari', ()=>detectPlatformBinary({
                darwin: 'Safari'
            }));
        let node_modules_open = (target, options)=>{
            if ('string' != typeof target) throw TypeError('Expected a `target`');
            return baseOpen({
                ...options,
                target
            });
        };
    }
};
