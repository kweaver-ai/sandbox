(() => {
  var __webpack_modules__ = {
    8671: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const stringify = __nccwpck_require__(3062);
      const compile = __nccwpck_require__(4898);
      const expand = __nccwpck_require__(5331);
      const parse = __nccwpck_require__(168);
      const braces = (input, options = {}) => {
        let output = [];
        if (Array.isArray(input)) {
          for (const pattern of input) {
            const result = braces.create(pattern, options);
            if (Array.isArray(result)) {
              output.push(...result);
            } else {
              output.push(result);
            }
          }
        } else {
          output = [].concat(braces.create(input, options));
        }
        if (options && options.expand === true && options.nodupes === true) {
          output = [...new Set(output)];
        }
        return output;
      };
      braces.parse = (input, options = {}) => parse(input, options);
      braces.stringify = (input, options = {}) => {
        if (typeof input === "string") {
          return stringify(braces.parse(input, options), options);
        }
        return stringify(input, options);
      };
      braces.compile = (input, options = {}) => {
        if (typeof input === "string") {
          input = braces.parse(input, options);
        }
        return compile(input, options);
      };
      braces.expand = (input, options = {}) => {
        if (typeof input === "string") {
          input = braces.parse(input, options);
        }
        let result = expand(input, options);
        if (options.noempty === true) {
          result = result.filter(Boolean);
        }
        if (options.nodupes === true) {
          result = [...new Set(result)];
        }
        return result;
      };
      braces.create = (input, options = {}) => {
        if (input === "" || input.length < 3) {
          return [input];
        }
        return options.expand !== true
          ? braces.compile(input, options)
          : braces.expand(input, options);
      };
      module.exports = braces;
    },
    4898: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const fill = __nccwpck_require__(9730);
      const utils = __nccwpck_require__(2474);
      const compile = (ast, options = {}) => {
        const walk = (node, parent = {}) => {
          const invalidBlock = utils.isInvalidBrace(parent);
          const invalidNode =
            node.invalid === true && options.escapeInvalid === true;
          const invalid = invalidBlock === true || invalidNode === true;
          const prefix = options.escapeInvalid === true ? "\\" : "";
          let output = "";
          if (node.isOpen === true) {
            return prefix + node.value;
          }
          if (node.isClose === true) {
            console.log("node.isClose", prefix, node.value);
            return prefix + node.value;
          }
          if (node.type === "open") {
            return invalid ? prefix + node.value : "(";
          }
          if (node.type === "close") {
            return invalid ? prefix + node.value : ")";
          }
          if (node.type === "comma") {
            return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
          }
          if (node.value) {
            return node.value;
          }
          if (node.nodes && node.ranges > 0) {
            const args = utils.reduce(node.nodes);
            const range = fill(...args, {
              ...options,
              wrap: false,
              toRegex: true,
              strictZeros: true,
            });
            if (range.length !== 0) {
              return args.length > 1 && range.length > 1 ? `(${range})` : range;
            }
          }
          if (node.nodes) {
            for (const child of node.nodes) {
              output += walk(child, node);
            }
          }
          return output;
        };
        return walk(ast);
      };
      module.exports = compile;
    },
    1778: (module) => {
      "use strict";
      module.exports = {
        MAX_LENGTH: 1e4,
        CHAR_0: "0",
        CHAR_9: "9",
        CHAR_UPPERCASE_A: "A",
        CHAR_LOWERCASE_A: "a",
        CHAR_UPPERCASE_Z: "Z",
        CHAR_LOWERCASE_Z: "z",
        CHAR_LEFT_PARENTHESES: "(",
        CHAR_RIGHT_PARENTHESES: ")",
        CHAR_ASTERISK: "*",
        CHAR_AMPERSAND: "&",
        CHAR_AT: "@",
        CHAR_BACKSLASH: "\\",
        CHAR_BACKTICK: "`",
        CHAR_CARRIAGE_RETURN: "\r",
        CHAR_CIRCUMFLEX_ACCENT: "^",
        CHAR_COLON: ":",
        CHAR_COMMA: ",",
        CHAR_DOLLAR: "$",
        CHAR_DOT: ".",
        CHAR_DOUBLE_QUOTE: '"',
        CHAR_EQUAL: "=",
        CHAR_EXCLAMATION_MARK: "!",
        CHAR_FORM_FEED: "\f",
        CHAR_FORWARD_SLASH: "/",
        CHAR_HASH: "#",
        CHAR_HYPHEN_MINUS: "-",
        CHAR_LEFT_ANGLE_BRACKET: "<",
        CHAR_LEFT_CURLY_BRACE: "{",
        CHAR_LEFT_SQUARE_BRACKET: "[",
        CHAR_LINE_FEED: "\n",
        CHAR_NO_BREAK_SPACE: " ",
        CHAR_PERCENT: "%",
        CHAR_PLUS: "+",
        CHAR_QUESTION_MARK: "?",
        CHAR_RIGHT_ANGLE_BRACKET: ">",
        CHAR_RIGHT_CURLY_BRACE: "}",
        CHAR_RIGHT_SQUARE_BRACKET: "]",
        CHAR_SEMICOLON: ";",
        CHAR_SINGLE_QUOTE: "'",
        CHAR_SPACE: " ",
        CHAR_TAB: "\t",
        CHAR_UNDERSCORE: "_",
        CHAR_VERTICAL_LINE: "|",
        CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\ufeff",
      };
    },
    5331: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const fill = __nccwpck_require__(9730);
      const stringify = __nccwpck_require__(3062);
      const utils = __nccwpck_require__(2474);
      const append = (queue = "", stash = "", enclose = false) => {
        const result = [];
        queue = [].concat(queue);
        stash = [].concat(stash);
        if (!stash.length) return queue;
        if (!queue.length) {
          return enclose
            ? utils.flatten(stash).map((ele) => `{${ele}}`)
            : stash;
        }
        for (const item of queue) {
          if (Array.isArray(item)) {
            for (const value of item) {
              result.push(append(value, stash, enclose));
            }
          } else {
            for (let ele of stash) {
              if (enclose === true && typeof ele === "string") ele = `{${ele}}`;
              result.push(
                Array.isArray(ele) ? append(item, ele, enclose) : item + ele,
              );
            }
          }
        }
        return utils.flatten(result);
      };
      const expand = (ast, options = {}) => {
        const rangeLimit =
          options.rangeLimit === undefined ? 1e3 : options.rangeLimit;
        const walk = (node, parent = {}) => {
          node.queue = [];
          let p = parent;
          let q = parent.queue;
          while (p.type !== "brace" && p.type !== "root" && p.parent) {
            p = p.parent;
            q = p.queue;
          }
          if (node.invalid || node.dollar) {
            q.push(append(q.pop(), stringify(node, options)));
            return;
          }
          if (
            node.type === "brace" &&
            node.invalid !== true &&
            node.nodes.length === 2
          ) {
            q.push(append(q.pop(), ["{}"]));
            return;
          }
          if (node.nodes && node.ranges > 0) {
            const args = utils.reduce(node.nodes);
            if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
              throw new RangeError(
                "expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.",
              );
            }
            let range = fill(...args, options);
            if (range.length === 0) {
              range = stringify(node, options);
            }
            q.push(append(q.pop(), range));
            node.nodes = [];
            return;
          }
          const enclose = utils.encloseBrace(node);
          let queue = node.queue;
          let block = node;
          while (
            block.type !== "brace" &&
            block.type !== "root" &&
            block.parent
          ) {
            block = block.parent;
            queue = block.queue;
          }
          for (let i = 0; i < node.nodes.length; i++) {
            const child = node.nodes[i];
            if (child.type === "comma" && node.type === "brace") {
              if (i === 1) queue.push("");
              queue.push("");
              continue;
            }
            if (child.type === "close") {
              q.push(append(q.pop(), queue, enclose));
              continue;
            }
            if (child.value && child.type !== "open") {
              queue.push(append(queue.pop(), child.value));
              continue;
            }
            if (child.nodes) {
              walk(child, node);
            }
          }
          return queue;
        };
        return utils.flatten(walk(ast));
      };
      module.exports = expand;
    },
    168: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const stringify = __nccwpck_require__(3062);
      const {
        MAX_LENGTH,
        CHAR_BACKSLASH,
        CHAR_BACKTICK,
        CHAR_COMMA,
        CHAR_DOT,
        CHAR_LEFT_PARENTHESES,
        CHAR_RIGHT_PARENTHESES,
        CHAR_LEFT_CURLY_BRACE,
        CHAR_RIGHT_CURLY_BRACE,
        CHAR_LEFT_SQUARE_BRACKET,
        CHAR_RIGHT_SQUARE_BRACKET,
        CHAR_DOUBLE_QUOTE,
        CHAR_SINGLE_QUOTE,
        CHAR_NO_BREAK_SPACE,
        CHAR_ZERO_WIDTH_NOBREAK_SPACE,
      } = __nccwpck_require__(1778);
      const parse = (input, options = {}) => {
        if (typeof input !== "string") {
          throw new TypeError("Expected a string");
        }
        const opts = options || {};
        const max =
          typeof opts.maxLength === "number"
            ? Math.min(MAX_LENGTH, opts.maxLength)
            : MAX_LENGTH;
        if (input.length > max) {
          throw new SyntaxError(
            `Input length (${input.length}), exceeds max characters (${max})`,
          );
        }
        const ast = { type: "root", input, nodes: [] };
        const stack = [ast];
        let block = ast;
        let prev = ast;
        let brackets = 0;
        const length = input.length;
        let index = 0;
        let depth = 0;
        let value;
        const advance = () => input[index++];
        const push = (node) => {
          if (node.type === "text" && prev.type === "dot") {
            prev.type = "text";
          }
          if (prev && prev.type === "text" && node.type === "text") {
            prev.value += node.value;
            return;
          }
          block.nodes.push(node);
          node.parent = block;
          node.prev = prev;
          prev = node;
          return node;
        };
        push({ type: "bos" });
        while (index < length) {
          block = stack[stack.length - 1];
          value = advance();
          if (
            value === CHAR_ZERO_WIDTH_NOBREAK_SPACE ||
            value === CHAR_NO_BREAK_SPACE
          ) {
            continue;
          }
          if (value === CHAR_BACKSLASH) {
            push({
              type: "text",
              value: (options.keepEscaping ? value : "") + advance(),
            });
            continue;
          }
          if (value === CHAR_RIGHT_SQUARE_BRACKET) {
            push({ type: "text", value: "\\" + value });
            continue;
          }
          if (value === CHAR_LEFT_SQUARE_BRACKET) {
            brackets++;
            let next;
            while (index < length && (next = advance())) {
              value += next;
              if (next === CHAR_LEFT_SQUARE_BRACKET) {
                brackets++;
                continue;
              }
              if (next === CHAR_BACKSLASH) {
                value += advance();
                continue;
              }
              if (next === CHAR_RIGHT_SQUARE_BRACKET) {
                brackets--;
                if (brackets === 0) {
                  break;
                }
              }
            }
            push({ type: "text", value });
            continue;
          }
          if (value === CHAR_LEFT_PARENTHESES) {
            block = push({ type: "paren", nodes: [] });
            stack.push(block);
            push({ type: "text", value });
            continue;
          }
          if (value === CHAR_RIGHT_PARENTHESES) {
            if (block.type !== "paren") {
              push({ type: "text", value });
              continue;
            }
            block = stack.pop();
            push({ type: "text", value });
            block = stack[stack.length - 1];
            continue;
          }
          if (
            value === CHAR_DOUBLE_QUOTE ||
            value === CHAR_SINGLE_QUOTE ||
            value === CHAR_BACKTICK
          ) {
            const open = value;
            let next;
            if (options.keepQuotes !== true) {
              value = "";
            }
            while (index < length && (next = advance())) {
              if (next === CHAR_BACKSLASH) {
                value += next + advance();
                continue;
              }
              if (next === open) {
                if (options.keepQuotes === true) value += next;
                break;
              }
              value += next;
            }
            push({ type: "text", value });
            continue;
          }
          if (value === CHAR_LEFT_CURLY_BRACE) {
            depth++;
            const dollar =
              (prev.value && prev.value.slice(-1) === "$") ||
              block.dollar === true;
            const brace = {
              type: "brace",
              open: true,
              close: false,
              dollar,
              depth,
              commas: 0,
              ranges: 0,
              nodes: [],
            };
            block = push(brace);
            stack.push(block);
            push({ type: "open", value });
            continue;
          }
          if (value === CHAR_RIGHT_CURLY_BRACE) {
            if (block.type !== "brace") {
              push({ type: "text", value });
              continue;
            }
            const type = "close";
            block = stack.pop();
            block.close = true;
            push({ type, value });
            depth--;
            block = stack[stack.length - 1];
            continue;
          }
          if (value === CHAR_COMMA && depth > 0) {
            if (block.ranges > 0) {
              block.ranges = 0;
              const open = block.nodes.shift();
              block.nodes = [open, { type: "text", value: stringify(block) }];
            }
            push({ type: "comma", value });
            block.commas++;
            continue;
          }
          if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
            const siblings = block.nodes;
            if (depth === 0 || siblings.length === 0) {
              push({ type: "text", value });
              continue;
            }
            if (prev.type === "dot") {
              block.range = [];
              prev.value += value;
              prev.type = "range";
              if (block.nodes.length !== 3 && block.nodes.length !== 5) {
                block.invalid = true;
                block.ranges = 0;
                prev.type = "text";
                continue;
              }
              block.ranges++;
              block.args = [];
              continue;
            }
            if (prev.type === "range") {
              siblings.pop();
              const before = siblings[siblings.length - 1];
              before.value += prev.value + value;
              prev = before;
              block.ranges--;
              continue;
            }
            push({ type: "dot", value });
            continue;
          }
          push({ type: "text", value });
        }
        do {
          block = stack.pop();
          if (block.type !== "root") {
            block.nodes.forEach((node) => {
              if (!node.nodes) {
                if (node.type === "open") node.isOpen = true;
                if (node.type === "close") node.isClose = true;
                if (!node.nodes) node.type = "text";
                node.invalid = true;
              }
            });
            const parent = stack[stack.length - 1];
            const index = parent.nodes.indexOf(block);
            parent.nodes.splice(index, 1, ...block.nodes);
          }
        } while (stack.length > 0);
        push({ type: "eos" });
        return ast;
      };
      module.exports = parse;
    },
    3062: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const utils = __nccwpck_require__(2474);
      module.exports = (ast, options = {}) => {
        const stringify = (node, parent = {}) => {
          const invalidBlock =
            options.escapeInvalid && utils.isInvalidBrace(parent);
          const invalidNode =
            node.invalid === true && options.escapeInvalid === true;
          let output = "";
          if (node.value) {
            if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
              return "\\" + node.value;
            }
            return node.value;
          }
          if (node.value) {
            return node.value;
          }
          if (node.nodes) {
            for (const child of node.nodes) {
              output += stringify(child);
            }
          }
          return output;
        };
        return stringify(ast);
      };
    },
    2474: (__unused_webpack_module, exports) => {
      "use strict";
      exports.isInteger = (num) => {
        if (typeof num === "number") {
          return Number.isInteger(num);
        }
        if (typeof num === "string" && num.trim() !== "") {
          return Number.isInteger(Number(num));
        }
        return false;
      };
      exports.find = (node, type) =>
        node.nodes.find((node) => node.type === type);
      exports.exceedsLimit = (min, max, step = 1, limit) => {
        if (limit === false) return false;
        if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
        return (Number(max) - Number(min)) / Number(step) >= limit;
      };
      exports.escapeNode = (block, n = 0, type) => {
        const node = block.nodes[n];
        if (!node) return;
        if (
          (type && node.type === type) ||
          node.type === "open" ||
          node.type === "close"
        ) {
          if (node.escaped !== true) {
            node.value = "\\" + node.value;
            node.escaped = true;
          }
        }
      };
      exports.encloseBrace = (node) => {
        if (node.type !== "brace") return false;
        if ((node.commas >> (0 + node.ranges)) >> 0 === 0) {
          node.invalid = true;
          return true;
        }
        return false;
      };
      exports.isInvalidBrace = (block) => {
        if (block.type !== "brace") return false;
        if (block.invalid === true || block.dollar) return true;
        if ((block.commas >> (0 + block.ranges)) >> 0 === 0) {
          block.invalid = true;
          return true;
        }
        if (block.open !== true || block.close !== true) {
          block.invalid = true;
          return true;
        }
        return false;
      };
      exports.isOpenOrClose = (node) => {
        if (node.type === "open" || node.type === "close") {
          return true;
        }
        return node.open === true || node.close === true;
      };
      exports.reduce = (nodes) =>
        nodes.reduce((acc, node) => {
          if (node.type === "text") acc.push(node.value);
          if (node.type === "range") node.type = "text";
          return acc;
        }, []);
      exports.flatten = (...args) => {
        const result = [];
        const flat = (arr) => {
          for (let i = 0; i < arr.length; i++) {
            const ele = arr[i];
            if (Array.isArray(ele)) {
              flat(ele);
              continue;
            }
            if (ele !== undefined) {
              result.push(ele);
            }
          }
          return result;
        };
        flat(args);
        return result;
      };
    },
    6234: (module) => {
      "use strict";
      var has = Object.prototype.hasOwnProperty,
        prefix = "~";
      function Events() {}
      if (Object.create) {
        Events.prototype = Object.create(null);
        if (!new Events().__proto__) prefix = false;
      }
      function EE(fn, context, once) {
        this.fn = fn;
        this.context = context;
        this.once = once || false;
      }
      function addListener(emitter, event, fn, context, once) {
        if (typeof fn !== "function") {
          throw new TypeError("The listener must be a function");
        }
        var listener = new EE(fn, context || emitter, once),
          evt = prefix ? prefix + event : event;
        if (!emitter._events[evt])
          ((emitter._events[evt] = listener), emitter._eventsCount++);
        else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
        else emitter._events[evt] = [emitter._events[evt], listener];
        return emitter;
      }
      function clearEvent(emitter, evt) {
        if (--emitter._eventsCount === 0) emitter._events = new Events();
        else delete emitter._events[evt];
      }
      function EventEmitter() {
        this._events = new Events();
        this._eventsCount = 0;
      }
      EventEmitter.prototype.eventNames = function eventNames() {
        var names = [],
          events,
          name;
        if (this._eventsCount === 0) return names;
        for (name in (events = this._events)) {
          if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
        }
        if (Object.getOwnPropertySymbols) {
          return names.concat(Object.getOwnPropertySymbols(events));
        }
        return names;
      };
      EventEmitter.prototype.listeners = function listeners(event) {
        var evt = prefix ? prefix + event : event,
          handlers = this._events[evt];
        if (!handlers) return [];
        if (handlers.fn) return [handlers.fn];
        for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
          ee[i] = handlers[i].fn;
        }
        return ee;
      };
      EventEmitter.prototype.listenerCount = function listenerCount(event) {
        var evt = prefix ? prefix + event : event,
          listeners = this._events[evt];
        if (!listeners) return 0;
        if (listeners.fn) return 1;
        return listeners.length;
      };
      EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
        var evt = prefix ? prefix + event : event;
        if (!this._events[evt]) return false;
        var listeners = this._events[evt],
          len = arguments.length,
          args,
          i;
        if (listeners.fn) {
          if (listeners.once)
            this.removeListener(event, listeners.fn, undefined, true);
          switch (len) {
            case 1:
              return (listeners.fn.call(listeners.context), true);
            case 2:
              return (listeners.fn.call(listeners.context, a1), true);
            case 3:
              return (listeners.fn.call(listeners.context, a1, a2), true);
            case 4:
              return (listeners.fn.call(listeners.context, a1, a2, a3), true);
            case 5:
              return (
                listeners.fn.call(listeners.context, a1, a2, a3, a4),
                true
              );
            case 6:
              return (
                listeners.fn.call(listeners.context, a1, a2, a3, a4, a5),
                true
              );
          }
          for (i = 1, args = new Array(len - 1); i < len; i++) {
            args[i - 1] = arguments[i];
          }
          listeners.fn.apply(listeners.context, args);
        } else {
          var length = listeners.length,
            j;
          for (i = 0; i < length; i++) {
            if (listeners[i].once)
              this.removeListener(event, listeners[i].fn, undefined, true);
            switch (len) {
              case 1:
                listeners[i].fn.call(listeners[i].context);
                break;
              case 2:
                listeners[i].fn.call(listeners[i].context, a1);
                break;
              case 3:
                listeners[i].fn.call(listeners[i].context, a1, a2);
                break;
              case 4:
                listeners[i].fn.call(listeners[i].context, a1, a2, a3);
                break;
              default:
                if (!args)
                  for (j = 1, args = new Array(len - 1); j < len; j++) {
                    args[j - 1] = arguments[j];
                  }
                listeners[i].fn.apply(listeners[i].context, args);
            }
          }
        }
        return true;
      };
      EventEmitter.prototype.on = function on(event, fn, context) {
        return addListener(this, event, fn, context, false);
      };
      EventEmitter.prototype.once = function once(event, fn, context) {
        return addListener(this, event, fn, context, true);
      };
      EventEmitter.prototype.removeListener = function removeListener(
        event,
        fn,
        context,
        once,
      ) {
        var evt = prefix ? prefix + event : event;
        if (!this._events[evt]) return this;
        if (!fn) {
          clearEvent(this, evt);
          return this;
        }
        var listeners = this._events[evt];
        if (listeners.fn) {
          if (
            listeners.fn === fn &&
            (!once || listeners.once) &&
            (!context || listeners.context === context)
          ) {
            clearEvent(this, evt);
          }
        } else {
          for (
            var i = 0, events = [], length = listeners.length;
            i < length;
            i++
          ) {
            if (
              listeners[i].fn !== fn ||
              (once && !listeners[i].once) ||
              (context && listeners[i].context !== context)
            ) {
              events.push(listeners[i]);
            }
          }
          if (events.length)
            this._events[evt] = events.length === 1 ? events[0] : events;
          else clearEvent(this, evt);
        }
        return this;
      };
      EventEmitter.prototype.removeAllListeners = function removeAllListeners(
        event,
      ) {
        var evt;
        if (event) {
          evt = prefix ? prefix + event : event;
          if (this._events[evt]) clearEvent(this, evt);
        } else {
          this._events = new Events();
          this._eventsCount = 0;
        }
        return this;
      };
      EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
      EventEmitter.prototype.addListener = EventEmitter.prototype.on;
      EventEmitter.prefixed = prefix;
      EventEmitter.EventEmitter = EventEmitter;
      if (true) {
        module.exports = EventEmitter;
      }
    },
    9730: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      /*!
       * fill-range <https://github.com/jonschlinkert/fill-range>
       *
       * Copyright (c) 2014-present, Jon Schlinkert.
       * Licensed under the MIT License.
       */ const util = __nccwpck_require__(9023);
      const toRegexRange = __nccwpck_require__(743);
      const isObject = (val) =>
        val !== null && typeof val === "object" && !Array.isArray(val);
      const transform = (toNumber) => (value) =>
        toNumber === true ? Number(value) : String(value);
      const isValidValue = (value) =>
        typeof value === "number" ||
        (typeof value === "string" && value !== "");
      const isNumber = (num) => Number.isInteger(+num);
      const zeros = (input) => {
        let value = `${input}`;
        let index = -1;
        if (value[0] === "-") value = value.slice(1);
        if (value === "0") return false;
        while (value[++index] === "0");
        return index > 0;
      };
      const stringify = (start, end, options) => {
        if (typeof start === "string" || typeof end === "string") {
          return true;
        }
        return options.stringify === true;
      };
      const pad = (input, maxLength, toNumber) => {
        if (maxLength > 0) {
          let dash = input[0] === "-" ? "-" : "";
          if (dash) input = input.slice(1);
          input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
        }
        if (toNumber === false) {
          return String(input);
        }
        return input;
      };
      const toMaxLen = (input, maxLength) => {
        let negative = input[0] === "-" ? "-" : "";
        if (negative) {
          input = input.slice(1);
          maxLength--;
        }
        while (input.length < maxLength) input = "0" + input;
        return negative ? "-" + input : input;
      };
      const toSequence = (parts, options, maxLen) => {
        parts.negatives.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        parts.positives.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        let prefix = options.capture ? "" : "?:";
        let positives = "";
        let negatives = "";
        let result;
        if (parts.positives.length) {
          positives = parts.positives
            .map((v) => toMaxLen(String(v), maxLen))
            .join("|");
        }
        if (parts.negatives.length) {
          negatives = `-(${prefix}${parts.negatives.map((v) => toMaxLen(String(v), maxLen)).join("|")})`;
        }
        if (positives && negatives) {
          result = `${positives}|${negatives}`;
        } else {
          result = positives || negatives;
        }
        if (options.wrap) {
          return `(${prefix}${result})`;
        }
        return result;
      };
      const toRange = (a, b, isNumbers, options) => {
        if (isNumbers) {
          return toRegexRange(a, b, { wrap: false, ...options });
        }
        let start = String.fromCharCode(a);
        if (a === b) return start;
        let stop = String.fromCharCode(b);
        return `[${start}-${stop}]`;
      };
      const toRegex = (start, end, options) => {
        if (Array.isArray(start)) {
          let wrap = options.wrap === true;
          let prefix = options.capture ? "" : "?:";
          return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
        }
        return toRegexRange(start, end, options);
      };
      const rangeError = (...args) =>
        new RangeError("Invalid range arguments: " + util.inspect(...args));
      const invalidRange = (start, end, options) => {
        if (options.strictRanges === true) throw rangeError([start, end]);
        return [];
      };
      const invalidStep = (step, options) => {
        if (options.strictRanges === true) {
          throw new TypeError(`Expected step "${step}" to be a number`);
        }
        return [];
      };
      const fillNumbers = (start, end, step = 1, options = {}) => {
        let a = Number(start);
        let b = Number(end);
        if (!Number.isInteger(a) || !Number.isInteger(b)) {
          if (options.strictRanges === true) throw rangeError([start, end]);
          return [];
        }
        if (a === 0) a = 0;
        if (b === 0) b = 0;
        let descending = a > b;
        let startString = String(start);
        let endString = String(end);
        let stepString = String(step);
        step = Math.max(Math.abs(step), 1);
        let padded =
          zeros(startString) || zeros(endString) || zeros(stepString);
        let maxLen = padded
          ? Math.max(startString.length, endString.length, stepString.length)
          : 0;
        let toNumber =
          padded === false && stringify(start, end, options) === false;
        let format = options.transform || transform(toNumber);
        if (options.toRegex && step === 1) {
          return toRange(
            toMaxLen(start, maxLen),
            toMaxLen(end, maxLen),
            true,
            options,
          );
        }
        let parts = { negatives: [], positives: [] };
        let push = (num) =>
          parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
        let range = [];
        let index = 0;
        while (descending ? a >= b : a <= b) {
          if (options.toRegex === true && step > 1) {
            push(a);
          } else {
            range.push(pad(format(a, index), maxLen, toNumber));
          }
          a = descending ? a - step : a + step;
          index++;
        }
        if (options.toRegex === true) {
          return step > 1
            ? toSequence(parts, options, maxLen)
            : toRegex(range, null, { wrap: false, ...options });
        }
        return range;
      };
      const fillLetters = (start, end, step = 1, options = {}) => {
        if (
          (!isNumber(start) && start.length > 1) ||
          (!isNumber(end) && end.length > 1)
        ) {
          return invalidRange(start, end, options);
        }
        let format = options.transform || ((val) => String.fromCharCode(val));
        let a = `${start}`.charCodeAt(0);
        let b = `${end}`.charCodeAt(0);
        let descending = a > b;
        let min = Math.min(a, b);
        let max = Math.max(a, b);
        if (options.toRegex && step === 1) {
          return toRange(min, max, false, options);
        }
        let range = [];
        let index = 0;
        while (descending ? a >= b : a <= b) {
          range.push(format(a, index));
          a = descending ? a - step : a + step;
          index++;
        }
        if (options.toRegex === true) {
          return toRegex(range, null, { wrap: false, options });
        }
        return range;
      };
      const fill = (start, end, step, options = {}) => {
        if (end == null && isValidValue(start)) {
          return [start];
        }
        if (!isValidValue(start) || !isValidValue(end)) {
          return invalidRange(start, end, options);
        }
        if (typeof step === "function") {
          return fill(start, end, 1, { transform: step });
        }
        if (isObject(step)) {
          return fill(start, end, 0, step);
        }
        let opts = { ...options };
        if (opts.capture === true) opts.wrap = true;
        step = step || opts.step || 1;
        if (!isNumber(step)) {
          if (step != null && !isObject(step)) return invalidStep(step, opts);
          return fill(start, end, 1, step);
        }
        if (isNumber(start) && isNumber(end)) {
          return fillNumbers(start, end, step, opts);
        }
        return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
      };
      module.exports = fill;
    },
    9679: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var debug;
      module.exports = function () {
        if (!debug) {
          try {
            debug = __nccwpck_require__(2814)("follow-redirects");
          } catch (error) {}
          if (typeof debug !== "function") {
            debug = function () {};
          }
        }
        debug.apply(null, arguments);
      };
    },
    1584: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var url = __nccwpck_require__(7016);
      var URL = url.URL;
      var http = __nccwpck_require__(8611);
      var https = __nccwpck_require__(5692);
      var Writable = __nccwpck_require__(2203).Writable;
      var assert = __nccwpck_require__(2613);
      var debug = __nccwpck_require__(9679);
      (function detectUnsupportedEnvironment() {
        var looksLikeNode = typeof process !== "undefined";
        var looksLikeBrowser =
          typeof window !== "undefined" && typeof document !== "undefined";
        var looksLikeV8 = isFunction(Error.captureStackTrace);
        if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
          console.warn(
            "The follow-redirects package should be excluded from browser builds.",
          );
        }
      })();
      var useNativeURL = false;
      try {
        assert(new URL(""));
      } catch (error) {
        useNativeURL = error.code === "ERR_INVALID_URL";
      }
      var preservedUrlFields = [
        "auth",
        "host",
        "hostname",
        "href",
        "path",
        "pathname",
        "port",
        "protocol",
        "query",
        "search",
        "hash",
      ];
      var events = [
        "abort",
        "aborted",
        "connect",
        "error",
        "socket",
        "timeout",
      ];
      var eventHandlers = Object.create(null);
      events.forEach(function (event) {
        eventHandlers[event] = function (arg1, arg2, arg3) {
          this._redirectable.emit(event, arg1, arg2, arg3);
        };
      });
      var InvalidUrlError = createErrorType(
        "ERR_INVALID_URL",
        "Invalid URL",
        TypeError,
      );
      var RedirectionError = createErrorType(
        "ERR_FR_REDIRECTION_FAILURE",
        "Redirected request failed",
      );
      var TooManyRedirectsError = createErrorType(
        "ERR_FR_TOO_MANY_REDIRECTS",
        "Maximum number of redirects exceeded",
        RedirectionError,
      );
      var MaxBodyLengthExceededError = createErrorType(
        "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
        "Request body larger than maxBodyLength limit",
      );
      var WriteAfterEndError = createErrorType(
        "ERR_STREAM_WRITE_AFTER_END",
        "write after end",
      );
      var destroy = Writable.prototype.destroy || noop;
      function RedirectableRequest(options, responseCallback) {
        Writable.call(this);
        this._sanitizeOptions(options);
        this._options = options;
        this._ended = false;
        this._ending = false;
        this._redirectCount = 0;
        this._redirects = [];
        this._requestBodyLength = 0;
        this._requestBodyBuffers = [];
        if (responseCallback) {
          this.on("response", responseCallback);
        }
        var self = this;
        this._onNativeResponse = function (response) {
          try {
            self._processResponse(response);
          } catch (cause) {
            self.emit(
              "error",
              cause instanceof RedirectionError
                ? cause
                : new RedirectionError({ cause }),
            );
          }
        };
        this._performRequest();
      }
      RedirectableRequest.prototype = Object.create(Writable.prototype);
      RedirectableRequest.prototype.abort = function () {
        destroyRequest(this._currentRequest);
        this._currentRequest.abort();
        this.emit("abort");
      };
      RedirectableRequest.prototype.destroy = function (error) {
        destroyRequest(this._currentRequest, error);
        destroy.call(this, error);
        return this;
      };
      RedirectableRequest.prototype.write = function (
        data,
        encoding,
        callback,
      ) {
        if (this._ending) {
          throw new WriteAfterEndError();
        }
        if (!isString(data) && !isBuffer(data)) {
          throw new TypeError("data should be a string, Buffer or Uint8Array");
        }
        if (isFunction(encoding)) {
          callback = encoding;
          encoding = null;
        }
        if (data.length === 0) {
          if (callback) {
            callback();
          }
          return;
        }
        if (
          this._requestBodyLength + data.length <=
          this._options.maxBodyLength
        ) {
          this._requestBodyLength += data.length;
          this._requestBodyBuffers.push({ data, encoding });
          this._currentRequest.write(data, encoding, callback);
        } else {
          this.emit("error", new MaxBodyLengthExceededError());
          this.abort();
        }
      };
      RedirectableRequest.prototype.end = function (data, encoding, callback) {
        if (isFunction(data)) {
          callback = data;
          data = encoding = null;
        } else if (isFunction(encoding)) {
          callback = encoding;
          encoding = null;
        }
        if (!data) {
          this._ended = this._ending = true;
          this._currentRequest.end(null, null, callback);
        } else {
          var self = this;
          var currentRequest = this._currentRequest;
          this.write(data, encoding, function () {
            self._ended = true;
            currentRequest.end(null, null, callback);
          });
          this._ending = true;
        }
      };
      RedirectableRequest.prototype.setHeader = function (name, value) {
        this._options.headers[name] = value;
        this._currentRequest.setHeader(name, value);
      };
      RedirectableRequest.prototype.removeHeader = function (name) {
        delete this._options.headers[name];
        this._currentRequest.removeHeader(name);
      };
      RedirectableRequest.prototype.setTimeout = function (msecs, callback) {
        var self = this;
        function destroyOnTimeout(socket) {
          socket.setTimeout(msecs);
          socket.removeListener("timeout", socket.destroy);
          socket.addListener("timeout", socket.destroy);
        }
        function startTimer(socket) {
          if (self._timeout) {
            clearTimeout(self._timeout);
          }
          self._timeout = setTimeout(function () {
            self.emit("timeout");
            clearTimer();
          }, msecs);
          destroyOnTimeout(socket);
        }
        function clearTimer() {
          if (self._timeout) {
            clearTimeout(self._timeout);
            self._timeout = null;
          }
          self.removeListener("abort", clearTimer);
          self.removeListener("error", clearTimer);
          self.removeListener("response", clearTimer);
          self.removeListener("close", clearTimer);
          if (callback) {
            self.removeListener("timeout", callback);
          }
          if (!self.socket) {
            self._currentRequest.removeListener("socket", startTimer);
          }
        }
        if (callback) {
          this.on("timeout", callback);
        }
        if (this.socket) {
          startTimer(this.socket);
        } else {
          this._currentRequest.once("socket", startTimer);
        }
        this.on("socket", destroyOnTimeout);
        this.on("abort", clearTimer);
        this.on("error", clearTimer);
        this.on("response", clearTimer);
        this.on("close", clearTimer);
        return this;
      };
      ["flushHeaders", "getHeader", "setNoDelay", "setSocketKeepAlive"].forEach(
        function (method) {
          RedirectableRequest.prototype[method] = function (a, b) {
            return this._currentRequest[method](a, b);
          };
        },
      );
      ["aborted", "connection", "socket"].forEach(function (property) {
        Object.defineProperty(RedirectableRequest.prototype, property, {
          get: function () {
            return this._currentRequest[property];
          },
        });
      });
      RedirectableRequest.prototype._sanitizeOptions = function (options) {
        if (!options.headers) {
          options.headers = {};
        }
        if (options.host) {
          if (!options.hostname) {
            options.hostname = options.host;
          }
          delete options.host;
        }
        if (!options.pathname && options.path) {
          var searchPos = options.path.indexOf("?");
          if (searchPos < 0) {
            options.pathname = options.path;
          } else {
            options.pathname = options.path.substring(0, searchPos);
            options.search = options.path.substring(searchPos);
          }
        }
      };
      RedirectableRequest.prototype._performRequest = function () {
        var protocol = this._options.protocol;
        var nativeProtocol = this._options.nativeProtocols[protocol];
        if (!nativeProtocol) {
          throw new TypeError("Unsupported protocol " + protocol);
        }
        if (this._options.agents) {
          var scheme = protocol.slice(0, -1);
          this._options.agent = this._options.agents[scheme];
        }
        var request = (this._currentRequest = nativeProtocol.request(
          this._options,
          this._onNativeResponse,
        ));
        request._redirectable = this;
        for (var event of events) {
          request.on(event, eventHandlers[event]);
        }
        this._currentUrl = /^\//.test(this._options.path)
          ? url.format(this._options)
          : this._options.path;
        if (this._isRedirect) {
          var i = 0;
          var self = this;
          var buffers = this._requestBodyBuffers;
          (function writeNext(error) {
            if (request === self._currentRequest) {
              if (error) {
                self.emit("error", error);
              } else if (i < buffers.length) {
                var buffer = buffers[i++];
                if (!request.finished) {
                  request.write(buffer.data, buffer.encoding, writeNext);
                }
              } else if (self._ended) {
                request.end();
              }
            }
          })();
        }
      };
      RedirectableRequest.prototype._processResponse = function (response) {
        var statusCode = response.statusCode;
        if (this._options.trackRedirects) {
          this._redirects.push({
            url: this._currentUrl,
            headers: response.headers,
            statusCode,
          });
        }
        var location = response.headers.location;
        if (
          !location ||
          this._options.followRedirects === false ||
          statusCode < 300 ||
          statusCode >= 400
        ) {
          response.responseUrl = this._currentUrl;
          response.redirects = this._redirects;
          this.emit("response", response);
          this._requestBodyBuffers = [];
          return;
        }
        destroyRequest(this._currentRequest);
        response.destroy();
        if (++this._redirectCount > this._options.maxRedirects) {
          throw new TooManyRedirectsError();
        }
        var requestHeaders;
        var beforeRedirect = this._options.beforeRedirect;
        if (beforeRedirect) {
          requestHeaders = Object.assign(
            { Host: response.req.getHeader("host") },
            this._options.headers,
          );
        }
        var method = this._options.method;
        if (
          ((statusCode === 301 || statusCode === 302) &&
            this._options.method === "POST") ||
          (statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method))
        ) {
          this._options.method = "GET";
          this._requestBodyBuffers = [];
          removeMatchingHeaders(/^content-/i, this._options.headers);
        }
        var currentHostHeader = removeMatchingHeaders(
          /^host$/i,
          this._options.headers,
        );
        var currentUrlParts = parseUrl(this._currentUrl);
        var currentHost = currentHostHeader || currentUrlParts.host;
        var currentUrl = /^\w+:/.test(location)
          ? this._currentUrl
          : url.format(Object.assign(currentUrlParts, { host: currentHost }));
        var redirectUrl = resolveUrl(location, currentUrl);
        debug("redirecting to", redirectUrl.href);
        this._isRedirect = true;
        spreadUrlObject(redirectUrl, this._options);
        if (
          (redirectUrl.protocol !== currentUrlParts.protocol &&
            redirectUrl.protocol !== "https:") ||
          (redirectUrl.host !== currentHost &&
            !isSubdomain(redirectUrl.host, currentHost))
        ) {
          removeMatchingHeaders(
            /^(?:(?:proxy-)?authorization|cookie)$/i,
            this._options.headers,
          );
        }
        if (isFunction(beforeRedirect)) {
          var responseDetails = { headers: response.headers, statusCode };
          var requestDetails = {
            url: currentUrl,
            method,
            headers: requestHeaders,
          };
          beforeRedirect(this._options, responseDetails, requestDetails);
          this._sanitizeOptions(this._options);
        }
        this._performRequest();
      };
      function wrap(protocols) {
        var exports = { maxRedirects: 21, maxBodyLength: 10 * 1024 * 1024 };
        var nativeProtocols = {};
        Object.keys(protocols).forEach(function (scheme) {
          var protocol = scheme + ":";
          var nativeProtocol = (nativeProtocols[protocol] = protocols[scheme]);
          var wrappedProtocol = (exports[scheme] =
            Object.create(nativeProtocol));
          function request(input, options, callback) {
            if (isURL(input)) {
              input = spreadUrlObject(input);
            } else if (isString(input)) {
              input = spreadUrlObject(parseUrl(input));
            } else {
              callback = options;
              options = validateUrl(input);
              input = { protocol };
            }
            if (isFunction(options)) {
              callback = options;
              options = null;
            }
            options = Object.assign(
              {
                maxRedirects: exports.maxRedirects,
                maxBodyLength: exports.maxBodyLength,
              },
              input,
              options,
            );
            options.nativeProtocols = nativeProtocols;
            if (!isString(options.host) && !isString(options.hostname)) {
              options.hostname = "::1";
            }
            assert.equal(options.protocol, protocol, "protocol mismatch");
            debug("options", options);
            return new RedirectableRequest(options, callback);
          }
          function get(input, options, callback) {
            var wrappedRequest = wrappedProtocol.request(
              input,
              options,
              callback,
            );
            wrappedRequest.end();
            return wrappedRequest;
          }
          Object.defineProperties(wrappedProtocol, {
            request: {
              value: request,
              configurable: true,
              enumerable: true,
              writable: true,
            },
            get: {
              value: get,
              configurable: true,
              enumerable: true,
              writable: true,
            },
          });
        });
        return exports;
      }
      function noop() {}
      function parseUrl(input) {
        var parsed;
        if (useNativeURL) {
          parsed = new URL(input);
        } else {
          parsed = validateUrl(url.parse(input));
          if (!isString(parsed.protocol)) {
            throw new InvalidUrlError({ input });
          }
        }
        return parsed;
      }
      function resolveUrl(relative, base) {
        return useNativeURL
          ? new URL(relative, base)
          : parseUrl(url.resolve(base, relative));
      }
      function validateUrl(input) {
        if (
          /^\[/.test(input.hostname) &&
          !/^\[[:0-9a-f]+\]$/i.test(input.hostname)
        ) {
          throw new InvalidUrlError({ input: input.href || input });
        }
        if (
          /^\[/.test(input.host) &&
          !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)
        ) {
          throw new InvalidUrlError({ input: input.href || input });
        }
        return input;
      }
      function spreadUrlObject(urlObject, target) {
        var spread = target || {};
        for (var key of preservedUrlFields) {
          spread[key] = urlObject[key];
        }
        if (spread.hostname.startsWith("[")) {
          spread.hostname = spread.hostname.slice(1, -1);
        }
        if (spread.port !== "") {
          spread.port = Number(spread.port);
        }
        spread.path = spread.search
          ? spread.pathname + spread.search
          : spread.pathname;
        return spread;
      }
      function removeMatchingHeaders(regex, headers) {
        var lastValue;
        for (var header in headers) {
          if (regex.test(header)) {
            lastValue = headers[header];
            delete headers[header];
          }
        }
        return lastValue === null || typeof lastValue === "undefined"
          ? undefined
          : String(lastValue).trim();
      }
      function createErrorType(code, message, baseClass) {
        function CustomError(properties) {
          if (isFunction(Error.captureStackTrace)) {
            Error.captureStackTrace(this, this.constructor);
          }
          Object.assign(this, properties || {});
          this.code = code;
          this.message = this.cause
            ? message + ": " + this.cause.message
            : message;
        }
        CustomError.prototype = new (baseClass || Error)();
        Object.defineProperties(CustomError.prototype, {
          constructor: { value: CustomError, enumerable: false },
          name: { value: "Error [" + code + "]", enumerable: false },
        });
        return CustomError;
      }
      function destroyRequest(request, error) {
        for (var event of events) {
          request.removeListener(event, eventHandlers[event]);
        }
        request.on("error", noop);
        request.destroy(error);
      }
      function isSubdomain(subdomain, domain) {
        assert(isString(subdomain) && isString(domain));
        var dot = subdomain.length - domain.length - 1;
        return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
      }
      function isString(value) {
        return typeof value === "string" || value instanceof String;
      }
      function isFunction(value) {
        return typeof value === "function";
      }
      function isBuffer(value) {
        return typeof value === "object" && "length" in value;
      }
      function isURL(value) {
        return URL && value instanceof URL;
      }
      module.exports = wrap({ http, https });
      module.exports.wrap = wrap;
    },
    501: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getHandlers = exports.init = void 0;
      const logger_1 = __nccwpck_require__(8045);
      const logger = (0, logger_1.getInstance)();
      function init(proxy, option) {
        const handlers = getHandlers(option);
        for (const eventName of Object.keys(handlers)) {
          proxy.on(eventName, handlers[eventName]);
        }
        proxy.on("econnreset", (error, req, res, target) => {
          logger.error(`[HPM] ECONNRESET: %O`, error);
        });
        proxy.on("proxyReqWs", (proxyReq, req, socket, options, head) => {
          socket.on("error", (error) => {
            logger.error(`[HPM] WebSocket error: %O`, error);
          });
        });
        logger.debug(
          "[HPM] Subscribed to http-proxy events:",
          Object.keys(handlers),
        );
      }
      exports.init = init;
      function getHandlers(options) {
        const proxyEventsMap = {
          error: "onError",
          proxyReq: "onProxyReq",
          proxyReqWs: "onProxyReqWs",
          proxyRes: "onProxyRes",
          open: "onOpen",
          close: "onClose",
        };
        const handlers = {};
        for (const [eventName, onEventName] of Object.entries(proxyEventsMap)) {
          const fnHandler = options ? options[onEventName] : null;
          if (typeof fnHandler === "function") {
            handlers[eventName] = fnHandler;
          }
        }
        if (typeof handlers.error !== "function") {
          handlers.error = defaultErrorHandler;
        }
        if (typeof handlers.close !== "function") {
          handlers.close = logClose;
        }
        return handlers;
      }
      exports.getHandlers = getHandlers;
      function defaultErrorHandler(err, req, res) {
        if (!req && !res) {
          throw err;
        }
        const host = req.headers && req.headers.host;
        const code = err.code;
        if (res.writeHead && !res.headersSent) {
          if (/HPE_INVALID/.test(code)) {
            res.writeHead(502);
          } else {
            switch (code) {
              case "ECONNRESET":
              case "ENOTFOUND":
              case "ECONNREFUSED":
              case "ETIMEDOUT":
                res.writeHead(504);
                break;
              default:
                res.writeHead(500);
            }
          }
        }
        res.end(`Error occurred while trying to proxy: ${host}${req.url}`);
      }
      function logClose(req, socket, head) {
        logger.info("[HPM] Client disconnected");
      }
    },
    2304: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createConfig = void 0;
      const isPlainObj = __nccwpck_require__(3458);
      const url = __nccwpck_require__(7016);
      const errors_1 = __nccwpck_require__(4618);
      const logger_1 = __nccwpck_require__(8045);
      const logger = (0, logger_1.getInstance)();
      function createConfig(context, opts) {
        const config = { context: undefined, options: {} };
        if (isContextless(context, opts)) {
          config.context = "/";
          config.options = Object.assign(config.options, context);
        } else if (isStringShortHand(context)) {
          const oUrl = url.parse(context);
          const target = [oUrl.protocol, "//", oUrl.host].join("");
          config.context = oUrl.pathname || "/";
          config.options = Object.assign(config.options, { target }, opts);
          if (oUrl.protocol === "ws:" || oUrl.protocol === "wss:") {
            config.options.ws = true;
          }
        } else {
          config.context = context;
          config.options = Object.assign(config.options, opts);
        }
        configureLogger(config.options);
        if (!config.options.target && !config.options.router) {
          throw new Error(errors_1.ERRORS.ERR_CONFIG_FACTORY_TARGET_MISSING);
        }
        return config;
      }
      exports.createConfig = createConfig;
      function isStringShortHand(context) {
        if (typeof context === "string") {
          return !!url.parse(context).host;
        }
      }
      function isContextless(context, opts) {
        return (
          isPlainObj(context) &&
          (opts == null || Object.keys(opts).length === 0)
        );
      }
      function configureLogger(options) {
        if (options.logLevel) {
          logger.setLevel(options.logLevel);
        }
        if (options.logProvider) {
          logger.setProvider(options.logProvider);
        }
      }
    },
    1345: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.match = void 0;
      const isGlob = __nccwpck_require__(686);
      const micromatch = __nccwpck_require__(9555);
      const url = __nccwpck_require__(7016);
      const errors_1 = __nccwpck_require__(4618);
      function match(context, uri, req) {
        if (isStringPath(context)) {
          return matchSingleStringPath(context, uri);
        }
        if (isGlobPath(context)) {
          return matchSingleGlobPath(context, uri);
        }
        if (Array.isArray(context)) {
          if (context.every(isStringPath)) {
            return matchMultiPath(context, uri);
          }
          if (context.every(isGlobPath)) {
            return matchMultiGlobPath(context, uri);
          }
          throw new Error(errors_1.ERRORS.ERR_CONTEXT_MATCHER_INVALID_ARRAY);
        }
        if (typeof context === "function") {
          const pathname = getUrlPathName(uri);
          return context(pathname, req);
        }
        throw new Error(errors_1.ERRORS.ERR_CONTEXT_MATCHER_GENERIC);
      }
      exports.match = match;
      function matchSingleStringPath(context, uri) {
        const pathname = getUrlPathName(uri);
        return pathname.indexOf(context) === 0;
      }
      function matchSingleGlobPath(pattern, uri) {
        const pathname = getUrlPathName(uri);
        const matches = micromatch([pathname], pattern);
        return matches && matches.length > 0;
      }
      function matchMultiGlobPath(patternList, uri) {
        return matchSingleGlobPath(patternList, uri);
      }
      function matchMultiPath(contextList, uri) {
        let isMultiPath = false;
        for (const context of contextList) {
          if (matchSingleStringPath(context, uri)) {
            isMultiPath = true;
            break;
          }
        }
        return isMultiPath;
      }
      function getUrlPathName(uri) {
        return uri && url.parse(uri).pathname;
      }
      function isStringPath(context) {
        return typeof context === "string" && !isGlob(context);
      }
      function isGlobPath(context) {
        return isGlob(context);
      }
    },
    4618: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ERRORS = void 0;
      var ERRORS;
      (function (ERRORS) {
        ERRORS["ERR_CONFIG_FACTORY_TARGET_MISSING"] =
          '[HPM] Missing "target" option. Example: {target: "http://www.example.org"}';
        ERRORS["ERR_CONTEXT_MATCHER_GENERIC"] =
          '[HPM] Invalid context. Expecting something like: "/api" or ["/api", "/ajax"]';
        ERRORS["ERR_CONTEXT_MATCHER_INVALID_ARRAY"] =
          '[HPM] Invalid context. Expecting something like: ["/api", "/ajax"] or ["/api/**", "!**.html"]';
        ERRORS["ERR_PATH_REWRITER_CONFIG"] =
          "[HPM] Invalid pathRewrite config. Expecting object with pathRewrite config or a rewrite function";
      })((ERRORS = exports.ERRORS || (exports.ERRORS = {})));
    },
    6861: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.fixRequestBody = void 0;
      const querystring = __nccwpck_require__(3480);
      function fixRequestBody(proxyReq, req) {
        if (req.readableLength !== 0) {
          return;
        }
        const requestBody = req.body;
        if (!requestBody) {
          return;
        }
        const contentType = proxyReq.getHeader("Content-Type");
        if (!contentType) {
          return;
        }
        const writeBody = (bodyData) => {
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        };
        if (contentType.includes("application/json")) {
          writeBody(JSON.stringify(requestBody));
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          writeBody(querystring.stringify(requestBody));
        }
      }
      exports.fixRequestBody = fixRequestBody;
    },
    5611: function (__unused_webpack_module, exports, __nccwpck_require__) {
      "use strict";
      var __createBinding =
        (this && this.__createBinding) ||
        (Object.create
          ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                enumerable: true,
                get: function () {
                  return m[k];
                },
              });
            }
          : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
            });
      var __exportStar =
        (this && this.__exportStar) ||
        function (m, exports) {
          for (var p in m)
            if (
              p !== "default" &&
              !Object.prototype.hasOwnProperty.call(exports, p)
            )
              __createBinding(exports, m, p);
        };
      Object.defineProperty(exports, "__esModule", { value: true });
      __exportStar(__nccwpck_require__(9602), exports);
    },
    9602: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.fixRequestBody = exports.responseInterceptor = void 0;
      var response_interceptor_1 = __nccwpck_require__(5938);
      Object.defineProperty(exports, "responseInterceptor", {
        enumerable: true,
        get: function () {
          return response_interceptor_1.responseInterceptor;
        },
      });
      var fix_request_body_1 = __nccwpck_require__(6861);
      Object.defineProperty(exports, "fixRequestBody", {
        enumerable: true,
        get: function () {
          return fix_request_body_1.fixRequestBody;
        },
      });
    },
    5938: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.responseInterceptor = void 0;
      const zlib = __nccwpck_require__(3106);
      function responseInterceptor(interceptor) {
        return async function proxyRes(proxyRes, req, res) {
          const originalProxyRes = proxyRes;
          let buffer = Buffer.from("", "utf8");
          const _proxyRes = decompress(
            proxyRes,
            proxyRes.headers["content-encoding"],
          );
          _proxyRes.on(
            "data",
            (chunk) => (buffer = Buffer.concat([buffer, chunk])),
          );
          _proxyRes.on("end", async () => {
            copyHeaders(proxyRes, res);
            const interceptedBuffer = Buffer.from(
              await interceptor(buffer, originalProxyRes, req, res),
            );
            res.setHeader(
              "content-length",
              Buffer.byteLength(interceptedBuffer, "utf8"),
            );
            res.write(interceptedBuffer);
            res.end();
          });
          _proxyRes.on("error", (error) => {
            res.end(`Error fetching proxied request: ${error.message}`);
          });
        };
      }
      exports.responseInterceptor = responseInterceptor;
      function decompress(proxyRes, contentEncoding) {
        let _proxyRes = proxyRes;
        let decompress;
        switch (contentEncoding) {
          case "gzip":
            decompress = zlib.createGunzip();
            break;
          case "br":
            decompress = zlib.createBrotliDecompress();
            break;
          case "deflate":
            decompress = zlib.createInflate();
            break;
          default:
            break;
        }
        if (decompress) {
          _proxyRes.pipe(decompress);
          _proxyRes = decompress;
        }
        return _proxyRes;
      }
      function copyHeaders(originalResponse, response) {
        response.statusCode = originalResponse.statusCode;
        response.statusMessage = originalResponse.statusMessage;
        if (response.setHeader) {
          let keys = Object.keys(originalResponse.headers);
          keys = keys.filter(
            (key) => !["content-encoding", "transfer-encoding"].includes(key),
          );
          keys.forEach((key) => {
            let value = originalResponse.headers[key];
            if (key === "set-cookie") {
              value = Array.isArray(value) ? value : [value];
              value = value.map((x) => x.replace(/Domain=[^;]+?/i, ""));
            }
            response.setHeader(key, value);
          });
        } else {
          response.headers = originalResponse.headers;
        }
      }
    },
    6953: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.HttpProxyMiddleware = void 0;
      const httpProxy = __nccwpck_require__(4484);
      const config_factory_1 = __nccwpck_require__(2304);
      const contextMatcher = __nccwpck_require__(1345);
      const handlers = __nccwpck_require__(501);
      const logger_1 = __nccwpck_require__(8045);
      const PathRewriter = __nccwpck_require__(6241);
      const Router = __nccwpck_require__(604);
      class HttpProxyMiddleware {
        constructor(context, opts) {
          this.logger = (0, logger_1.getInstance)();
          this.wsInternalSubscribed = false;
          this.serverOnCloseSubscribed = false;
          this.middleware = async (req, res, next) => {
            var _a, _b;
            if (this.shouldProxy(this.config.context, req)) {
              try {
                const activeProxyOptions = await this.prepareProxyRequest(req);
                this.proxy.web(req, res, activeProxyOptions);
              } catch (err) {
                next(err);
              }
            } else {
              next();
            }
            const server =
              (_b =
                (_a = req.socket) !== null && _a !== void 0
                  ? _a
                  : req.connection) === null || _b === void 0
                ? void 0
                : _b.server;
            if (server && !this.serverOnCloseSubscribed) {
              server.on("close", () => {
                this.logger.info(
                  "[HPM] server close signal received: closing proxy server",
                );
                this.proxy.close();
              });
              this.serverOnCloseSubscribed = true;
            }
            if (this.proxyOptions.ws === true) {
              this.catchUpgradeRequest(server);
            }
          };
          this.catchUpgradeRequest = (server) => {
            if (!this.wsInternalSubscribed) {
              server.on("upgrade", this.handleUpgrade);
              this.wsInternalSubscribed = true;
            }
          };
          this.handleUpgrade = async (req, socket, head) => {
            if (this.shouldProxy(this.config.context, req)) {
              const activeProxyOptions = await this.prepareProxyRequest(req);
              this.proxy.ws(req, socket, head, activeProxyOptions);
              this.logger.info("[HPM] Upgrading to WebSocket");
            }
          };
          this.shouldProxy = (context, req) => {
            try {
              const path = req.originalUrl || req.url;
              return contextMatcher.match(context, path, req);
            } catch (error) {
              this.logger.error(error);
              return false;
            }
          };
          this.prepareProxyRequest = async (req) => {
            req.url = req.originalUrl || req.url;
            const originalPath = req.url;
            const newProxyOptions = Object.assign({}, this.proxyOptions);
            await this.applyRouter(req, newProxyOptions);
            await this.applyPathRewrite(req, this.pathRewriter);
            if (this.proxyOptions.logLevel === "debug") {
              const arrow = (0, logger_1.getArrow)(
                originalPath,
                req.url,
                this.proxyOptions.target,
                newProxyOptions.target,
              );
              this.logger.debug(
                "[HPM] %s %s %s %s",
                req.method,
                originalPath,
                arrow,
                newProxyOptions.target,
              );
            }
            return newProxyOptions;
          };
          this.applyRouter = async (req, options) => {
            let newTarget;
            if (options.router) {
              newTarget = await Router.getTarget(req, options);
              if (newTarget) {
                this.logger.debug(
                  '[HPM] Router new target: %s -> "%s"',
                  options.target,
                  newTarget,
                );
                options.target = newTarget;
              }
            }
          };
          this.applyPathRewrite = async (req, pathRewriter) => {
            if (pathRewriter) {
              const path = await pathRewriter(req.url, req);
              if (typeof path === "string") {
                req.url = path;
              } else {
                this.logger.info(
                  "[HPM] pathRewrite: No rewritten path found. (%s)",
                  req.url,
                );
              }
            }
          };
          this.logError = (err, req, res, target) => {
            var _a;
            const hostname =
              ((_a = req.headers) === null || _a === void 0
                ? void 0
                : _a.host) ||
              req.hostname ||
              req.host;
            const requestHref = `${hostname}${req.url}`;
            const targetHref = `${target === null || target === void 0 ? void 0 : target.href}`;
            const errorMessage =
              "[HPM] Error occurred while proxying request %s to %s [%s] (%s)";
            const errReference =
              "https://nodejs.org/api/errors.html#errors_common_system_errors";
            this.logger.error(
              errorMessage,
              requestHref,
              targetHref,
              err.code || err,
              errReference,
            );
          };
          this.config = (0, config_factory_1.createConfig)(context, opts);
          this.proxyOptions = this.config.options;
          this.proxy = httpProxy.createProxyServer({});
          this.logger.info(
            `[HPM] Proxy created: ${this.config.context}  -> ${this.proxyOptions.target}`,
          );
          this.pathRewriter = PathRewriter.createPathRewriter(
            this.proxyOptions.pathRewrite,
          );
          handlers.init(this.proxy, this.proxyOptions);
          this.proxy.on("error", this.logError);
          this.middleware.upgrade = (req, socket, head) => {
            if (!this.wsInternalSubscribed) {
              this.handleUpgrade(req, socket, head);
            }
          };
        }
      }
      exports.HttpProxyMiddleware = HttpProxyMiddleware;
    },
    7861: function (__unused_webpack_module, exports, __nccwpck_require__) {
      "use strict";
      var __createBinding =
        (this && this.__createBinding) ||
        (Object.create
          ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                enumerable: true,
                get: function () {
                  return m[k];
                },
              });
            }
          : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
            });
      var __exportStar =
        (this && this.__exportStar) ||
        function (m, exports) {
          for (var p in m)
            if (
              p !== "default" &&
              !Object.prototype.hasOwnProperty.call(exports, p)
            )
              __createBinding(exports, m, p);
        };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createProxyMiddleware = void 0;
      const http_proxy_middleware_1 = __nccwpck_require__(6953);
      function createProxyMiddleware(context, options) {
        const { middleware } = new http_proxy_middleware_1.HttpProxyMiddleware(
          context,
          options,
        );
        return middleware;
      }
      exports.createProxyMiddleware = createProxyMiddleware;
      __exportStar(__nccwpck_require__(5611), exports);
    },
    8045: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getArrow = exports.getInstance = void 0;
      const util = __nccwpck_require__(9023);
      let loggerInstance;
      const defaultProvider = {
        log: console.log,
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };
      var LEVELS;
      (function (LEVELS) {
        LEVELS[(LEVELS["debug"] = 10)] = "debug";
        LEVELS[(LEVELS["info"] = 20)] = "info";
        LEVELS[(LEVELS["warn"] = 30)] = "warn";
        LEVELS[(LEVELS["error"] = 50)] = "error";
        LEVELS[(LEVELS["silent"] = 80)] = "silent";
      })(LEVELS || (LEVELS = {}));
      function getInstance() {
        if (!loggerInstance) {
          loggerInstance = new Logger();
        }
        return loggerInstance;
      }
      exports.getInstance = getInstance;
      class Logger {
        constructor() {
          this.setLevel("info");
          this.setProvider(() => defaultProvider);
        }
        log() {
          this.provider.log(this._interpolate.apply(null, arguments));
        }
        debug() {
          if (this._showLevel("debug")) {
            this.provider.debug(this._interpolate.apply(null, arguments));
          }
        }
        info() {
          if (this._showLevel("info")) {
            this.provider.info(this._interpolate.apply(null, arguments));
          }
        }
        warn() {
          if (this._showLevel("warn")) {
            this.provider.warn(this._interpolate.apply(null, arguments));
          }
        }
        error() {
          if (this._showLevel("error")) {
            this.provider.error(this._interpolate.apply(null, arguments));
          }
        }
        setLevel(v) {
          if (this.isValidLevel(v)) {
            this.logLevel = v;
          }
        }
        setProvider(fn) {
          if (fn && this.isValidProvider(fn)) {
            this.provider = fn(defaultProvider);
          }
        }
        isValidProvider(fnProvider) {
          const result = true;
          if (fnProvider && typeof fnProvider !== "function") {
            throw new Error(
              "[HPM] Log provider config error. Expecting a function.",
            );
          }
          return result;
        }
        isValidLevel(levelName) {
          const validLevels = Object.keys(LEVELS);
          const isValid = validLevels.includes(levelName);
          if (!isValid) {
            throw new Error("[HPM] Log level error. Invalid logLevel.");
          }
          return isValid;
        }
        _showLevel(showLevel) {
          let result = false;
          const currentLogLevel = LEVELS[this.logLevel];
          if (currentLogLevel && currentLogLevel <= LEVELS[showLevel]) {
            result = true;
          }
          return result;
        }
        _interpolate(format, ...args) {
          const result = util.format(format, ...args);
          return result;
        }
      }
      function getArrow(originalPath, newPath, originalTarget, newTarget) {
        const arrow = [">"];
        const isNewTarget = originalTarget !== newTarget;
        const isNewPath = originalPath !== newPath;
        if (isNewPath && !isNewTarget) {
          arrow.unshift("~");
        } else if (!isNewPath && isNewTarget) {
          arrow.unshift("=");
        } else if (isNewPath && isNewTarget) {
          arrow.unshift("≈");
        } else {
          arrow.unshift("-");
        }
        return arrow.join("");
      }
      exports.getArrow = getArrow;
    },
    6241: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createPathRewriter = void 0;
      const isPlainObj = __nccwpck_require__(3458);
      const errors_1 = __nccwpck_require__(4618);
      const logger_1 = __nccwpck_require__(8045);
      const logger = (0, logger_1.getInstance)();
      function createPathRewriter(rewriteConfig) {
        let rulesCache;
        if (!isValidRewriteConfig(rewriteConfig)) {
          return;
        }
        if (typeof rewriteConfig === "function") {
          const customRewriteFn = rewriteConfig;
          return customRewriteFn;
        } else {
          rulesCache = parsePathRewriteRules(rewriteConfig);
          return rewritePath;
        }
        function rewritePath(path) {
          let result = path;
          for (const rule of rulesCache) {
            if (rule.regex.test(path)) {
              result = result.replace(rule.regex, rule.value);
              logger.debug(
                '[HPM] Rewriting path from "%s" to "%s"',
                path,
                result,
              );
              break;
            }
          }
          return result;
        }
      }
      exports.createPathRewriter = createPathRewriter;
      function isValidRewriteConfig(rewriteConfig) {
        if (typeof rewriteConfig === "function") {
          return true;
        } else if (isPlainObj(rewriteConfig)) {
          return Object.keys(rewriteConfig).length !== 0;
        } else if (rewriteConfig === undefined || rewriteConfig === null) {
          return false;
        } else {
          throw new Error(errors_1.ERRORS.ERR_PATH_REWRITER_CONFIG);
        }
      }
      function parsePathRewriteRules(rewriteConfig) {
        const rules = [];
        if (isPlainObj(rewriteConfig)) {
          for (const [key] of Object.entries(rewriteConfig)) {
            rules.push({ regex: new RegExp(key), value: rewriteConfig[key] });
            logger.info(
              '[HPM] Proxy rewrite rule created: "%s" ~> "%s"',
              key,
              rewriteConfig[key],
            );
          }
        }
        return rules;
      }
    },
    604: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getTarget = void 0;
      const isPlainObj = __nccwpck_require__(3458);
      const logger_1 = __nccwpck_require__(8045);
      const logger = (0, logger_1.getInstance)();
      async function getTarget(req, config) {
        let newTarget;
        const router = config.router;
        if (isPlainObj(router)) {
          newTarget = getTargetFromProxyTable(req, router);
        } else if (typeof router === "function") {
          newTarget = await router(req);
        }
        return newTarget;
      }
      exports.getTarget = getTarget;
      function getTargetFromProxyTable(req, table) {
        let result;
        const host = req.headers.host;
        const path = req.url;
        const hostAndPath = host + path;
        for (const [key] of Object.entries(table)) {
          if (containsPath(key)) {
            if (hostAndPath.indexOf(key) > -1) {
              result = table[key];
              logger.debug('[HPM] Router table match: "%s"', key);
              break;
            }
          } else {
            if (key === host) {
              result = table[key];
              logger.debug('[HPM] Router table match: "%s"', host);
              break;
            }
          }
        }
        return result;
      }
      function containsPath(v) {
        return v.indexOf("/") > -1;
      }
    },
    4484: (module, __unused_webpack_exports, __nccwpck_require__) => {
      /*!
       * Caron dimonio, con occhi di bragia
       * loro accennando, tutte le raccoglie;
       * batte col remo qualunque s’adagia
       *
       * Charon the demon, with the eyes of glede,
       * Beckoning to them, collects them all together,
       * Beats with his oar whoever lags behind
       *
       *          Dante - The Divine Comedy (Canto III)
       */
      module.exports = __nccwpck_require__(5175);
    },
    5175: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var ProxyServer = __nccwpck_require__(1152).Server;
      function createProxyServer(options) {
        return new ProxyServer(options);
      }
      ProxyServer.createProxyServer = createProxyServer;
      ProxyServer.createServer = createProxyServer;
      ProxyServer.createProxy = createProxyServer;
      module.exports = ProxyServer;
    },
    2915: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var common = exports,
        url = __nccwpck_require__(7016),
        required = __nccwpck_require__(7866);
      var upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i,
        isSSL = /^https|wss/;
      common.isSSL = isSSL;
      common.setupOutgoing = function (outgoing, options, req, forward) {
        outgoing.port =
          options[forward || "target"].port ||
          (isSSL.test(options[forward || "target"].protocol) ? 443 : 80);
        [
          "host",
          "hostname",
          "socketPath",
          "pfx",
          "key",
          "passphrase",
          "cert",
          "ca",
          "ciphers",
          "secureProtocol",
        ].forEach(function (e) {
          outgoing[e] = options[forward || "target"][e];
        });
        outgoing.method = options.method || req.method;
        outgoing.headers = Object.assign({}, req.headers);
        if (options.headers) {
          Object.assign(outgoing.headers, options.headers);
        }
        if (options.auth) {
          outgoing.auth = options.auth;
        }
        if (options.ca) {
          outgoing.ca = options.ca;
        }
        if (isSSL.test(options[forward || "target"].protocol)) {
          outgoing.rejectUnauthorized =
            typeof options.secure === "undefined" ? true : options.secure;
        }
        outgoing.agent = options.agent || false;
        outgoing.localAddress = options.localAddress;
        if (!outgoing.agent) {
          outgoing.headers = outgoing.headers || {};
          if (
            typeof outgoing.headers.connection !== "string" ||
            !upgradeHeader.test(outgoing.headers.connection)
          ) {
            outgoing.headers.connection = "close";
          }
        }
        var target = options[forward || "target"];
        var targetPath =
          target && options.prependPath !== false ? target.path || "" : "";
        var outgoingPath = !options.toProxy
          ? url.parse(req.url).path || ""
          : req.url;
        outgoingPath = !options.ignorePath ? outgoingPath : "";
        outgoing.path = common.urlJoin(targetPath, outgoingPath);
        if (options.changeOrigin) {
          outgoing.headers.host =
            required(outgoing.port, options[forward || "target"].protocol) &&
            !hasPort(outgoing.host)
              ? outgoing.host + ":" + outgoing.port
              : outgoing.host;
        }
        return outgoing;
      };
      common.setupSocket = function (socket) {
        socket.setTimeout(0);
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 0);
        return socket;
      };
      common.getPort = function (req) {
        var res = req.headers.host ? req.headers.host.match(/:(\d+)/) : "";
        return res ? res[1] : common.hasEncryptedConnection(req) ? "443" : "80";
      };
      common.hasEncryptedConnection = function (req) {
        return Boolean(req.connection.encrypted || req.connection.pair);
      };
      common.urlJoin = function () {
        var args = Array.prototype.slice.call(arguments),
          lastIndex = args.length - 1,
          last = args[lastIndex],
          lastSegs = last.split("?"),
          retSegs;
        args[lastIndex] = lastSegs.shift();
        retSegs = [
          args
            .filter(Boolean)
            .join("/")
            .replace(/\/+/g, "/")
            .replace("http:/", "http://")
            .replace("https:/", "https://"),
        ];
        retSegs.push.apply(retSegs, lastSegs);
        return retSegs.join("?");
      };
      common.rewriteCookieProperty = function rewriteCookieProperty(
        header,
        config,
        property,
      ) {
        if (Array.isArray(header)) {
          return header.map(function (headerElement) {
            return rewriteCookieProperty(headerElement, config, property);
          });
        }
        return header.replace(
          new RegExp("(;\\s*" + property + "=)([^;]+)", "i"),
          function (match, prefix, previousValue) {
            var newValue;
            if (previousValue in config) {
              newValue = config[previousValue];
            } else if ("*" in config) {
              newValue = config["*"];
            } else {
              return match;
            }
            if (newValue) {
              return prefix + newValue;
            } else {
              return "";
            }
          },
        );
      };
      function hasPort(host) {
        return !!~host.indexOf(":");
      }
    },
    1152: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var httpProxy = module.exports,
        parse_url = __nccwpck_require__(7016).parse,
        EE3 = __nccwpck_require__(6234),
        http = __nccwpck_require__(8611),
        https = __nccwpck_require__(5692),
        web = __nccwpck_require__(9043),
        ws = __nccwpck_require__(2725);
      httpProxy.Server = ProxyServer;
      function createRightProxy(type) {
        return function (options) {
          return function (req, res) {
            var passes = type === "ws" ? this.wsPasses : this.webPasses,
              args = [].slice.call(arguments),
              cntr = args.length - 1,
              head,
              cbl;
            if (typeof args[cntr] === "function") {
              cbl = args[cntr];
              cntr--;
            }
            var requestOptions = options;
            if (!(args[cntr] instanceof Buffer) && args[cntr] !== res) {
              requestOptions = Object.assign({}, options);
              Object.assign(requestOptions, args[cntr]);
              cntr--;
            }
            if (args[cntr] instanceof Buffer) {
              head = args[cntr];
            }
            ["target", "forward"].forEach(function (e) {
              if (typeof requestOptions[e] === "string")
                requestOptions[e] = parse_url(requestOptions[e]);
            });
            if (!requestOptions.target && !requestOptions.forward) {
              return this.emit(
                "error",
                new Error("Must provide a proper URL as target"),
              );
            }
            for (var i = 0; i < passes.length; i++) {
              if (passes[i](req, res, requestOptions, head, this, cbl)) {
                break;
              }
            }
          };
        };
      }
      httpProxy.createRightProxy = createRightProxy;
      function ProxyServer(options) {
        EE3.call(this);
        options = options || {};
        options.prependPath = options.prependPath === false ? false : true;
        this.web = this.proxyRequest = createRightProxy("web")(options);
        this.ws = this.proxyWebsocketRequest = createRightProxy("ws")(options);
        this.options = options;
        this.webPasses = Object.keys(web).map(function (pass) {
          return web[pass];
        });
        this.wsPasses = Object.keys(ws).map(function (pass) {
          return ws[pass];
        });
        this.on("error", this.onError, this);
      }
      __nccwpck_require__(9023).inherits(ProxyServer, EE3);
      ProxyServer.prototype.onError = function (err) {
        if (this.listeners("error").length === 1) {
          throw err;
        }
      };
      ProxyServer.prototype.listen = function (port, hostname) {
        var self = this,
          closure = function (req, res) {
            self.web(req, res);
          };
        this._server = this.options.ssl
          ? https.createServer(this.options.ssl, closure)
          : http.createServer(closure);
        if (this.options.ws) {
          this._server.on("upgrade", function (req, socket, head) {
            self.ws(req, socket, head);
          });
        }
        this._server.listen(port, hostname);
        return this;
      };
      ProxyServer.prototype.close = function (callback) {
        var self = this;
        if (this._server) {
          this._server.close(done);
        }
        function done() {
          self._server = null;
          if (callback) {
            callback.apply(null, arguments);
          }
        }
      };
      ProxyServer.prototype.before = function (type, passName, callback) {
        if (type !== "ws" && type !== "web") {
          throw new Error("type must be `web` or `ws`");
        }
        var passes = type === "ws" ? this.wsPasses : this.webPasses,
          i = false;
        passes.forEach(function (v, idx) {
          if (v.name === passName) i = idx;
        });
        if (i === false) throw new Error("No such pass");
        passes.splice(i, 0, callback);
      };
      ProxyServer.prototype.after = function (type, passName, callback) {
        if (type !== "ws" && type !== "web") {
          throw new Error("type must be `web` or `ws`");
        }
        var passes = type === "ws" ? this.wsPasses : this.webPasses,
          i = false;
        passes.forEach(function (v, idx) {
          if (v.name === passName) i = idx;
        });
        if (i === false) throw new Error("No such pass");
        passes.splice(i++, 0, callback);
      };
    },
    9043: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var httpNative = __nccwpck_require__(8611),
        httpsNative = __nccwpck_require__(5692),
        web_o = __nccwpck_require__(9905),
        common = __nccwpck_require__(2915),
        followRedirects = __nccwpck_require__(1584);
      web_o = Object.keys(web_o).map(function (pass) {
        return web_o[pass];
      });
      var nativeAgents = { http: httpNative, https: httpsNative };
      /*!
       * Array of passes.
       *
       * A `pass` is just a function that is executed on `req, res, options`
       * so that you can easily add new checks while still keeping the base
       * flexible.
       */ module.exports = {
        deleteLength: function deleteLength(req, res, options) {
          if (
            (req.method === "DELETE" || req.method === "OPTIONS") &&
            !req.headers["content-length"]
          ) {
            req.headers["content-length"] = "0";
            delete req.headers["transfer-encoding"];
          }
        },
        timeout: function timeout(req, res, options) {
          if (options.timeout) {
            req.socket.setTimeout(options.timeout);
          }
        },
        XHeaders: function XHeaders(req, res, options) {
          if (!options.xfwd) return;
          var encrypted = req.isSpdy || common.hasEncryptedConnection(req);
          var values = {
            for: req.connection.remoteAddress || req.socket.remoteAddress,
            port: common.getPort(req),
            proto: encrypted ? "https" : "http",
          };
          ["for", "port", "proto"].forEach(function (header) {
            req.headers["x-forwarded-" + header] =
              (req.headers["x-forwarded-" + header] || "") +
              (req.headers["x-forwarded-" + header] ? "," : "") +
              values[header];
          });
          req.headers["x-forwarded-host"] =
            req.headers["x-forwarded-host"] || req.headers["host"] || "";
        },
        stream: function stream(req, res, options, _, server, clb) {
          server.emit("start", req, res, options.target || options.forward);
          var agents = options.followRedirects ? followRedirects : nativeAgents;
          var http = agents.http;
          var https = agents.https;
          if (options.forward) {
            var forwardReq = (
              options.forward.protocol === "https:" ? https : http
            ).request(
              common.setupOutgoing(options.ssl || {}, options, req, "forward"),
            );
            var forwardError = createErrorHandler(forwardReq, options.forward);
            req.on("error", forwardError);
            forwardReq.on("error", forwardError);
            (options.buffer || req).pipe(forwardReq);
            if (!options.target) {
              return res.end();
            }
          }
          var proxyReq = (
            options.target.protocol === "https:" ? https : http
          ).request(common.setupOutgoing(options.ssl || {}, options, req));
          proxyReq.on("socket", function (socket) {
            if (server && !proxyReq.getHeader("expect")) {
              server.emit("proxyReq", proxyReq, req, res, options);
            }
          });
          if (options.proxyTimeout) {
            proxyReq.setTimeout(options.proxyTimeout, function () {
              proxyReq.abort();
            });
          }
          req.on("aborted", function () {
            proxyReq.abort();
          });
          var proxyError = createErrorHandler(proxyReq, options.target);
          req.on("error", proxyError);
          proxyReq.on("error", proxyError);
          function createErrorHandler(proxyReq, url) {
            return function proxyError(err) {
              if (req.socket.destroyed && err.code === "ECONNRESET") {
                server.emit("econnreset", err, req, res, url);
                return proxyReq.abort();
              }
              if (clb) {
                clb(err, req, res, url);
              } else {
                server.emit("error", err, req, res, url);
              }
            };
          }
          (options.buffer || req).pipe(proxyReq);
          proxyReq.on("response", function (proxyRes) {
            if (server) {
              server.emit("proxyRes", proxyRes, req, res);
            }
            if (!res.headersSent && !options.selfHandleResponse) {
              for (var i = 0; i < web_o.length; i++) {
                if (web_o[i](req, res, proxyRes, options)) {
                  break;
                }
              }
            }
            if (!res.finished) {
              proxyRes.on("end", function () {
                if (server) server.emit("end", req, res, proxyRes);
              });
              if (!options.selfHandleResponse) proxyRes.pipe(res);
            } else {
              if (server) server.emit("end", req, res, proxyRes);
            }
          });
        },
      };
    },
    9905: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var url = __nccwpck_require__(7016),
        common = __nccwpck_require__(2915);
      var redirectRegex = /^201|30(1|2|7|8)$/;
      /*!
       * Array of passes.
       *
       * A `pass` is just a function that is executed on `req, res, options`
       * so that you can easily add new checks while still keeping the base
       * flexible.
       */ module.exports = {
        removeChunked: function removeChunked(req, res, proxyRes) {
          if (req.httpVersion === "1.0") {
            delete proxyRes.headers["transfer-encoding"];
          }
        },
        setConnection: function setConnection(req, res, proxyRes) {
          if (req.httpVersion === "1.0") {
            proxyRes.headers.connection = req.headers.connection || "close";
          } else if (
            req.httpVersion !== "2.0" &&
            !proxyRes.headers.connection
          ) {
            proxyRes.headers.connection =
              req.headers.connection || "keep-alive";
          }
        },
        setRedirectHostRewrite: function setRedirectHostRewrite(
          req,
          res,
          proxyRes,
          options,
        ) {
          if (
            (options.hostRewrite ||
              options.autoRewrite ||
              options.protocolRewrite) &&
            proxyRes.headers["location"] &&
            redirectRegex.test(proxyRes.statusCode)
          ) {
            var target = url.parse(options.target);
            var u = url.parse(proxyRes.headers["location"]);
            if (target.host != u.host) {
              return;
            }
            if (options.hostRewrite) {
              u.host = options.hostRewrite;
            } else if (options.autoRewrite) {
              u.host = req.headers["host"];
            }
            if (options.protocolRewrite) {
              u.protocol = options.protocolRewrite;
            }
            proxyRes.headers["location"] = u.format();
          }
        },
        writeHeaders: function writeHeaders(req, res, proxyRes, options) {
          var rewriteCookieDomainConfig = options.cookieDomainRewrite,
            rewriteCookiePathConfig = options.cookiePathRewrite,
            preserveHeaderKeyCase = options.preserveHeaderKeyCase,
            rawHeaderKeyMap,
            setHeader = function (key, header) {
              if (header == undefined) return;
              if (
                rewriteCookieDomainConfig &&
                key.toLowerCase() === "set-cookie"
              ) {
                header = common.rewriteCookieProperty(
                  header,
                  rewriteCookieDomainConfig,
                  "domain",
                );
              }
              if (
                rewriteCookiePathConfig &&
                key.toLowerCase() === "set-cookie"
              ) {
                header = common.rewriteCookieProperty(
                  header,
                  rewriteCookiePathConfig,
                  "path",
                );
              }
              res.setHeader(String(key).trim(), header);
            };
          if (typeof rewriteCookieDomainConfig === "string") {
            rewriteCookieDomainConfig = { "*": rewriteCookieDomainConfig };
          }
          if (typeof rewriteCookiePathConfig === "string") {
            rewriteCookiePathConfig = { "*": rewriteCookiePathConfig };
          }
          if (preserveHeaderKeyCase && proxyRes.rawHeaders != undefined) {
            rawHeaderKeyMap = {};
            for (var i = 0; i < proxyRes.rawHeaders.length; i += 2) {
              var key = proxyRes.rawHeaders[i];
              rawHeaderKeyMap[key.toLowerCase()] = key;
            }
          }
          Object.keys(proxyRes.headers).forEach(function (key) {
            var header = proxyRes.headers[key];
            if (preserveHeaderKeyCase && rawHeaderKeyMap) {
              key = rawHeaderKeyMap[key] || key;
            }
            setHeader(key, header);
          });
        },
        writeStatusCode: function writeStatusCode(req, res, proxyRes) {
          if (proxyRes.statusMessage) {
            res.statusCode = proxyRes.statusCode;
            res.statusMessage = proxyRes.statusMessage;
          } else {
            res.statusCode = proxyRes.statusCode;
          }
        },
      };
    },
    2725: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var http = __nccwpck_require__(8611),
        https = __nccwpck_require__(5692),
        common = __nccwpck_require__(2915);
      /*!
       * Array of passes.
       *
       * A `pass` is just a function that is executed on `req, socket, options`
       * so that you can easily add new checks while still keeping the base
       * flexible.
       */ module.exports = {
        checkMethodAndHeader: function checkMethodAndHeader(req, socket) {
          if (req.method !== "GET" || !req.headers.upgrade) {
            socket.destroy();
            return true;
          }
          if (req.headers.upgrade.toLowerCase() !== "websocket") {
            socket.destroy();
            return true;
          }
        },
        XHeaders: function XHeaders(req, socket, options) {
          if (!options.xfwd) return;
          var values = {
            for: req.connection.remoteAddress || req.socket.remoteAddress,
            port: common.getPort(req),
            proto: common.hasEncryptedConnection(req) ? "wss" : "ws",
          };
          ["for", "port", "proto"].forEach(function (header) {
            req.headers["x-forwarded-" + header] =
              (req.headers["x-forwarded-" + header] || "") +
              (req.headers["x-forwarded-" + header] ? "," : "") +
              values[header];
          });
        },
        stream: function stream(req, socket, options, head, server, clb) {
          var createHttpHeader = function (line, headers) {
            return (
              Object.keys(headers)
                .reduce(
                  function (head, key) {
                    var value = headers[key];
                    if (!Array.isArray(value)) {
                      head.push(key + ": " + value);
                      return head;
                    }
                    for (var i = 0; i < value.length; i++) {
                      head.push(key + ": " + value[i]);
                    }
                    return head;
                  },
                  [line],
                )
                .join("\r\n") + "\r\n\r\n"
            );
          };
          common.setupSocket(socket);
          if (head && head.length) socket.unshift(head);
          var proxyReq = (
            common.isSSL.test(options.target.protocol) ? https : http
          ).request(common.setupOutgoing(options.ssl || {}, options, req));
          if (server) {
            server.emit("proxyReqWs", proxyReq, req, socket, options, head);
          }
          proxyReq.on("error", onOutgoingError);
          proxyReq.on("response", function (res) {
            if (!res.upgrade) {
              socket.write(
                createHttpHeader(
                  "HTTP/" +
                    res.httpVersion +
                    " " +
                    res.statusCode +
                    " " +
                    res.statusMessage,
                  res.headers,
                ),
              );
              res.pipe(socket);
            }
          });
          proxyReq.on("upgrade", function (proxyRes, proxySocket, proxyHead) {
            proxySocket.on("error", onOutgoingError);
            proxySocket.on("end", function () {
              server.emit("close", proxyRes, proxySocket, proxyHead);
            });
            socket.on("error", function () {
              proxySocket.end();
            });
            common.setupSocket(proxySocket);
            if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);
            socket.write(
              createHttpHeader(
                "HTTP/1.1 101 Switching Protocols",
                proxyRes.headers,
              ),
            );
            proxySocket.pipe(socket).pipe(proxySocket);
            server.emit("open", proxySocket);
            server.emit("proxySocket", proxySocket);
          });
          return proxyReq.end();
          function onOutgoingError(err) {
            if (clb) {
              clb(err, req, socket);
            } else {
              server.emit("error", err, req, socket);
            }
            socket.end();
          }
        },
      };
    },
    9825: (module) => {
      /*!
       * is-extglob <https://github.com/jonschlinkert/is-extglob>
       *
       * Copyright (c) 2014-2016, Jon Schlinkert.
       * Licensed under the MIT License.
       */
      module.exports = function isExtglob(str) {
        if (typeof str !== "string" || str === "") {
          return false;
        }
        var match;
        while ((match = /(\\).|([@?!+*]\(.*\))/g.exec(str))) {
          if (match[2]) return true;
          str = str.slice(match.index + match[0].length);
        }
        return false;
      };
    },
    686: (module, __unused_webpack_exports, __nccwpck_require__) => {
      /*!
       * is-glob <https://github.com/jonschlinkert/is-glob>
       *
       * Copyright (c) 2014-2017, Jon Schlinkert.
       * Released under the MIT License.
       */
      var isExtglob = __nccwpck_require__(9825);
      var chars = { "{": "}", "(": ")", "[": "]" };
      var strictCheck = function (str) {
        if (str[0] === "!") {
          return true;
        }
        var index = 0;
        var pipeIndex = -2;
        var closeSquareIndex = -2;
        var closeCurlyIndex = -2;
        var closeParenIndex = -2;
        var backSlashIndex = -2;
        while (index < str.length) {
          if (str[index] === "*") {
            return true;
          }
          if (str[index + 1] === "?" && /[\].+)]/.test(str[index])) {
            return true;
          }
          if (
            closeSquareIndex !== -1 &&
            str[index] === "[" &&
            str[index + 1] !== "]"
          ) {
            if (closeSquareIndex < index) {
              closeSquareIndex = str.indexOf("]", index);
            }
            if (closeSquareIndex > index) {
              if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
                return true;
              }
              backSlashIndex = str.indexOf("\\", index);
              if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
                return true;
              }
            }
          }
          if (
            closeCurlyIndex !== -1 &&
            str[index] === "{" &&
            str[index + 1] !== "}"
          ) {
            closeCurlyIndex = str.indexOf("}", index);
            if (closeCurlyIndex > index) {
              backSlashIndex = str.indexOf("\\", index);
              if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) {
                return true;
              }
            }
          }
          if (
            closeParenIndex !== -1 &&
            str[index] === "(" &&
            str[index + 1] === "?" &&
            /[:!=]/.test(str[index + 2]) &&
            str[index + 3] !== ")"
          ) {
            closeParenIndex = str.indexOf(")", index);
            if (closeParenIndex > index) {
              backSlashIndex = str.indexOf("\\", index);
              if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
                return true;
              }
            }
          }
          if (
            pipeIndex !== -1 &&
            str[index] === "(" &&
            str[index + 1] !== "|"
          ) {
            if (pipeIndex < index) {
              pipeIndex = str.indexOf("|", index);
            }
            if (pipeIndex !== -1 && str[pipeIndex + 1] !== ")") {
              closeParenIndex = str.indexOf(")", pipeIndex);
              if (closeParenIndex > pipeIndex) {
                backSlashIndex = str.indexOf("\\", pipeIndex);
                if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
                  return true;
                }
              }
            }
          }
          if (str[index] === "\\") {
            var open = str[index + 1];
            index += 2;
            var close = chars[open];
            if (close) {
              var n = str.indexOf(close, index);
              if (n !== -1) {
                index = n + 1;
              }
            }
            if (str[index] === "!") {
              return true;
            }
          } else {
            index++;
          }
        }
        return false;
      };
      var relaxedCheck = function (str) {
        if (str[0] === "!") {
          return true;
        }
        var index = 0;
        while (index < str.length) {
          if (/[*?{}()[\]]/.test(str[index])) {
            return true;
          }
          if (str[index] === "\\") {
            var open = str[index + 1];
            index += 2;
            var close = chars[open];
            if (close) {
              var n = str.indexOf(close, index);
              if (n !== -1) {
                index = n + 1;
              }
            }
            if (str[index] === "!") {
              return true;
            }
          } else {
            index++;
          }
        }
        return false;
      };
      module.exports = function isGlob(str, options) {
        if (typeof str !== "string" || str === "") {
          return false;
        }
        if (isExtglob(str)) {
          return true;
        }
        var check = strictCheck;
        if (options && options.strict === false) {
          check = relaxedCheck;
        }
        return check(str);
      };
    },
    952: (module) => {
      "use strict";
      /*!
       * is-number <https://github.com/jonschlinkert/is-number>
       *
       * Copyright (c) 2014-present, Jon Schlinkert.
       * Released under the MIT License.
       */ module.exports = function (num) {
        if (typeof num === "number") {
          return num - num === 0;
        }
        if (typeof num === "string" && num.trim() !== "") {
          return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
        }
        return false;
      };
    },
    3458: (module) => {
      "use strict";
      module.exports = (value) => {
        if (Object.prototype.toString.call(value) !== "[object Object]") {
          return false;
        }
        const prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
      };
    },
    9555: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const util = __nccwpck_require__(9023);
      const braces = __nccwpck_require__(8671);
      const picomatch = __nccwpck_require__(5675);
      const utils = __nccwpck_require__(7910);
      const isEmptyString = (v) => v === "" || v === "./";
      const hasBraces = (v) => {
        const index = v.indexOf("{");
        return index > -1 && v.indexOf("}", index) > -1;
      };
      const micromatch = (list, patterns, options) => {
        patterns = [].concat(patterns);
        list = [].concat(list);
        let omit = new Set();
        let keep = new Set();
        let items = new Set();
        let negatives = 0;
        let onResult = (state) => {
          items.add(state.output);
          if (options && options.onResult) {
            options.onResult(state);
          }
        };
        for (let i = 0; i < patterns.length; i++) {
          let isMatch = picomatch(
            String(patterns[i]),
            { ...options, onResult },
            true,
          );
          let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
          if (negated) negatives++;
          for (let item of list) {
            let matched = isMatch(item, true);
            let match = negated ? !matched.isMatch : matched.isMatch;
            if (!match) continue;
            if (negated) {
              omit.add(matched.output);
            } else {
              omit.delete(matched.output);
              keep.add(matched.output);
            }
          }
        }
        let result = negatives === patterns.length ? [...items] : [...keep];
        let matches = result.filter((item) => !omit.has(item));
        if (options && matches.length === 0) {
          if (options.failglob === true) {
            throw new Error(`No matches found for "${patterns.join(", ")}"`);
          }
          if (options.nonull === true || options.nullglob === true) {
            return options.unescape
              ? patterns.map((p) => p.replace(/\\/g, ""))
              : patterns;
          }
        }
        return matches;
      };
      micromatch.match = micromatch;
      micromatch.matcher = (pattern, options) => picomatch(pattern, options);
      micromatch.isMatch = (str, patterns, options) =>
        picomatch(patterns, options)(str);
      micromatch.any = micromatch.isMatch;
      micromatch.not = (list, patterns, options = {}) => {
        patterns = [].concat(patterns).map(String);
        let result = new Set();
        let items = [];
        let onResult = (state) => {
          if (options.onResult) options.onResult(state);
          items.push(state.output);
        };
        let matches = new Set(
          micromatch(list, patterns, { ...options, onResult }),
        );
        for (let item of items) {
          if (!matches.has(item)) {
            result.add(item);
          }
        }
        return [...result];
      };
      micromatch.contains = (str, pattern, options) => {
        if (typeof str !== "string") {
          throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
        }
        if (Array.isArray(pattern)) {
          return pattern.some((p) => micromatch.contains(str, p, options));
        }
        if (typeof pattern === "string") {
          if (isEmptyString(str) || isEmptyString(pattern)) {
            return false;
          }
          if (
            str.includes(pattern) ||
            (str.startsWith("./") && str.slice(2).includes(pattern))
          ) {
            return true;
          }
        }
        return micromatch.isMatch(str, pattern, { ...options, contains: true });
      };
      micromatch.matchKeys = (obj, patterns, options) => {
        if (!utils.isObject(obj)) {
          throw new TypeError("Expected the first argument to be an object");
        }
        let keys = micromatch(Object.keys(obj), patterns, options);
        let res = {};
        for (let key of keys) res[key] = obj[key];
        return res;
      };
      micromatch.some = (list, patterns, options) => {
        let items = [].concat(list);
        for (let pattern of [].concat(patterns)) {
          let isMatch = picomatch(String(pattern), options);
          if (items.some((item) => isMatch(item))) {
            return true;
          }
        }
        return false;
      };
      micromatch.every = (list, patterns, options) => {
        let items = [].concat(list);
        for (let pattern of [].concat(patterns)) {
          let isMatch = picomatch(String(pattern), options);
          if (!items.every((item) => isMatch(item))) {
            return false;
          }
        }
        return true;
      };
      micromatch.all = (str, patterns, options) => {
        if (typeof str !== "string") {
          throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
        }
        return [].concat(patterns).every((p) => picomatch(p, options)(str));
      };
      micromatch.capture = (glob, input, options) => {
        let posix = utils.isWindows(options);
        let regex = picomatch.makeRe(String(glob), {
          ...options,
          capture: true,
        });
        let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);
        if (match) {
          return match.slice(1).map((v) => (v === void 0 ? "" : v));
        }
      };
      micromatch.makeRe = (...args) => picomatch.makeRe(...args);
      micromatch.scan = (...args) => picomatch.scan(...args);
      micromatch.parse = (patterns, options) => {
        let res = [];
        for (let pattern of [].concat(patterns || [])) {
          for (let str of braces(String(pattern), options)) {
            res.push(picomatch.parse(str, options));
          }
        }
        return res;
      };
      micromatch.braces = (pattern, options) => {
        if (typeof pattern !== "string")
          throw new TypeError("Expected a string");
        if ((options && options.nobrace === true) || !hasBraces(pattern)) {
          return [pattern];
        }
        return braces(pattern, options);
      };
      micromatch.braceExpand = (pattern, options) => {
        if (typeof pattern !== "string")
          throw new TypeError("Expected a string");
        return micromatch.braces(pattern, { ...options, expand: true });
      };
      micromatch.hasBraces = hasBraces;
      module.exports = micromatch;
    },
    5675: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      module.exports = __nccwpck_require__(3193);
    },
    7054: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const path = __nccwpck_require__(6928);
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
        REPLACEMENTS: { "***": "*", "**/**": "**", "**/**/**": "**" },
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
        SEP: path.sep,
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
    4356: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const constants = __nccwpck_require__(7054);
      const utils = __nccwpck_require__(7910);
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
        const win32 = utils.isWindows(options);
        const PLATFORM_CHARS = constants.globChars(win32);
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
            prev.value += tok.value;
            prev.output = (prev.output || "") + tok.value;
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
              if (next === "<" && !utils.supportsLookbehinds()) {
                throw new Error(
                  "Node.js v10 or higher is required for regex lookbehinds",
                );
              }
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
        const win32 = utils.isWindows(options);
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
        } = constants.globChars(win32);
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
    3193: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const path = __nccwpck_require__(6928);
      const scan = __nccwpck_require__(5330);
      const parse = __nccwpck_require__(4356);
      const utils = __nccwpck_require__(7910);
      const constants = __nccwpck_require__(7054);
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
        const posix = utils.isWindows(options);
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
      picomatch.matchBase = (
        input,
        glob,
        options,
        posix = utils.isWindows(options),
      ) => {
        const regex =
          glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
        return regex.test(path.basename(input));
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
    5330: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const utils = __nccwpck_require__(7910);
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
      } = __nccwpck_require__(7054);
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
    7910: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      const path = __nccwpck_require__(6928);
      const win32 = process.platform === "win32";
      const {
        REGEX_BACKSLASH,
        REGEX_REMOVE_BACKSLASH,
        REGEX_SPECIAL_CHARS,
        REGEX_SPECIAL_CHARS_GLOBAL,
      } = __nccwpck_require__(7054);
      exports.isObject = (val) =>
        val !== null && typeof val === "object" && !Array.isArray(val);
      exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
      exports.isRegexChar = (str) =>
        str.length === 1 && exports.hasRegexChars(str);
      exports.escapeRegex = (str) =>
        str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
      exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
      exports.removeBackslashes = (str) =>
        str.replace(REGEX_REMOVE_BACKSLASH, (match) =>
          match === "\\" ? "" : match,
        );
      exports.supportsLookbehinds = () => {
        const segs = process.version.slice(1).split(".").map(Number);
        if (
          (segs.length === 3 && segs[0] >= 9) ||
          (segs[0] === 8 && segs[1] >= 10)
        ) {
          return true;
        }
        return false;
      };
      exports.isWindows = (options) => {
        if (options && typeof options.windows === "boolean") {
          return options.windows;
        }
        return win32 === true || path.sep === "\\";
      };
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
    },
    7866: (module) => {
      "use strict";
      module.exports = function required(port, protocol) {
        protocol = protocol.split(":")[0];
        port = +port;
        if (!port) return false;
        switch (protocol) {
          case "http":
          case "ws":
            return port !== 80;
          case "https":
          case "wss":
            return port !== 443;
          case "ftp":
            return port !== 21;
          case "gopher":
            return port !== 70;
          case "file":
            return false;
        }
        return port !== 0;
      };
    },
    743: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      /*!
       * to-regex-range <https://github.com/micromatch/to-regex-range>
       *
       * Copyright (c) 2015-present, Jon Schlinkert.
       * Released under the MIT License.
       */ const isNumber = __nccwpck_require__(952);
      const toRegexRange = (min, max, options) => {
        if (isNumber(min) === false) {
          throw new TypeError(
            "toRegexRange: expected the first argument to be a number",
          );
        }
        if (max === void 0 || min === max) {
          return String(min);
        }
        if (isNumber(max) === false) {
          throw new TypeError(
            "toRegexRange: expected the second argument to be a number.",
          );
        }
        let opts = { relaxZeros: true, ...options };
        if (typeof opts.strictZeros === "boolean") {
          opts.relaxZeros = opts.strictZeros === false;
        }
        let relax = String(opts.relaxZeros);
        let shorthand = String(opts.shorthand);
        let capture = String(opts.capture);
        let wrap = String(opts.wrap);
        let cacheKey =
          min + ":" + max + "=" + relax + shorthand + capture + wrap;
        if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
          return toRegexRange.cache[cacheKey].result;
        }
        let a = Math.min(min, max);
        let b = Math.max(min, max);
        if (Math.abs(a - b) === 1) {
          let result = min + "|" + max;
          if (opts.capture) {
            return `(${result})`;
          }
          if (opts.wrap === false) {
            return result;
          }
          return `(?:${result})`;
        }
        let isPadded = hasPadding(min) || hasPadding(max);
        let state = { min, max, a, b };
        let positives = [];
        let negatives = [];
        if (isPadded) {
          state.isPadded = isPadded;
          state.maxLen = String(state.max).length;
        }
        if (a < 0) {
          let newMin = b < 0 ? Math.abs(b) : 1;
          negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
          a = state.a = 0;
        }
        if (b >= 0) {
          positives = splitToPatterns(a, b, state, opts);
        }
        state.negatives = negatives;
        state.positives = positives;
        state.result = collatePatterns(negatives, positives, opts);
        if (opts.capture === true) {
          state.result = `(${state.result})`;
        } else if (
          opts.wrap !== false &&
          positives.length + negatives.length > 1
        ) {
          state.result = `(?:${state.result})`;
        }
        toRegexRange.cache[cacheKey] = state;
        return state.result;
      };
      function collatePatterns(neg, pos, options) {
        let onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
        let onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
        let intersected = filterPatterns(neg, pos, "-?", true, options) || [];
        let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
        return subpatterns.join("|");
      }
      function splitToRanges(min, max) {
        let nines = 1;
        let zeros = 1;
        let stop = countNines(min, nines);
        let stops = new Set([max]);
        while (min <= stop && stop <= max) {
          stops.add(stop);
          nines += 1;
          stop = countNines(min, nines);
        }
        stop = countZeros(max + 1, zeros) - 1;
        while (min < stop && stop <= max) {
          stops.add(stop);
          zeros += 1;
          stop = countZeros(max + 1, zeros) - 1;
        }
        stops = [...stops];
        stops.sort(compare);
        return stops;
      }
      function rangeToPattern(start, stop, options) {
        if (start === stop) {
          return { pattern: start, count: [], digits: 0 };
        }
        let zipped = zip(start, stop);
        let digits = zipped.length;
        let pattern = "";
        let count = 0;
        for (let i = 0; i < digits; i++) {
          let [startDigit, stopDigit] = zipped[i];
          if (startDigit === stopDigit) {
            pattern += startDigit;
          } else if (startDigit !== "0" || stopDigit !== "9") {
            pattern += toCharacterClass(startDigit, stopDigit, options);
          } else {
            count++;
          }
        }
        if (count) {
          pattern += options.shorthand === true ? "\\d" : "[0-9]";
        }
        return { pattern, count: [count], digits };
      }
      function splitToPatterns(min, max, tok, options) {
        let ranges = splitToRanges(min, max);
        let tokens = [];
        let start = min;
        let prev;
        for (let i = 0; i < ranges.length; i++) {
          let max = ranges[i];
          let obj = rangeToPattern(String(start), String(max), options);
          let zeros = "";
          if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
            if (prev.count.length > 1) {
              prev.count.pop();
            }
            prev.count.push(obj.count[0]);
            prev.string = prev.pattern + toQuantifier(prev.count);
            start = max + 1;
            continue;
          }
          if (tok.isPadded) {
            zeros = padZeros(max, tok, options);
          }
          obj.string = zeros + obj.pattern + toQuantifier(obj.count);
          tokens.push(obj);
          start = max + 1;
          prev = obj;
        }
        return tokens;
      }
      function filterPatterns(arr, comparison, prefix, intersection, options) {
        let result = [];
        for (let ele of arr) {
          let { string } = ele;
          if (!intersection && !contains(comparison, "string", string)) {
            result.push(prefix + string);
          }
          if (intersection && contains(comparison, "string", string)) {
            result.push(prefix + string);
          }
        }
        return result;
      }
      function zip(a, b) {
        let arr = [];
        for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
        return arr;
      }
      function compare(a, b) {
        return a > b ? 1 : b > a ? -1 : 0;
      }
      function contains(arr, key, val) {
        return arr.some((ele) => ele[key] === val);
      }
      function countNines(min, len) {
        return Number(String(min).slice(0, -len) + "9".repeat(len));
      }
      function countZeros(integer, zeros) {
        return integer - (integer % Math.pow(10, zeros));
      }
      function toQuantifier(digits) {
        let [start = 0, stop = ""] = digits;
        if (stop || start > 1) {
          return `{${start + (stop ? "," + stop : "")}}`;
        }
        return "";
      }
      function toCharacterClass(a, b, options) {
        return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
      }
      function hasPadding(str) {
        return /^-?(0+)\d/.test(str);
      }
      function padZeros(value, tok, options) {
        if (!tok.isPadded) {
          return value;
        }
        let diff = Math.abs(tok.maxLen - String(value).length);
        let relax = options.relaxZeros !== false;
        switch (diff) {
          case 0:
            return "";
          case 1:
            return relax ? "0?" : "0";
          case 2:
            return relax ? "0{0,2}" : "00";
          default: {
            return relax ? `0{0,${diff}}` : `0{${diff}}`;
          }
        }
      }
      toRegexRange.cache = {};
      toRegexRange.clearCache = () => (toRegexRange.cache = {});
      module.exports = toRegexRange;
    },
    2814: (module) => {
      module.exports = eval("require")("debug");
    },
    2613: (module) => {
      "use strict";
      module.exports = require("assert");
    },
    8611: (module) => {
      "use strict";
      module.exports = require("http");
    },
    5692: (module) => {
      "use strict";
      module.exports = require("https");
    },
    6928: (module) => {
      "use strict";
      module.exports = require("path");
    },
    3480: (module) => {
      "use strict";
      module.exports = require("querystring");
    },
    2203: (module) => {
      "use strict";
      module.exports = require("stream");
    },
    7016: (module) => {
      "use strict";
      module.exports = require("url");
    },
    9023: (module) => {
      "use strict";
      module.exports = require("util");
    },
    3106: (module) => {
      "use strict";
      module.exports = require("zlib");
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
    return module.exports;
  }
  if (typeof __nccwpck_require__ !== "undefined")
    __nccwpck_require__.ab = __dirname + "/";
  var __webpack_exports__ = __nccwpck_require__(7861);
  module.exports = __webpack_exports__;
})();
