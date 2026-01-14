(() => {
  var __webpack_modules__ = {
    676: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const pico = __nccwpck_require__(582);
      const utils = __nccwpck_require__(473);
      function picomatch(glob, options, returnState = false) {
        if (
          options &&
          (options.windows === null || options.windows === undefined)
        ) {
          options = { ...options, windows: utils.isWindows() };
        }
        return pico(glob, options, returnState);
      }
      Object.assign(picomatch, pico);
      module.exports = picomatch;
    },
    717: (module) => {
      "use strict";
      const WIN_SLASH = "\\\\/";
      const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
      const DOT_LITERAL = "\\.";
      const PLUS_LITERAL = "\\+";
      const QMARK_LITERAL = "\\?";
      const SLASH_LITERAL = "\\/";
      const ONE_CHAR = "(?=.)";
      const QMARK = "[^/]";
      const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
      const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
      const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
      const NO_DOT = `(?!${DOT_LITERAL})`;
      const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
      const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
      const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
      const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
      const STAR = `${QMARK}*?`;
      const SEP = "/";
      const POSIX_CHARS = {
        DOT_LITERAL,
        PLUS_LITERAL,
        QMARK_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        QMARK,
        END_ANCHOR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOT_SLASH,
        NO_DOTS_SLASH,
        QMARK_NO_DOT,
        STAR,
        START_ANCHOR,
        SEP,
      };
      const WINDOWS_CHARS = {
        ...POSIX_CHARS,
        SLASH_LITERAL: `[${WIN_SLASH}]`,
        QMARK: WIN_NO_SLASH,
        STAR: `${WIN_NO_SLASH}*?`,
        DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
        NO_DOT: `(?!${DOT_LITERAL})`,
        NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
        NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
        NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
        QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
        START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
        END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
        SEP: "\\",
      };
      const POSIX_REGEX_SOURCE = {
        alnum: "a-zA-Z0-9",
        alpha: "a-zA-Z",
        ascii: "\\x00-\\x7F",
        blank: " \\t",
        cntrl: "\\x00-\\x1F\\x7F",
        digit: "0-9",
        graph: "\\x21-\\x7E",
        lower: "a-z",
        print: "\\x20-\\x7E ",
        punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
        space: " \\t\\r\\n\\v\\f",
        upper: "A-Z",
        word: "A-Za-z0-9_",
        xdigit: "A-Fa-f0-9",
      };
      module.exports = {
        MAX_LENGTH: 1024 * 64,
        POSIX_REGEX_SOURCE,
        REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
        REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
        REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
        REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
        REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
        REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
        REPLACEMENTS: {
          __proto__: null,
          "***": "*",
          "**/**": "**",
          "**/**/**": "**",
        },
        CHAR_0: 48,
        CHAR_9: 57,
        CHAR_UPPERCASE_A: 65,
        CHAR_LOWERCASE_A: 97,
        CHAR_UPPERCASE_Z: 90,
        CHAR_LOWERCASE_Z: 122,
        CHAR_LEFT_PARENTHESES: 40,
        CHAR_RIGHT_PARENTHESES: 41,
        CHAR_ASTERISK: 42,
        CHAR_AMPERSAND: 38,
        CHAR_AT: 64,
        CHAR_BACKWARD_SLASH: 92,
        CHAR_CARRIAGE_RETURN: 13,
        CHAR_CIRCUMFLEX_ACCENT: 94,
        CHAR_COLON: 58,
        CHAR_COMMA: 44,
        CHAR_DOT: 46,
        CHAR_DOUBLE_QUOTE: 34,
        CHAR_EQUAL: 61,
        CHAR_EXCLAMATION_MARK: 33,
        CHAR_FORM_FEED: 12,
        CHAR_FORWARD_SLASH: 47,
        CHAR_GRAVE_ACCENT: 96,
        CHAR_HASH: 35,
        CHAR_HYPHEN_MINUS: 45,
        CHAR_LEFT_ANGLE_BRACKET: 60,
        CHAR_LEFT_CURLY_BRACE: 123,
        CHAR_LEFT_SQUARE_BRACKET: 91,
        CHAR_LINE_FEED: 10,
        CHAR_NO_BREAK_SPACE: 160,
        CHAR_PERCENT: 37,
        CHAR_PLUS: 43,
        CHAR_QUESTION_MARK: 63,
        CHAR_RIGHT_ANGLE_BRACKET: 62,
        CHAR_RIGHT_CURLY_BRACE: 125,
        CHAR_RIGHT_SQUARE_BRACKET: 93,
        CHAR_SEMICOLON: 59,
        CHAR_SINGLE_QUOTE: 39,
        CHAR_SPACE: 32,
        CHAR_TAB: 9,
        CHAR_UNDERSCORE: 95,
        CHAR_VERTICAL_LINE: 124,
        CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
        extglobChars(chars) {
          return {
            "!": {
              type: "negate",
              open: "(?:(?!(?:",
              close: `))${chars.STAR})`,
            },
            "?": { type: "qmark", open: "(?:", close: ")?" },
            "+": { type: "plus", open: "(?:", close: ")+" },
            "*": { type: "star", open: "(?:", close: ")*" },
            "@": { type: "at", open: "(?:", close: ")" },
          };
        },
        globChars(win32) {
          return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
        },
      };
    },
    339: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const constants = __nccwpck_require__(717);
      const utils = __nccwpck_require__(473);
      const {
        MAX_LENGTH,
        POSIX_REGEX_SOURCE,
        REGEX_NON_SPECIAL_CHARS,
        REGEX_SPECIAL_CHARS_BACKREF,
        REPLACEMENTS,
      } = constants;
      const expandRange = (args, options) => {
        if (typeof options.expandRange === "function") {
          return options.expandRange(...args, options);
        }
        args.sort();
        const value = `[${args.join("-")}]`;
        try {
          new RegExp(value);
        } catch (ex) {
          return args.map((v) => utils.escapeRegex(v)).join("..");
        }
        return value;
      };
      const syntaxError = (type, char) =>
        `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
      const parse = (input, options) => {
        if (typeof input !== "string") {
          throw new TypeError("Expected a string");
        }
        input = REPLACEMENTS[input] || input;
        const opts = { ...options };
        const max =
          typeof opts.maxLength === "number"
            ? Math.min(MAX_LENGTH, opts.maxLength)
            : MAX_LENGTH;
        let len = input.length;
        if (len > max) {
          throw new SyntaxError(
            `Input length: ${len}, exceeds maximum allowed length: ${max}`,
          );
        }
        const bos = { type: "bos", value: "", output: opts.prepend || "" };
        const tokens = [bos];
        const capture = opts.capture ? "" : "?:";
        const PLATFORM_CHARS = constants.globChars(opts.windows);
        const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
        const {
          DOT_LITERAL,
          PLUS_LITERAL,
          SLASH_LITERAL,
          ONE_CHAR,
          DOTS_SLASH,
          NO_DOT,
          NO_DOT_SLASH,
          NO_DOTS_SLASH,
          QMARK,
          QMARK_NO_DOT,
          STAR,
          START_ANCHOR,
        } = PLATFORM_CHARS;
        const globstar = (opts) =>
          `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
        const nodot = opts.dot ? "" : NO_DOT;
        const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
        let star = opts.bash === true ? globstar(opts) : STAR;
        if (opts.capture) {
          star = `(${star})`;
        }
        if (typeof opts.noext === "boolean") {
          opts.noextglob = opts.noext;
        }
        const state = {
          input,
          index: -1,
          start: 0,
          dot: opts.dot === true,
          consumed: "",
          output: "",
          prefix: "",
          backtrack: false,
          negated: false,
          brackets: 0,
          braces: 0,
          parens: 0,
          quotes: 0,
          globstar: false,
          tokens,
        };
        input = utils.removePrefix(input, state);
        len = input.length;
        const extglobs = [];
        const braces = [];
        const stack = [];
        let prev = bos;
        let value;
        const eos = () => state.index === len - 1;
        const peek = (state.peek = (n = 1) => input[state.index + n]);
        const advance = (state.advance = () => input[++state.index] || "");
        const remaining = () => input.slice(state.index + 1);
        const consume = (value = "", num = 0) => {
          state.consumed += value;
          state.index += num;
        };
        const append = (token) => {
          state.output += token.output != null ? token.output : token.value;
          consume(token.value);
        };
        const negate = () => {
          let count = 1;
          while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
            advance();
            state.start++;
            count++;
          }
          if (count % 2 === 0) {
            return false;
          }
          state.negated = true;
          state.start++;
          return true;
        };
        const increment = (type) => {
          state[type]++;
          stack.push(type);
        };
        const decrement = (type) => {
          state[type]--;
          stack.pop();
        };
        const push = (tok) => {
          if (prev.type === "globstar") {
            const isBrace =
              state.braces > 0 &&
              (tok.type === "comma" || tok.type === "brace");
            const isExtglob =
              tok.extglob === true ||
              (extglobs.length &&
                (tok.type === "pipe" || tok.type === "paren"));
            if (
              tok.type !== "slash" &&
              tok.type !== "paren" &&
              !isBrace &&
              !isExtglob
            ) {
              state.output = state.output.slice(0, -prev.output.length);
              prev.type = "star";
              prev.value = "*";
              prev.output = star;
              state.output += prev.output;
            }
          }
          if (extglobs.length && tok.type !== "paren") {
            extglobs[extglobs.length - 1].inner += tok.value;
          }
          if (tok.value || tok.output) append(tok);
          if (prev && prev.type === "text" && tok.type === "text") {
            prev.output = (prev.output || prev.value) + tok.value;
            prev.value += tok.value;
            return;
          }
          tok.prev = prev;
          tokens.push(tok);
          prev = tok;
        };
        const extglobOpen = (type, value) => {
          const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: "" };
          token.prev = prev;
          token.parens = state.parens;
          token.output = state.output;
          const output = (opts.capture ? "(" : "") + token.open;
          increment("parens");
          push({ type, value, output: state.output ? "" : ONE_CHAR });
          push({ type: "paren", extglob: true, value: advance(), output });
          extglobs.push(token);
        };
        const extglobClose = (token) => {
          let output = token.close + (opts.capture ? ")" : "");
          let rest;
          if (token.type === "negate") {
            let extglobStar = star;
            if (
              token.inner &&
              token.inner.length > 1 &&
              token.inner.includes("/")
            ) {
              extglobStar = globstar(opts);
            }
            if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
              output = token.close = `)$))${extglobStar}`;
            }
            if (
              token.inner.includes("*") &&
              (rest = remaining()) &&
              /^\.[^\\/.]+$/.test(rest)
            ) {
              const expression = parse(rest, {
                ...options,
                fastpaths: false,
              }).output;
              output = token.close = `)${expression})${extglobStar})`;
            }
            if (token.prev.type === "bos") {
              state.negatedExtglob = true;
            }
          }
          push({ type: "paren", extglob: true, value, output });
          decrement("parens");
        };
        if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
          let backslashes = false;
          let output = input.replace(
            REGEX_SPECIAL_CHARS_BACKREF,
            (m, esc, chars, first, rest, index) => {
              if (first === "\\") {
                backslashes = true;
                return m;
              }
              if (first === "?") {
                if (esc) {
                  return esc + first + (rest ? QMARK.repeat(rest.length) : "");
                }
                if (index === 0) {
                  return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
                }
                return QMARK.repeat(chars.length);
              }
              if (first === ".") {
                return DOT_LITERAL.repeat(chars.length);
              }
              if (first === "*") {
                if (esc) {
                  return esc + first + (rest ? star : "");
                }
                return star;
              }
              return esc ? m : `\\${m}`;
            },
          );
          if (backslashes === true) {
            if (opts.unescape === true) {
              output = output.replace(/\\/g, "");
            } else {
              output = output.replace(/\\+/g, (m) =>
                m.length % 2 === 0 ? "\\\\" : m ? "\\" : "",
              );
            }
          }
          if (output === input && opts.contains === true) {
            state.output = input;
            return state;
          }
          state.output = utils.wrapOutput(output, state, options);
          return state;
        }
        while (!eos()) {
          value = advance();
          if (value === "\0") {
            continue;
          }
          if (value === "\\") {
            const next = peek();
            if (next === "/" && opts.bash !== true) {
              continue;
            }
            if (next === "." || next === ";") {
              continue;
            }
            if (!next) {
              value += "\\";
              push({ type: "text", value });
              continue;
            }
            const match = /^\\+/.exec(remaining());
            let slashes = 0;
            if (match && match[0].length > 2) {
              slashes = match[0].length;
              state.index += slashes;
              if (slashes % 2 !== 0) {
                value += "\\";
              }
            }
            if (opts.unescape === true) {
              value = advance();
            } else {
              value += advance();
            }
            if (state.brackets === 0) {
              push({ type: "text", value });
              continue;
            }
          }
          if (
            state.brackets > 0 &&
            (value !== "]" || prev.value === "[" || prev.value === "[^")
          ) {
            if (opts.posix !== false && value === ":") {
              const inner = prev.value.slice(1);
              if (inner.includes("[")) {
                prev.posix = true;
                if (inner.includes(":")) {
                  const idx = prev.value.lastIndexOf("[");
                  const pre = prev.value.slice(0, idx);
                  const rest = prev.value.slice(idx + 2);
                  const posix = POSIX_REGEX_SOURCE[rest];
                  if (posix) {
                    prev.value = pre + posix;
                    state.backtrack = true;
                    advance();
                    if (!bos.output && tokens.indexOf(prev) === 1) {
                      bos.output = ONE_CHAR;
                    }
                    continue;
                  }
                }
              }
            }
            if (
              (value === "[" && peek() !== ":") ||
              (value === "-" && peek() === "]")
            ) {
              value = `\\${value}`;
            }
            if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
              value = `\\${value}`;
            }
            if (opts.posix === true && value === "!" && prev.value === "[") {
              value = "^";
            }
            prev.value += value;
            append({ value });
            continue;
          }
          if (state.quotes === 1 && value !== '"') {
            value = utils.escapeRegex(value);
            prev.value += value;
            append({ value });
            continue;
          }
          if (value === '"') {
            state.quotes = state.quotes === 1 ? 0 : 1;
            if (opts.keepQuotes === true) {
              push({ type: "text", value });
            }
            continue;
          }
          if (value === "(") {
            increment("parens");
            push({ type: "paren", value });
            continue;
          }
          if (value === ")") {
            if (state.parens === 0 && opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("opening", "("));
            }
            const extglob = extglobs[extglobs.length - 1];
            if (extglob && state.parens === extglob.parens + 1) {
              extglobClose(extglobs.pop());
              continue;
            }
            push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
            decrement("parens");
            continue;
          }
          if (value === "[") {
            if (opts.nobracket === true || !remaining().includes("]")) {
              if (opts.nobracket !== true && opts.strictBrackets === true) {
                throw new SyntaxError(syntaxError("closing", "]"));
              }
              value = `\\${value}`;
            } else {
              increment("brackets");
            }
            push({ type: "bracket", value });
            continue;
          }
          if (value === "]") {
            if (
              opts.nobracket === true ||
              (prev && prev.type === "bracket" && prev.value.length === 1)
            ) {
              push({ type: "text", value, output: `\\${value}` });
              continue;
            }
            if (state.brackets === 0) {
              if (opts.strictBrackets === true) {
                throw new SyntaxError(syntaxError("opening", "["));
              }
              push({ type: "text", value, output: `\\${value}` });
              continue;
            }
            decrement("brackets");
            const prevValue = prev.value.slice(1);
            if (
              prev.posix !== true &&
              prevValue[0] === "^" &&
              !prevValue.includes("/")
            ) {
              value = `/${value}`;
            }
            prev.value += value;
            append({ value });
            if (
              opts.literalBrackets === false ||
              utils.hasRegexChars(prevValue)
            ) {
              continue;
            }
            const escaped = utils.escapeRegex(prev.value);
            state.output = state.output.slice(0, -prev.value.length);
            if (opts.literalBrackets === true) {
              state.output += escaped;
              prev.value = escaped;
              continue;
            }
            prev.value = `(${capture}${escaped}|${prev.value})`;
            state.output += prev.value;
            continue;
          }
          if (value === "{" && opts.nobrace !== true) {
            increment("braces");
            const open = {
              type: "brace",
              value,
              output: "(",
              outputIndex: state.output.length,
              tokensIndex: state.tokens.length,
            };
            braces.push(open);
            push(open);
            continue;
          }
          if (value === "}") {
            const brace = braces[braces.length - 1];
            if (opts.nobrace === true || !brace) {
              push({ type: "text", value, output: value });
              continue;
            }
            let output = ")";
            if (brace.dots === true) {
              const arr = tokens.slice();
              const range = [];
              for (let i = arr.length - 1; i >= 0; i--) {
                tokens.pop();
                if (arr[i].type === "brace") {
                  break;
                }
                if (arr[i].type !== "dots") {
                  range.unshift(arr[i].value);
                }
              }
              output = expandRange(range, opts);
              state.backtrack = true;
            }
            if (brace.comma !== true && brace.dots !== true) {
              const out = state.output.slice(0, brace.outputIndex);
              const toks = state.tokens.slice(brace.tokensIndex);
              brace.value = brace.output = "\\{";
              value = output = "\\}";
              state.output = out;
              for (const t of toks) {
                state.output += t.output || t.value;
              }
            }
            push({ type: "brace", value, output });
            decrement("braces");
            braces.pop();
            continue;
          }
          if (value === "|") {
            if (extglobs.length > 0) {
              extglobs[extglobs.length - 1].conditions++;
            }
            push({ type: "text", value });
            continue;
          }
          if (value === ",") {
            let output = value;
            const brace = braces[braces.length - 1];
            if (brace && stack[stack.length - 1] === "braces") {
              brace.comma = true;
              output = "|";
            }
            push({ type: "comma", value, output });
            continue;
          }
          if (value === "/") {
            if (prev.type === "dot" && state.index === state.start + 1) {
              state.start = state.index + 1;
              state.consumed = "";
              state.output = "";
              tokens.pop();
              prev = bos;
              continue;
            }
            push({ type: "slash", value, output: SLASH_LITERAL });
            continue;
          }
          if (value === ".") {
            if (state.braces > 0 && prev.type === "dot") {
              if (prev.value === ".") prev.output = DOT_LITERAL;
              const brace = braces[braces.length - 1];
              prev.type = "dots";
              prev.output += value;
              prev.value += value;
              brace.dots = true;
              continue;
            }
            if (
              state.braces + state.parens === 0 &&
              prev.type !== "bos" &&
              prev.type !== "slash"
            ) {
              push({ type: "text", value, output: DOT_LITERAL });
              continue;
            }
            push({ type: "dot", value, output: DOT_LITERAL });
            continue;
          }
          if (value === "?") {
            const isGroup = prev && prev.value === "(";
            if (
              !isGroup &&
              opts.noextglob !== true &&
              peek() === "(" &&
              peek(2) !== "?"
            ) {
              extglobOpen("qmark", value);
              continue;
            }
            if (prev && prev.type === "paren") {
              const next = peek();
              let output = value;
              if (
                (prev.value === "(" && !/[!=<:]/.test(next)) ||
                (next === "<" && !/<([!=]|\w+>)/.test(remaining()))
              ) {
                output = `\\${value}`;
              }
              push({ type: "text", value, output });
              continue;
            }
            if (
              opts.dot !== true &&
              (prev.type === "slash" || prev.type === "bos")
            ) {
              push({ type: "qmark", value, output: QMARK_NO_DOT });
              continue;
            }
            push({ type: "qmark", value, output: QMARK });
            continue;
          }
          if (value === "!") {
            if (opts.noextglob !== true && peek() === "(") {
              if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
                extglobOpen("negate", value);
                continue;
              }
            }
            if (opts.nonegate !== true && state.index === 0) {
              negate();
              continue;
            }
          }
          if (value === "+") {
            if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
              extglobOpen("plus", value);
              continue;
            }
            if ((prev && prev.value === "(") || opts.regex === false) {
              push({ type: "plus", value, output: PLUS_LITERAL });
              continue;
            }
            if (
              (prev &&
                (prev.type === "bracket" ||
                  prev.type === "paren" ||
                  prev.type === "brace")) ||
              state.parens > 0
            ) {
              push({ type: "plus", value });
              continue;
            }
            push({ type: "plus", value: PLUS_LITERAL });
            continue;
          }
          if (value === "@") {
            if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
              push({ type: "at", extglob: true, value, output: "" });
              continue;
            }
            push({ type: "text", value });
            continue;
          }
          if (value !== "*") {
            if (value === "$" || value === "^") {
              value = `\\${value}`;
            }
            const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
            if (match) {
              value += match[0];
              state.index += match[0].length;
            }
            push({ type: "text", value });
            continue;
          }
          if (prev && (prev.type === "globstar" || prev.star === true)) {
            prev.type = "star";
            prev.star = true;
            prev.value += value;
            prev.output = star;
            state.backtrack = true;
            state.globstar = true;
            consume(value);
            continue;
          }
          let rest = remaining();
          if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
            extglobOpen("star", value);
            continue;
          }
          if (prev.type === "star") {
            if (opts.noglobstar === true) {
              consume(value);
              continue;
            }
            const prior = prev.prev;
            const before = prior.prev;
            const isStart = prior.type === "slash" || prior.type === "bos";
            const afterStar =
              before && (before.type === "star" || before.type === "globstar");
            if (
              opts.bash === true &&
              (!isStart || (rest[0] && rest[0] !== "/"))
            ) {
              push({ type: "star", value, output: "" });
              continue;
            }
            const isBrace =
              state.braces > 0 &&
              (prior.type === "comma" || prior.type === "brace");
            const isExtglob =
              extglobs.length &&
              (prior.type === "pipe" || prior.type === "paren");
            if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
              push({ type: "star", value, output: "" });
              continue;
            }
            while (rest.slice(0, 3) === "/**") {
              const after = input[state.index + 4];
              if (after && after !== "/") {
                break;
              }
              rest = rest.slice(3);
              consume("/**", 3);
            }
            if (prior.type === "bos" && eos()) {
              prev.type = "globstar";
              prev.value += value;
              prev.output = globstar(opts);
              state.output = prev.output;
              state.globstar = true;
              consume(value);
              continue;
            }
            if (
              prior.type === "slash" &&
              prior.prev.type !== "bos" &&
              !afterStar &&
              eos()
            ) {
              state.output = state.output.slice(
                0,
                -(prior.output + prev.output).length,
              );
              prior.output = `(?:${prior.output}`;
              prev.type = "globstar";
              prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
              prev.value += value;
              state.globstar = true;
              state.output += prior.output + prev.output;
              consume(value);
              continue;
            }
            if (
              prior.type === "slash" &&
              prior.prev.type !== "bos" &&
              rest[0] === "/"
            ) {
              const end = rest[1] !== void 0 ? "|$" : "";
              state.output = state.output.slice(
                0,
                -(prior.output + prev.output).length,
              );
              prior.output = `(?:${prior.output}`;
              prev.type = "globstar";
              prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
              prev.value += value;
              state.output += prior.output + prev.output;
              state.globstar = true;
              consume(value + advance());
              push({ type: "slash", value: "/", output: "" });
              continue;
            }
            if (prior.type === "bos" && rest[0] === "/") {
              prev.type = "globstar";
              prev.value += value;
              prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
              state.output = prev.output;
              state.globstar = true;
              consume(value + advance());
              push({ type: "slash", value: "/", output: "" });
              continue;
            }
            state.output = state.output.slice(0, -prev.output.length);
            prev.type = "globstar";
            prev.output = globstar(opts);
            prev.value += value;
            state.output += prev.output;
            state.globstar = true;
            consume(value);
            continue;
          }
          const token = { type: "star", value, output: star };
          if (opts.bash === true) {
            token.output = ".*?";
            if (prev.type === "bos" || prev.type === "slash") {
              token.output = nodot + token.output;
            }
            push(token);
            continue;
          }
          if (
            prev &&
            (prev.type === "bracket" || prev.type === "paren") &&
            opts.regex === true
          ) {
            token.output = value;
            push(token);
            continue;
          }
          if (
            state.index === state.start ||
            prev.type === "slash" ||
            prev.type === "dot"
          ) {
            if (prev.type === "dot") {
              state.output += NO_DOT_SLASH;
              prev.output += NO_DOT_SLASH;
            } else if (opts.dot === true) {
              state.output += NO_DOTS_SLASH;
              prev.output += NO_DOTS_SLASH;
            } else {
              state.output += nodot;
              prev.output += nodot;
            }
            if (peek() !== "*") {
              state.output += ONE_CHAR;
              prev.output += ONE_CHAR;
            }
          }
          push(token);
        }
        while (state.brackets > 0) {
          if (opts.strictBrackets === true)
            throw new SyntaxError(syntaxError("closing", "]"));
          state.output = utils.escapeLast(state.output, "[");
          decrement("brackets");
        }
        while (state.parens > 0) {
          if (opts.strictBrackets === true)
            throw new SyntaxError(syntaxError("closing", ")"));
          state.output = utils.escapeLast(state.output, "(");
          decrement("parens");
        }
        while (state.braces > 0) {
          if (opts.strictBrackets === true)
            throw new SyntaxError(syntaxError("closing", "}"));
          state.output = utils.escapeLast(state.output, "{");
          decrement("braces");
        }
        if (
          opts.strictSlashes !== true &&
          (prev.type === "star" || prev.type === "bracket")
        ) {
          push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
        }
        if (state.backtrack === true) {
          state.output = "";
          for (const token of state.tokens) {
            state.output += token.output != null ? token.output : token.value;
            if (token.suffix) {
              state.output += token.suffix;
            }
          }
        }
        return state;
      };
      parse.fastpaths = (input, options) => {
        const opts = { ...options };
        const max =
          typeof opts.maxLength === "number"
            ? Math.min(MAX_LENGTH, opts.maxLength)
            : MAX_LENGTH;
        const len = input.length;
        if (len > max) {
          throw new SyntaxError(
            `Input length: ${len}, exceeds maximum allowed length: ${max}`,
          );
        }
        input = REPLACEMENTS[input] || input;
        const {
          DOT_LITERAL,
          SLASH_LITERAL,
          ONE_CHAR,
          DOTS_SLASH,
          NO_DOT,
          NO_DOTS,
          NO_DOTS_SLASH,
          STAR,
          START_ANCHOR,
        } = constants.globChars(opts.windows);
        const nodot = opts.dot ? NO_DOTS : NO_DOT;
        const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
        const capture = opts.capture ? "" : "?:";
        const state = { negated: false, prefix: "" };
        let star = opts.bash === true ? ".*?" : STAR;
        if (opts.capture) {
          star = `(${star})`;
        }
        const globstar = (opts) => {
          if (opts.noglobstar === true) return star;
          return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
        };
        const create = (str) => {
          switch (str) {
            case "*":
              return `${nodot}${ONE_CHAR}${star}`;
            case ".*":
              return `${DOT_LITERAL}${ONE_CHAR}${star}`;
            case "*.*":
              return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
            case "*/*":
              return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
            case "**":
              return nodot + globstar(opts);
            case "**/*":
              return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
            case "**/*.*":
              return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
            case "**/.*":
              return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
            default: {
              const match = /^(.*?)\.(\w+)$/.exec(str);
              if (!match) return;
              const source = create(match[1]);
              if (!source) return;
              return source + DOT_LITERAL + match[2];
            }
          }
        };
        const output = utils.removePrefix(input, state);
        let source = create(output);
        if (source && opts.strictSlashes !== true) {
          source += `${SLASH_LITERAL}?`;
        }
        return source;
      };
      module.exports = parse;
    },
    582: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const scan = __nccwpck_require__(279);
      const parse = __nccwpck_require__(339);
      const utils = __nccwpck_require__(473);
      const constants = __nccwpck_require__(717);
      const isObject = (val) =>
        val && typeof val === "object" && !Array.isArray(val);
      const picomatch = (glob, options, returnState = false) => {
        if (Array.isArray(glob)) {
          const fns = glob.map((input) =>
            picomatch(input, options, returnState),
          );
          const arrayMatcher = (str) => {
            for (const isMatch of fns) {
              const state = isMatch(str);
              if (state) return state;
            }
            return false;
          };
          return arrayMatcher;
        }
        const isState = isObject(glob) && glob.tokens && glob.input;
        if (glob === "" || (typeof glob !== "string" && !isState)) {
          throw new TypeError("Expected pattern to be a non-empty string");
        }
        const opts = options || {};
        const posix = opts.windows;
        const regex = isState
          ? picomatch.compileRe(glob, options)
          : picomatch.makeRe(glob, options, false, true);
        const state = regex.state;
        delete regex.state;
        let isIgnored = () => false;
        if (opts.ignore) {
          const ignoreOpts = {
            ...options,
            ignore: null,
            onMatch: null,
            onResult: null,
          };
          isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
        }
        const matcher = (input, returnObject = false) => {
          const { isMatch, match, output } = picomatch.test(
            input,
            regex,
            options,
            { glob, posix },
          );
          const result = {
            glob,
            state,
            regex,
            posix,
            input,
            output,
            match,
            isMatch,
          };
          if (typeof opts.onResult === "function") {
            opts.onResult(result);
          }
          if (isMatch === false) {
            result.isMatch = false;
            return returnObject ? result : false;
          }
          if (isIgnored(input)) {
            if (typeof opts.onIgnore === "function") {
              opts.onIgnore(result);
            }
            result.isMatch = false;
            return returnObject ? result : false;
          }
          if (typeof opts.onMatch === "function") {
            opts.onMatch(result);
          }
          return returnObject ? result : true;
        };
        if (returnState) {
          matcher.state = state;
        }
        return matcher;
      };
      picomatch.test = (input, regex, options, { glob, posix } = {}) => {
        if (typeof input !== "string") {
          throw new TypeError("Expected input to be a string");
        }
        if (input === "") {
          return { isMatch: false, output: "" };
        }
        const opts = options || {};
        const format = opts.format || (posix ? utils.toPosixSlashes : null);
        let match = input === glob;
        let output = match && format ? format(input) : input;
        if (match === false) {
          output = format ? format(input) : input;
          match = output === glob;
        }
        if (match === false || opts.capture === true) {
          if (opts.matchBase === true || opts.basename === true) {
            match = picomatch.matchBase(input, regex, options, posix);
          } else {
            match = regex.exec(output);
          }
        }
        return { isMatch: Boolean(match), match, output };
      };
      picomatch.matchBase = (input, glob, options) => {
        const regex =
          glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
        return regex.test(utils.basename(input));
      };
      picomatch.isMatch = (str, patterns, options) =>
        picomatch(patterns, options)(str);
      picomatch.parse = (pattern, options) => {
        if (Array.isArray(pattern))
          return pattern.map((p) => picomatch.parse(p, options));
        return parse(pattern, { ...options, fastpaths: false });
      };
      picomatch.scan = (input, options) => scan(input, options);
      picomatch.compileRe = (
        state,
        options,
        returnOutput = false,
        returnState = false,
      ) => {
        if (returnOutput === true) {
          return state.output;
        }
        const opts = options || {};
        const prepend = opts.contains ? "" : "^";
        const append = opts.contains ? "" : "$";
        let source = `${prepend}(?:${state.output})${append}`;
        if (state && state.negated === true) {
          source = `^(?!${source}).*$`;
        }
        const regex = picomatch.toRegex(source, options);
        if (returnState === true) {
          regex.state = state;
        }
        return regex;
      };
      picomatch.makeRe = (
        input,
        options = {},
        returnOutput = false,
        returnState = false,
      ) => {
        if (!input || typeof input !== "string") {
          throw new TypeError("Expected a non-empty string");
        }
        let parsed = { negated: false, fastpaths: true };
        if (
          options.fastpaths !== false &&
          (input[0] === "." || input[0] === "*")
        ) {
          parsed.output = parse.fastpaths(input, options);
        }
        if (!parsed.output) {
          parsed = parse(input, options);
        }
        return picomatch.compileRe(parsed, options, returnOutput, returnState);
      };
      picomatch.toRegex = (source, options) => {
        try {
          const opts = options || {};
          return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
        } catch (err) {
          if (options && options.debug === true) throw err;
          return /$^/;
        }
      };
      picomatch.constants = constants;
      module.exports = picomatch;
    },
    279: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const utils = __nccwpck_require__(473);
      const {
        CHAR_ASTERISK,
        CHAR_AT,
        CHAR_BACKWARD_SLASH,
        CHAR_COMMA,
        CHAR_DOT,
        CHAR_EXCLAMATION_MARK,
        CHAR_FORWARD_SLASH,
        CHAR_LEFT_CURLY_BRACE,
        CHAR_LEFT_PARENTHESES,
        CHAR_LEFT_SQUARE_BRACKET,
        CHAR_PLUS,
        CHAR_QUESTION_MARK,
        CHAR_RIGHT_CURLY_BRACE,
        CHAR_RIGHT_PARENTHESES,
        CHAR_RIGHT_SQUARE_BRACKET,
      } = __nccwpck_require__(717);
      const isPathSeparator = (code) =>
        code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
      const depth = (token) => {
        if (token.isPrefix !== true) {
          token.depth = token.isGlobstar ? Infinity : 1;
        }
      };
      const scan = (input, options) => {
        const opts = options || {};
        const length = input.length - 1;
        const scanToEnd = opts.parts === true || opts.scanToEnd === true;
        const slashes = [];
        const tokens = [];
        const parts = [];
        let str = input;
        let index = -1;
        let start = 0;
        let lastIndex = 0;
        let isBrace = false;
        let isBracket = false;
        let isGlob = false;
        let isExtglob = false;
        let isGlobstar = false;
        let braceEscaped = false;
        let backslashes = false;
        let negated = false;
        let negatedExtglob = false;
        let finished = false;
        let braces = 0;
        let prev;
        let code;
        let token = { value: "", depth: 0, isGlob: false };
        const eos = () => index >= length;
        const peek = () => str.charCodeAt(index + 1);
        const advance = () => {
          prev = code;
          return str.charCodeAt(++index);
        };
        while (index < length) {
          code = advance();
          let next;
          if (code === CHAR_BACKWARD_SLASH) {
            backslashes = token.backslashes = true;
            code = advance();
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braceEscaped = true;
            }
            continue;
          }
          if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
            braces++;
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = true;
                advance();
                continue;
              }
              if (code === CHAR_LEFT_CURLY_BRACE) {
                braces++;
                continue;
              }
              if (
                braceEscaped !== true &&
                code === CHAR_DOT &&
                (code = advance()) === CHAR_DOT
              ) {
                isBrace = token.isBrace = true;
                isGlob = token.isGlob = true;
                finished = true;
                if (scanToEnd === true) {
                  continue;
                }
                break;
              }
              if (braceEscaped !== true && code === CHAR_COMMA) {
                isBrace = token.isBrace = true;
                isGlob = token.isGlob = true;
                finished = true;
                if (scanToEnd === true) {
                  continue;
                }
                break;
              }
              if (code === CHAR_RIGHT_CURLY_BRACE) {
                braces--;
                if (braces === 0) {
                  braceEscaped = false;
                  isBrace = token.isBrace = true;
                  finished = true;
                  break;
                }
              }
            }
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (code === CHAR_FORWARD_SLASH) {
            slashes.push(index);
            tokens.push(token);
            token = { value: "", depth: 0, isGlob: false };
            if (finished === true) continue;
            if (prev === CHAR_DOT && index === start + 1) {
              start += 2;
              continue;
            }
            lastIndex = index + 1;
            continue;
          }
          if (opts.noext !== true) {
            const isExtglobChar =
              code === CHAR_PLUS ||
              code === CHAR_AT ||
              code === CHAR_ASTERISK ||
              code === CHAR_QUESTION_MARK ||
              code === CHAR_EXCLAMATION_MARK;
            if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
              isGlob = token.isGlob = true;
              isExtglob = token.isExtglob = true;
              finished = true;
              if (code === CHAR_EXCLAMATION_MARK && index === start) {
                negatedExtglob = true;
              }
              if (scanToEnd === true) {
                while (eos() !== true && (code = advance())) {
                  if (code === CHAR_BACKWARD_SLASH) {
                    backslashes = token.backslashes = true;
                    code = advance();
                    continue;
                  }
                  if (code === CHAR_RIGHT_PARENTHESES) {
                    isGlob = token.isGlob = true;
                    finished = true;
                    break;
                  }
                }
                continue;
              }
              break;
            }
          }
          if (code === CHAR_ASTERISK) {
            if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (code === CHAR_QUESTION_MARK) {
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (code === CHAR_LEFT_SQUARE_BRACKET) {
            while (eos() !== true && (next = advance())) {
              if (next === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = true;
                advance();
                continue;
              }
              if (next === CHAR_RIGHT_SQUARE_BRACKET) {
                isBracket = token.isBracket = true;
                isGlob = token.isGlob = true;
                finished = true;
                break;
              }
            }
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (
            opts.nonegate !== true &&
            code === CHAR_EXCLAMATION_MARK &&
            index === start
          ) {
            negated = token.negated = true;
            start++;
            continue;
          }
          if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
            isGlob = token.isGlob = true;
            if (scanToEnd === true) {
              while (eos() !== true && (code = advance())) {
                if (code === CHAR_LEFT_PARENTHESES) {
                  backslashes = token.backslashes = true;
                  code = advance();
                  continue;
                }
                if (code === CHAR_RIGHT_PARENTHESES) {
                  finished = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
          if (isGlob === true) {
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
        }
        if (opts.noext === true) {
          isExtglob = false;
          isGlob = false;
        }
        let base = str;
        let prefix = "";
        let glob = "";
        if (start > 0) {
          prefix = str.slice(0, start);
          str = str.slice(start);
          lastIndex -= start;
        }
        if (base && isGlob === true && lastIndex > 0) {
          base = str.slice(0, lastIndex);
          glob = str.slice(lastIndex);
        } else if (isGlob === true) {
          base = "";
          glob = str;
        } else {
          base = str;
        }
        if (base && base !== "" && base !== "/" && base !== str) {
          if (isPathSeparator(base.charCodeAt(base.length - 1))) {
            base = base.slice(0, -1);
          }
        }
        if (opts.unescape === true) {
          if (glob) glob = utils.removeBackslashes(glob);
          if (base && backslashes === true) {
            base = utils.removeBackslashes(base);
          }
        }
        const state = {
          prefix,
          input,
          start,
          base,
          glob,
          isBrace,
          isBracket,
          isGlob,
          isExtglob,
          isGlobstar,
          negated,
          negatedExtglob,
        };
        if (opts.tokens === true) {
          state.maxDepth = 0;
          if (!isPathSeparator(code)) {
            tokens.push(token);
          }
          state.tokens = tokens;
        }
        if (opts.parts === true || opts.tokens === true) {
          let prevIndex;
          for (let idx = 0; idx < slashes.length; idx++) {
            const n = prevIndex ? prevIndex + 1 : start;
            const i = slashes[idx];
            const value = input.slice(n, i);
            if (opts.tokens) {
              if (idx === 0 && start !== 0) {
                tokens[idx].isPrefix = true;
                tokens[idx].value = prefix;
              } else {
                tokens[idx].value = value;
              }
              depth(tokens[idx]);
              state.maxDepth += tokens[idx].depth;
            }
            if (idx !== 0 || value !== "") {
              parts.push(value);
            }
            prevIndex = i;
          }
          if (prevIndex && prevIndex + 1 < input.length) {
            const value = input.slice(prevIndex + 1);
            parts.push(value);
            if (opts.tokens) {
              tokens[tokens.length - 1].value = value;
              depth(tokens[tokens.length - 1]);
              state.maxDepth += tokens[tokens.length - 1].depth;
            }
          }
          state.slashes = slashes;
          state.parts = parts;
        }
        return state;
      };
      module.exports = scan;
    },
    473: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      const {
        REGEX_BACKSLASH,
        REGEX_REMOVE_BACKSLASH,
        REGEX_SPECIAL_CHARS,
        REGEX_SPECIAL_CHARS_GLOBAL,
      } = __nccwpck_require__(717);
      exports.isObject = (val) =>
        val !== null && typeof val === "object" && !Array.isArray(val);
      exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
      exports.isRegexChar = (str) =>
        str.length === 1 && exports.hasRegexChars(str);
      exports.escapeRegex = (str) =>
        str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
      exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
      exports.isWindows = () => {
        if (typeof navigator !== "undefined" && navigator.platform) {
          const platform = navigator.platform.toLowerCase();
          return platform === "win32" || platform === "windows";
        }
        if (typeof process !== "undefined" && process.platform) {
          return process.platform === "win32";
        }
        return false;
      };
      exports.removeBackslashes = (str) =>
        str.replace(REGEX_REMOVE_BACKSLASH, (match) =>
          match === "\\" ? "" : match,
        );
      exports.escapeLast = (input, char, lastIdx) => {
        const idx = input.lastIndexOf(char, lastIdx);
        if (idx === -1) return input;
        if (input[idx - 1] === "\\")
          return exports.escapeLast(input, char, idx - 1);
        return `${input.slice(0, idx)}\\${input.slice(idx)}`;
      };
      exports.removePrefix = (input, state = {}) => {
        let output = input;
        if (output.startsWith("./")) {
          output = output.slice(2);
          state.prefix = "./";
        }
        return output;
      };
      exports.wrapOutput = (input, state = {}, options = {}) => {
        const prepend = options.contains ? "" : "^";
        const append = options.contains ? "" : "$";
        let output = `${prepend}(?:${input})${append}`;
        if (state.negated === true) {
          output = `(?:^(?!${output}).*$)`;
        }
        return output;
      };
      exports.basename = (path, { windows } = {}) => {
        const segs = path.split(windows ? /[\\/]/ : "/");
        const last = segs[segs.length - 1];
        if (last === "") {
          return segs[segs.length - 2];
        }
        return last;
      };
    },
    896: (module) => {
      "use strict";
      module.exports = require("fs");
    },
    928: (module) => {
      "use strict";
      module.exports = require("path");
    },
    278: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var __create = Object.create;
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __getProtoOf = Object.getPrototypeOf;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __copyProps = (to, from, except, desc) => {
        if ((from && typeof from === "object") || typeof from === "function")
          for (
            var keys = __getOwnPropNames(from), i = 0, n = keys.length, key;
            i < n;
            i++
          ) {
            key = keys[i];
            if (!__hasOwnProp.call(to, key) && key !== except)
              __defProp(to, key, {
                get: ((k) => from[k]).bind(null, key),
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
      const path = __toESM(__nccwpck_require__(928));
      const fs = __toESM(__nccwpck_require__(896));
      function cleanPath(path$1) {
        let normalized = (0, path.normalize)(path$1);
        if (
          normalized.length > 1 &&
          normalized[normalized.length - 1] === path.sep
        )
          normalized = normalized.substring(0, normalized.length - 1);
        return normalized;
      }
      const SLASHES_REGEX = /[\\/]/g;
      function convertSlashes(path$1, separator) {
        return path$1.replace(SLASHES_REGEX, separator);
      }
      const WINDOWS_ROOT_DIR_REGEX = /^[a-z]:[\\/]$/i;
      function isRootDirectory(path$1) {
        return path$1 === "/" || WINDOWS_ROOT_DIR_REGEX.test(path$1);
      }
      function normalizePath(path$1, options) {
        const {
          resolvePaths,
          normalizePath: normalizePath$1,
          pathSeparator,
        } = options;
        const pathNeedsCleaning =
          (process.platform === "win32" && path$1.includes("/")) ||
          path$1.startsWith(".");
        if (resolvePaths) path$1 = (0, path.resolve)(path$1);
        if (normalizePath$1 || pathNeedsCleaning) path$1 = cleanPath(path$1);
        if (path$1 === ".") return "";
        const needsSeperator = path$1[path$1.length - 1] !== pathSeparator;
        return convertSlashes(
          needsSeperator ? path$1 + pathSeparator : path$1,
          pathSeparator,
        );
      }
      function joinPathWithBasePath(filename, directoryPath) {
        return directoryPath + filename;
      }
      function joinPathWithRelativePath(root, options) {
        return function (filename, directoryPath) {
          const sameRoot = directoryPath.startsWith(root);
          if (sameRoot) return directoryPath.slice(root.length) + filename;
          else
            return (
              convertSlashes(
                (0, path.relative)(root, directoryPath),
                options.pathSeparator,
              ) +
              options.pathSeparator +
              filename
            );
        };
      }
      function joinPath(filename) {
        return filename;
      }
      function joinDirectoryPath(filename, directoryPath, separator) {
        return directoryPath + filename + separator;
      }
      function build$7(root, options) {
        const { relativePaths, includeBasePath } = options;
        return relativePaths && root
          ? joinPathWithRelativePath(root, options)
          : includeBasePath
            ? joinPathWithBasePath
            : joinPath;
      }
      function pushDirectoryWithRelativePath(root) {
        return function (directoryPath, paths) {
          paths.push(directoryPath.substring(root.length) || ".");
        };
      }
      function pushDirectoryFilterWithRelativePath(root) {
        return function (directoryPath, paths, filters) {
          const relativePath = directoryPath.substring(root.length) || ".";
          if (filters.every((filter) => filter(relativePath, true)))
            paths.push(relativePath);
        };
      }
      const pushDirectory = (directoryPath, paths) => {
        paths.push(directoryPath || ".");
      };
      const pushDirectoryFilter = (directoryPath, paths, filters) => {
        const path$1 = directoryPath || ".";
        if (filters.every((filter) => filter(path$1, true))) paths.push(path$1);
      };
      const empty$2 = () => {};
      function build$6(root, options) {
        const { includeDirs, filters, relativePaths } = options;
        if (!includeDirs) return empty$2;
        if (relativePaths)
          return filters && filters.length
            ? pushDirectoryFilterWithRelativePath(root)
            : pushDirectoryWithRelativePath(root);
        return filters && filters.length ? pushDirectoryFilter : pushDirectory;
      }
      const pushFileFilterAndCount = (filename, _paths, counts, filters) => {
        if (filters.every((filter) => filter(filename, false))) counts.files++;
      };
      const pushFileFilter = (filename, paths, _counts, filters) => {
        if (filters.every((filter) => filter(filename, false)))
          paths.push(filename);
      };
      const pushFileCount = (_filename, _paths, counts, _filters) => {
        counts.files++;
      };
      const pushFile = (filename, paths) => {
        paths.push(filename);
      };
      const empty$1 = () => {};
      function build$5(options) {
        const { excludeFiles, filters, onlyCounts } = options;
        if (excludeFiles) return empty$1;
        if (filters && filters.length)
          return onlyCounts ? pushFileFilterAndCount : pushFileFilter;
        else if (onlyCounts) return pushFileCount;
        else return pushFile;
      }
      const getArray = (paths) => paths;
      const getArrayGroup = () => [""].slice(0, 0);
      function build$4(options) {
        return options.group ? getArrayGroup : getArray;
      }
      const groupFiles = (groups, directory, files) => {
        groups.push({ directory, files, dir: directory });
      };
      const empty = () => {};
      function build$3(options) {
        return options.group ? groupFiles : empty;
      }
      const resolveSymlinksAsync = function (path$1, state, callback$1) {
        const {
          queue,
          fs: fs$1,
          options: { suppressErrors },
        } = state;
        queue.enqueue();
        fs$1.realpath(path$1, (error, resolvedPath) => {
          if (error) return queue.dequeue(suppressErrors ? null : error, state);
          fs$1.stat(resolvedPath, (error$1, stat) => {
            if (error$1)
              return queue.dequeue(suppressErrors ? null : error$1, state);
            if (stat.isDirectory() && isRecursive(path$1, resolvedPath, state))
              return queue.dequeue(null, state);
            callback$1(stat, resolvedPath);
            queue.dequeue(null, state);
          });
        });
      };
      const resolveSymlinks = function (path$1, state, callback$1) {
        const {
          queue,
          fs: fs$1,
          options: { suppressErrors },
        } = state;
        queue.enqueue();
        try {
          const resolvedPath = fs$1.realpathSync(path$1);
          const stat = fs$1.statSync(resolvedPath);
          if (stat.isDirectory() && isRecursive(path$1, resolvedPath, state))
            return;
          callback$1(stat, resolvedPath);
        } catch (e) {
          if (!suppressErrors) throw e;
        }
      };
      function build$2(options, isSynchronous) {
        if (!options.resolveSymlinks || options.excludeSymlinks) return null;
        return isSynchronous ? resolveSymlinks : resolveSymlinksAsync;
      }
      function isRecursive(path$1, resolved, state) {
        if (state.options.useRealPaths)
          return isRecursiveUsingRealPaths(resolved, state);
        let parent = (0, path.dirname)(path$1);
        let depth = 1;
        while (parent !== state.root && depth < 2) {
          const resolvedPath = state.symlinks.get(parent);
          const isSameRoot =
            !!resolvedPath &&
            (resolvedPath === resolved ||
              resolvedPath.startsWith(resolved) ||
              resolved.startsWith(resolvedPath));
          if (isSameRoot) depth++;
          else parent = (0, path.dirname)(parent);
        }
        state.symlinks.set(path$1, resolved);
        return depth > 1;
      }
      function isRecursiveUsingRealPaths(resolved, state) {
        return state.visited.includes(resolved + state.options.pathSeparator);
      }
      const onlyCountsSync = (state) => state.counts;
      const groupsSync = (state) => state.groups;
      const defaultSync = (state) => state.paths;
      const limitFilesSync = (state) =>
        state.paths.slice(0, state.options.maxFiles);
      const onlyCountsAsync = (state, error, callback$1) => {
        report(error, callback$1, state.counts, state.options.suppressErrors);
        return null;
      };
      const defaultAsync = (state, error, callback$1) => {
        report(error, callback$1, state.paths, state.options.suppressErrors);
        return null;
      };
      const limitFilesAsync = (state, error, callback$1) => {
        report(
          error,
          callback$1,
          state.paths.slice(0, state.options.maxFiles),
          state.options.suppressErrors,
        );
        return null;
      };
      const groupsAsync = (state, error, callback$1) => {
        report(error, callback$1, state.groups, state.options.suppressErrors);
        return null;
      };
      function report(error, callback$1, output, suppressErrors) {
        if (error && !suppressErrors) callback$1(error, output);
        else callback$1(null, output);
      }
      function build$1(options, isSynchronous) {
        const { onlyCounts, group, maxFiles } = options;
        if (onlyCounts) return isSynchronous ? onlyCountsSync : onlyCountsAsync;
        else if (group) return isSynchronous ? groupsSync : groupsAsync;
        else if (maxFiles)
          return isSynchronous ? limitFilesSync : limitFilesAsync;
        else return isSynchronous ? defaultSync : defaultAsync;
      }
      const readdirOpts = { withFileTypes: true };
      const walkAsync = (
        state,
        crawlPath,
        directoryPath,
        currentDepth,
        callback$1,
      ) => {
        state.queue.enqueue();
        if (currentDepth < 0) return state.queue.dequeue(null, state);
        const { fs: fs$1 } = state;
        state.visited.push(crawlPath);
        state.counts.directories++;
        fs$1.readdir(crawlPath || ".", readdirOpts, (error, entries = []) => {
          callback$1(entries, directoryPath, currentDepth);
          state.queue.dequeue(
            state.options.suppressErrors ? null : error,
            state,
          );
        });
      };
      const walkSync = (
        state,
        crawlPath,
        directoryPath,
        currentDepth,
        callback$1,
      ) => {
        const { fs: fs$1 } = state;
        if (currentDepth < 0) return;
        state.visited.push(crawlPath);
        state.counts.directories++;
        let entries = [];
        try {
          entries = fs$1.readdirSync(crawlPath || ".", readdirOpts);
        } catch (e) {
          if (!state.options.suppressErrors) throw e;
        }
        callback$1(entries, directoryPath, currentDepth);
      };
      function build(isSynchronous) {
        return isSynchronous ? walkSync : walkAsync;
      }
      var Queue = class {
        count = 0;
        constructor(onQueueEmpty) {
          this.onQueueEmpty = onQueueEmpty;
        }
        enqueue() {
          this.count++;
          return this.count;
        }
        dequeue(error, output) {
          if (this.onQueueEmpty && (--this.count <= 0 || error)) {
            this.onQueueEmpty(error, output);
            if (error) {
              output.controller.abort();
              this.onQueueEmpty = void 0;
            }
          }
        }
      };
      var Counter = class {
        _files = 0;
        _directories = 0;
        set files(num) {
          this._files = num;
        }
        get files() {
          return this._files;
        }
        set directories(num) {
          this._directories = num;
        }
        get directories() {
          return this._directories;
        }
        get dirs() {
          return this._directories;
        }
      };
      var Aborter = class {
        aborted = false;
        abort() {
          this.aborted = true;
        }
      };
      var Walker = class {
        root;
        isSynchronous;
        state;
        joinPath;
        pushDirectory;
        pushFile;
        getArray;
        groupFiles;
        resolveSymlink;
        walkDirectory;
        callbackInvoker;
        constructor(root, options, callback$1) {
          this.isSynchronous = !callback$1;
          this.callbackInvoker = build$1(options, this.isSynchronous);
          this.root = normalizePath(root, options);
          this.state = {
            root: isRootDirectory(this.root)
              ? this.root
              : this.root.slice(0, -1),
            paths: [""].slice(0, 0),
            groups: [],
            counts: new Counter(),
            options,
            queue: new Queue((error, state) =>
              this.callbackInvoker(state, error, callback$1),
            ),
            symlinks: new Map(),
            visited: [""].slice(0, 0),
            controller: new Aborter(),
            fs: options.fs || fs,
          };
          this.joinPath = build$7(this.root, options);
          this.pushDirectory = build$6(this.root, options);
          this.pushFile = build$5(options);
          this.getArray = build$4(options);
          this.groupFiles = build$3(options);
          this.resolveSymlink = build$2(options, this.isSynchronous);
          this.walkDirectory = build(this.isSynchronous);
        }
        start() {
          this.pushDirectory(
            this.root,
            this.state.paths,
            this.state.options.filters,
          );
          this.walkDirectory(
            this.state,
            this.root,
            this.root,
            this.state.options.maxDepth,
            this.walk,
          );
          return this.isSynchronous
            ? this.callbackInvoker(this.state, null)
            : null;
        }
        walk = (entries, directoryPath, depth) => {
          const {
            paths,
            options: {
              filters,
              resolveSymlinks: resolveSymlinks$1,
              excludeSymlinks,
              exclude,
              maxFiles,
              signal,
              useRealPaths,
              pathSeparator,
            },
            controller,
          } = this.state;
          if (
            controller.aborted ||
            (signal && signal.aborted) ||
            (maxFiles && paths.length > maxFiles)
          )
            return;
          const files = this.getArray(this.state.paths);
          for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            if (
              entry.isFile() ||
              (entry.isSymbolicLink() && !resolveSymlinks$1 && !excludeSymlinks)
            ) {
              const filename = this.joinPath(entry.name, directoryPath);
              this.pushFile(filename, files, this.state.counts, filters);
            } else if (entry.isDirectory()) {
              let path$1 = joinDirectoryPath(
                entry.name,
                directoryPath,
                this.state.options.pathSeparator,
              );
              if (exclude && exclude(entry.name, path$1)) continue;
              this.pushDirectory(path$1, paths, filters);
              this.walkDirectory(
                this.state,
                path$1,
                path$1,
                depth - 1,
                this.walk,
              );
            } else if (this.resolveSymlink && entry.isSymbolicLink()) {
              let path$1 = joinPathWithBasePath(entry.name, directoryPath);
              this.resolveSymlink(path$1, this.state, (stat, resolvedPath) => {
                if (stat.isDirectory()) {
                  resolvedPath = normalizePath(
                    resolvedPath,
                    this.state.options,
                  );
                  if (
                    exclude &&
                    exclude(
                      entry.name,
                      useRealPaths ? resolvedPath : path$1 + pathSeparator,
                    )
                  )
                    return;
                  this.walkDirectory(
                    this.state,
                    resolvedPath,
                    useRealPaths ? resolvedPath : path$1 + pathSeparator,
                    depth - 1,
                    this.walk,
                  );
                } else {
                  resolvedPath = useRealPaths ? resolvedPath : path$1;
                  const filename = (0, path.basename)(resolvedPath);
                  const directoryPath$1 = normalizePath(
                    (0, path.dirname)(resolvedPath),
                    this.state.options,
                  );
                  resolvedPath = this.joinPath(filename, directoryPath$1);
                  this.pushFile(
                    resolvedPath,
                    files,
                    this.state.counts,
                    filters,
                  );
                }
              });
            }
          }
          this.groupFiles(this.state.groups, directoryPath, files);
        };
      };
      function promise(root, options) {
        return new Promise((resolve$1, reject) => {
          callback(root, options, (err, output) => {
            if (err) return reject(err);
            resolve$1(output);
          });
        });
      }
      function callback(root, options, callback$1) {
        let walker = new Walker(root, options, callback$1);
        walker.start();
      }
      function sync(root, options) {
        const walker = new Walker(root, options);
        return walker.start();
      }
      var APIBuilder = class {
        constructor(root, options) {
          this.root = root;
          this.options = options;
        }
        withPromise() {
          return promise(this.root, this.options);
        }
        withCallback(cb) {
          callback(this.root, this.options, cb);
        }
        sync() {
          return sync(this.root, this.options);
        }
      };
      let pm = null;
      try {
        676;
        pm = __nccwpck_require__(676);
      } catch {}
      var Builder = class {
        globCache = {};
        options = {
          maxDepth: Infinity,
          suppressErrors: true,
          pathSeparator: path.sep,
          filters: [],
        };
        globFunction;
        constructor(options) {
          this.options = { ...this.options, ...options };
          this.globFunction = this.options.globFunction;
        }
        group() {
          this.options.group = true;
          return this;
        }
        withPathSeparator(separator) {
          this.options.pathSeparator = separator;
          return this;
        }
        withBasePath() {
          this.options.includeBasePath = true;
          return this;
        }
        withRelativePaths() {
          this.options.relativePaths = true;
          return this;
        }
        withDirs() {
          this.options.includeDirs = true;
          return this;
        }
        withMaxDepth(depth) {
          this.options.maxDepth = depth;
          return this;
        }
        withMaxFiles(limit) {
          this.options.maxFiles = limit;
          return this;
        }
        withFullPaths() {
          this.options.resolvePaths = true;
          this.options.includeBasePath = true;
          return this;
        }
        withErrors() {
          this.options.suppressErrors = false;
          return this;
        }
        withSymlinks({ resolvePaths = true } = {}) {
          this.options.resolveSymlinks = true;
          this.options.useRealPaths = resolvePaths;
          return this.withFullPaths();
        }
        withAbortSignal(signal) {
          this.options.signal = signal;
          return this;
        }
        normalize() {
          this.options.normalizePath = true;
          return this;
        }
        filter(predicate) {
          this.options.filters.push(predicate);
          return this;
        }
        onlyDirs() {
          this.options.excludeFiles = true;
          this.options.includeDirs = true;
          return this;
        }
        exclude(predicate) {
          this.options.exclude = predicate;
          return this;
        }
        onlyCounts() {
          this.options.onlyCounts = true;
          return this;
        }
        crawl(root) {
          return new APIBuilder(root || ".", this.options);
        }
        withGlobFunction(fn) {
          this.globFunction = fn;
          return this;
        }
        crawlWithOptions(root, options) {
          this.options = { ...this.options, ...options };
          return new APIBuilder(root || ".", this.options);
        }
        glob(...patterns) {
          if (this.globFunction) return this.globWithOptions(patterns);
          return this.globWithOptions(patterns, ...[{ dot: true }]);
        }
        globWithOptions(patterns, ...options) {
          const globFn = this.globFunction || pm;
          if (!globFn)
            throw new Error(
              "Please specify a glob function to use glob matching.",
            );
          var isMatch = this.globCache[patterns.join("\0")];
          if (!isMatch) {
            isMatch = globFn(patterns, ...options);
            this.globCache[patterns.join("\0")] = isMatch;
          }
          this.options.filters.push((path$1) => isMatch(path$1));
          return this;
        }
      };
      exports.fdir = Builder;
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
  var __webpack_exports__ = {};
  (() => {
    var exports = __webpack_exports__;
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if ((from && typeof from === "object") || typeof from === "function")
        for (
          var keys = __getOwnPropNames(from), i = 0, n = keys.length, key;
          i < n;
          i++
        ) {
          key = keys[i];
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, {
              get: ((k) => from[k]).bind(null, key),
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
    const path = __toESM(__nccwpck_require__(928));
    const fdir = __toESM(__nccwpck_require__(278));
    const picomatch = __toESM(__nccwpck_require__(676));
    const ONLY_PARENT_DIRECTORIES = /^(\/?\.\.)+$/;
    function getPartialMatcher(patterns, options) {
      const patternsCount = patterns.length;
      const patternsParts = Array(patternsCount);
      const regexes = Array(patternsCount);
      for (let i = 0; i < patternsCount; i++) {
        const parts = splitPattern(patterns[i]);
        patternsParts[i] = parts;
        const partsCount = parts.length;
        const partRegexes = Array(partsCount);
        for (let j = 0; j < partsCount; j++)
          partRegexes[j] = picomatch.default.makeRe(parts[j], options);
        regexes[i] = partRegexes;
      }
      return (input) => {
        const inputParts = input.split("/");
        if (inputParts[0] === ".." && ONLY_PARENT_DIRECTORIES.test(input))
          return true;
        for (let i = 0; i < patterns.length; i++) {
          const patternParts = patternsParts[i];
          const regex = regexes[i];
          const inputPatternCount = inputParts.length;
          const minParts = Math.min(inputPatternCount, patternParts.length);
          let j = 0;
          while (j < minParts) {
            const part = patternParts[j];
            if (part.includes("/")) return true;
            const match = regex[j].test(inputParts[j]);
            if (!match) break;
            if (part === "**") return true;
            j++;
          }
          if (j === inputPatternCount) return true;
        }
        return false;
      };
    }
    const splitPatternOptions = { parts: true };
    function splitPattern(path$2) {
      var _result$parts;
      const result = picomatch.default.scan(path$2, splitPatternOptions);
      return (
        (_result$parts = result.parts) === null || _result$parts === void 0
          ? void 0
          : _result$parts.length
      )
        ? result.parts
        : [path$2];
    }
    const isWin = process.platform === "win32";
    const ESCAPED_WIN32_BACKSLASHES = /\\(?![()[\]{}!+@])/g;
    function convertPosixPathToPattern(path$2) {
      return escapePosixPath(path$2);
    }
    function convertWin32PathToPattern(path$2) {
      return escapeWin32Path(path$2).replace(ESCAPED_WIN32_BACKSLASHES, "/");
    }
    const convertPathToPattern = isWin
      ? convertWin32PathToPattern
      : convertPosixPathToPattern;
    const POSIX_UNESCAPED_GLOB_SYMBOLS =
      /(?<!\\)([()[\]{}*?|]|^!|[!+@](?=\()|\\(?![()[\]{}!*+?@|]))/g;
    const WIN32_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}]|^!|[!+@](?=\())/g;
    const escapePosixPath = (path$2) =>
      path$2.replace(POSIX_UNESCAPED_GLOB_SYMBOLS, "\\$&");
    const escapeWin32Path = (path$2) =>
      path$2.replace(WIN32_UNESCAPED_GLOB_SYMBOLS, "\\$&");
    const escapePath = isWin ? escapeWin32Path : escapePosixPath;
    function isDynamicPattern(pattern, options) {
      if (
        (options === null || options === void 0
          ? void 0
          : options.caseSensitiveMatch) === false
      )
        return true;
      const scan = picomatch.default.scan(pattern);
      return scan.isGlob || scan.negated;
    }
    function log(...tasks) {
      console.log(
        `[tinyglobby ${new Date().toLocaleTimeString("es")}]`,
        ...tasks,
      );
    }
    const PARENT_DIRECTORY = /^(\/?\.\.)+/;
    const ESCAPING_BACKSLASHES = /\\(?=[()[\]{}!*+?@|])/g;
    const BACKSLASHES = /\\/g;
    function normalizePattern(
      pattern,
      expandDirectories,
      cwd,
      props,
      isIgnore,
    ) {
      let result = pattern;
      if (pattern.endsWith("/")) result = pattern.slice(0, -1);
      if (!result.endsWith("*") && expandDirectories) result += "/**";
      const escapedCwd = escapePath(cwd);
      if (path.default.isAbsolute(result.replace(ESCAPING_BACKSLASHES, "")))
        result = path.posix.relative(escapedCwd, result);
      else result = path.posix.normalize(result);
      const parentDirectoryMatch = PARENT_DIRECTORY.exec(result);
      const parts = splitPattern(result);
      if (
        parentDirectoryMatch === null || parentDirectoryMatch === void 0
          ? void 0
          : parentDirectoryMatch[0]
      ) {
        const n = (parentDirectoryMatch[0].length + 1) / 3;
        let i = 0;
        const cwdParts = escapedCwd.split("/");
        while (i < n && parts[i + n] === cwdParts[cwdParts.length + i - n]) {
          result =
            result.slice(0, (n - i - 1) * 3) +
              result.slice((n - i) * 3 + parts[i + n].length + 1) || ".";
          i++;
        }
        const potentialRoot = path.posix.join(
          cwd,
          parentDirectoryMatch[0].slice(i * 3),
        );
        if (
          !potentialRoot.startsWith(".") &&
          props.root.length > potentialRoot.length
        ) {
          props.root = potentialRoot;
          props.depthOffset = -n + i;
        }
      }
      if (!isIgnore && props.depthOffset >= 0) {
        var _props$commonPath;
        ((_props$commonPath = props.commonPath) !== null &&
          _props$commonPath !== void 0) ||
          (props.commonPath = parts);
        const newCommonPath = [];
        const length = Math.min(props.commonPath.length, parts.length);
        for (let i = 0; i < length; i++) {
          const part = parts[i];
          if (part === "**" && !parts[i + 1]) {
            newCommonPath.pop();
            break;
          }
          if (
            part !== props.commonPath[i] ||
            isDynamicPattern(part) ||
            i === parts.length - 1
          )
            break;
          newCommonPath.push(part);
        }
        props.depthOffset = newCommonPath.length;
        props.commonPath = newCommonPath;
        props.root =
          newCommonPath.length > 0
            ? path.default.posix.join(cwd, ...newCommonPath)
            : cwd;
      }
      return result;
    }
    function processPatterns(
      { patterns, ignore = [], expandDirectories = true },
      cwd,
      props,
    ) {
      if (typeof patterns === "string") patterns = [patterns];
      else if (!patterns) patterns = ["**/*"];
      if (typeof ignore === "string") ignore = [ignore];
      const matchPatterns = [];
      const ignorePatterns = [];
      for (const pattern of ignore) {
        if (!pattern) continue;
        if (pattern[0] !== "!" || pattern[1] === "(")
          ignorePatterns.push(
            normalizePattern(pattern, expandDirectories, cwd, props, true),
          );
      }
      for (const pattern of patterns) {
        if (!pattern) continue;
        if (pattern[0] !== "!" || pattern[1] === "(")
          matchPatterns.push(
            normalizePattern(pattern, expandDirectories, cwd, props, false),
          );
        else if (pattern[1] !== "!" || pattern[2] === "(")
          ignorePatterns.push(
            normalizePattern(
              pattern.slice(1),
              expandDirectories,
              cwd,
              props,
              true,
            ),
          );
      }
      return { match: matchPatterns, ignore: ignorePatterns };
    }
    function getRelativePath(path$2, cwd, root) {
      return path.posix.relative(cwd, `${root}/${path$2}`) || ".";
    }
    function processPath(path$2, cwd, root, isDirectory, absolute) {
      const relativePath = absolute
        ? path$2.slice(root === "/" ? 1 : root.length + 1) || "."
        : path$2;
      if (root === cwd)
        return isDirectory && relativePath !== "."
          ? relativePath.slice(0, -1)
          : relativePath;
      return getRelativePath(relativePath, cwd, root);
    }
    function formatPaths(paths, cwd, root) {
      for (let i = paths.length - 1; i >= 0; i--) {
        const path$2 = paths[i];
        paths[i] =
          getRelativePath(path$2, cwd, root) +
          (!path$2 || path$2.endsWith("/") ? "/" : "");
      }
      return paths;
    }
    function crawl(options, cwd, sync) {
      if (process.env.TINYGLOBBY_DEBUG) options.debug = true;
      if (options.debug) log("globbing with options:", options, "cwd:", cwd);
      if (Array.isArray(options.patterns) && options.patterns.length === 0)
        return sync ? [] : Promise.resolve([]);
      const props = { root: cwd, commonPath: null, depthOffset: 0 };
      const processed = processPatterns(options, cwd, props);
      const nocase = options.caseSensitiveMatch === false;
      if (options.debug) log("internal processing patterns:", processed);
      const matcher = (0, picomatch.default)(processed.match, {
        dot: options.dot,
        nocase,
        ignore: processed.ignore,
      });
      const ignore = (0, picomatch.default)(processed.ignore, {
        dot: options.dot,
        nocase,
      });
      const partialMatcher = getPartialMatcher(processed.match, {
        dot: options.dot,
        nocase,
      });
      const fdirOptions = {
        filters: [
          options.debug
            ? (p, isDirectory) => {
                const path$2 = processPath(
                  p,
                  cwd,
                  props.root,
                  isDirectory,
                  options.absolute,
                );
                const matches = matcher(path$2);
                if (matches) log(`matched ${path$2}`);
                return matches;
              }
            : (p, isDirectory) =>
                matcher(
                  processPath(
                    p,
                    cwd,
                    props.root,
                    isDirectory,
                    options.absolute,
                  ),
                ),
        ],
        exclude: options.debug
          ? (_, p) => {
              const relativePath = processPath(p, cwd, props.root, true, true);
              const skipped =
                (relativePath !== "." && !partialMatcher(relativePath)) ||
                ignore(relativePath);
              if (skipped) log(`skipped ${p}`);
              else log(`crawling ${p}`);
              return skipped;
            }
          : (_, p) => {
              const relativePath = processPath(p, cwd, props.root, true, true);
              return (
                (relativePath !== "." && !partialMatcher(relativePath)) ||
                ignore(relativePath)
              );
            },
        pathSeparator: "/",
        relativePaths: true,
        resolveSymlinks: true,
      };
      if (options.deep !== void 0)
        fdirOptions.maxDepth = Math.round(options.deep - props.depthOffset);
      if (options.absolute) {
        fdirOptions.relativePaths = false;
        fdirOptions.resolvePaths = true;
        fdirOptions.includeBasePath = true;
      }
      if (options.followSymbolicLinks === false) {
        fdirOptions.resolveSymlinks = false;
        fdirOptions.excludeSymlinks = true;
      }
      if (options.onlyDirectories) {
        fdirOptions.excludeFiles = true;
        fdirOptions.includeDirs = true;
      } else if (options.onlyFiles === false) fdirOptions.includeDirs = true;
      props.root = props.root.replace(BACKSLASHES, "");
      const root = props.root;
      if (options.debug) log("internal properties:", props);
      const api = new fdir.fdir(fdirOptions).crawl(root);
      if (cwd === root || options.absolute)
        return sync ? api.sync() : api.withPromise();
      return sync
        ? formatPaths(api.sync(), cwd, root)
        : api.withPromise().then((paths) => formatPaths(paths, cwd, root));
    }
    async function glob(patternsOrOptions, options) {
      if (
        patternsOrOptions &&
        (options === null || options === void 0 ? void 0 : options.patterns)
      )
        throw new Error(
          "Cannot pass patterns as both an argument and an option",
        );
      const opts =
        Array.isArray(patternsOrOptions) ||
        typeof patternsOrOptions === "string"
          ? { ...options, patterns: patternsOrOptions }
          : patternsOrOptions;
      const cwd = opts.cwd
        ? path.default.resolve(opts.cwd).replace(BACKSLASHES, "/")
        : process.cwd().replace(BACKSLASHES, "/");
      return crawl(opts, cwd, false);
    }
    function globSync(patternsOrOptions, options) {
      if (
        patternsOrOptions &&
        (options === null || options === void 0 ? void 0 : options.patterns)
      )
        throw new Error(
          "Cannot pass patterns as both an argument and an option",
        );
      const opts =
        Array.isArray(patternsOrOptions) ||
        typeof patternsOrOptions === "string"
          ? { ...options, patterns: patternsOrOptions }
          : patternsOrOptions;
      const cwd = opts.cwd
        ? path.default.resolve(opts.cwd).replace(BACKSLASHES, "/")
        : process.cwd().replace(BACKSLASHES, "/");
      return crawl(opts, cwd, true);
    }
    exports.convertPathToPattern = convertPathToPattern;
    exports.escapePath = escapePath;
    exports.glob = glob;
    exports.globSync = globSync;
    exports.isDynamicPattern = isDynamicPattern;
  })();
  module.exports = __webpack_exports__;
})();
