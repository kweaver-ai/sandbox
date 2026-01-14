(() => {
  var __webpack_modules__ = {
    831: (module) => {
      let p = process || {},
        argv = p.argv || [],
        env = p.env || {};
      let isColorSupported =
        !(!!env.NO_COLOR || argv.includes("--no-color")) &&
        (!!env.FORCE_COLOR ||
          argv.includes("--color") ||
          p.platform === "win32" ||
          ((p.stdout || {}).isTTY && env.TERM !== "dumb") ||
          !!env.CI);
      let formatter =
        (open, close, replace = open) =>
        (input) => {
          let string = "" + input,
            index = string.indexOf(close, open.length);
          return ~index
            ? open + replaceClose(string, close, replace, index) + close
            : open + string + close;
        };
      let replaceClose = (string, close, replace, index) => {
        let result = "",
          cursor = 0;
        do {
          result += string.substring(cursor, index) + replace;
          cursor = index + close.length;
          index = string.indexOf(close, cursor);
        } while (~index);
        return result + string.substring(cursor);
      };
      let createColors = (enabled = isColorSupported) => {
        let f = enabled ? formatter : () => String;
        return {
          isColorSupported: enabled,
          reset: f("[0m", "[0m"),
          bold: f("[1m", "[22m", "[22m[1m"),
          dim: f("[2m", "[22m", "[22m[2m"),
          italic: f("[3m", "[23m"),
          underline: f("[4m", "[24m"),
          inverse: f("[7m", "[27m"),
          hidden: f("[8m", "[28m"),
          strikethrough: f("[9m", "[29m"),
          black: f("[30m", "[39m"),
          red: f("[31m", "[39m"),
          green: f("[32m", "[39m"),
          yellow: f("[33m", "[39m"),
          blue: f("[34m", "[39m"),
          magenta: f("[35m", "[39m"),
          cyan: f("[36m", "[39m"),
          white: f("[37m", "[39m"),
          gray: f("[90m", "[39m"),
          bgBlack: f("[40m", "[49m"),
          bgRed: f("[41m", "[49m"),
          bgGreen: f("[42m", "[49m"),
          bgYellow: f("[43m", "[49m"),
          bgBlue: f("[44m", "[49m"),
          bgMagenta: f("[45m", "[49m"),
          bgCyan: f("[46m", "[49m"),
          bgWhite: f("[47m", "[49m"),
          blackBright: f("[90m", "[39m"),
          redBright: f("[91m", "[39m"),
          greenBright: f("[92m", "[39m"),
          yellowBright: f("[93m", "[39m"),
          blueBright: f("[94m", "[39m"),
          magentaBright: f("[95m", "[39m"),
          cyanBright: f("[96m", "[39m"),
          whiteBright: f("[97m", "[39m"),
          bgBlackBright: f("[100m", "[49m"),
          bgRedBright: f("[101m", "[49m"),
          bgGreenBright: f("[102m", "[49m"),
          bgYellowBright: f("[103m", "[49m"),
          bgBlueBright: f("[104m", "[49m"),
          bgMagentaBright: f("[105m", "[49m"),
          bgCyanBright: f("[106m", "[49m"),
          bgWhiteBright: f("[107m", "[49m"),
        };
      };
      module.exports = createColors();
      module.exports.createColors = createColors;
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
  var __webpack_exports__ = __nccwpck_require__(831);
  module.exports = __webpack_exports__;
})();
