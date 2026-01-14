(() => {
  var __webpack_modules__ = {
    821: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const WebSocket = __nccwpck_require__(234);
      WebSocket.createWebSocketStream = __nccwpck_require__(297);
      WebSocket.Server = __nccwpck_require__(788);
      WebSocket.Receiver = __nccwpck_require__(176);
      WebSocket.Sender = __nccwpck_require__(480);
      WebSocket.WebSocket = WebSocket;
      WebSocket.WebSocketServer = WebSocket.Server;
      module.exports = WebSocket;
    },
    72: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { EMPTY_BUFFER } = __nccwpck_require__(892);
      const FastBuffer = Buffer[Symbol.species];
      function concat(list, totalLength) {
        if (list.length === 0) return EMPTY_BUFFER;
        if (list.length === 1) return list[0];
        const target = Buffer.allocUnsafe(totalLength);
        let offset = 0;
        for (let i = 0; i < list.length; i++) {
          const buf = list[i];
          target.set(buf, offset);
          offset += buf.length;
        }
        if (offset < totalLength) {
          return new FastBuffer(target.buffer, target.byteOffset, offset);
        }
        return target;
      }
      function _mask(source, mask, output, offset, length) {
        for (let i = 0; i < length; i++) {
          output[offset + i] = source[i] ^ mask[i & 3];
        }
      }
      function _unmask(buffer, mask) {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] ^= mask[i & 3];
        }
      }
      function toArrayBuffer(buf) {
        if (buf.length === buf.buffer.byteLength) {
          return buf.buffer;
        }
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
      }
      function toBuffer(data) {
        toBuffer.readOnly = true;
        if (Buffer.isBuffer(data)) return data;
        let buf;
        if (data instanceof ArrayBuffer) {
          buf = new FastBuffer(data);
        } else if (ArrayBuffer.isView(data)) {
          buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
        } else {
          buf = Buffer.from(data);
          toBuffer.readOnly = false;
        }
        return buf;
      }
      module.exports = {
        concat,
        mask: _mask,
        toArrayBuffer,
        toBuffer,
        unmask: _unmask,
      };
      if (!process.env.WS_NO_BUFFER_UTIL) {
        try {
          const bufferUtil = __nccwpck_require__(431);
          module.exports.mask = function (
            source,
            mask,
            output,
            offset,
            length,
          ) {
            if (length < 48) _mask(source, mask, output, offset, length);
            else bufferUtil.mask(source, mask, output, offset, length);
          };
          module.exports.unmask = function (buffer, mask) {
            if (buffer.length < 32) _unmask(buffer, mask);
            else bufferUtil.unmask(buffer, mask);
          };
        } catch (e) {}
      }
    },
    892: (module) => {
      "use strict";
      const BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
      const hasBlob = typeof Blob !== "undefined";
      if (hasBlob) BINARY_TYPES.push("blob");
      module.exports = {
        BINARY_TYPES,
        EMPTY_BUFFER: Buffer.alloc(0),
        GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
        hasBlob,
        kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
        kListener: Symbol("kListener"),
        kStatusCode: Symbol("status-code"),
        kWebSocket: Symbol("websocket"),
        NOOP: () => {},
      };
    },
    95: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { kForOnEventAttribute, kListener } = __nccwpck_require__(892);
      const kCode = Symbol("kCode");
      const kData = Symbol("kData");
      const kError = Symbol("kError");
      const kMessage = Symbol("kMessage");
      const kReason = Symbol("kReason");
      const kTarget = Symbol("kTarget");
      const kType = Symbol("kType");
      const kWasClean = Symbol("kWasClean");
      class Event {
        constructor(type) {
          this[kTarget] = null;
          this[kType] = type;
        }
        get target() {
          return this[kTarget];
        }
        get type() {
          return this[kType];
        }
      }
      Object.defineProperty(Event.prototype, "target", { enumerable: true });
      Object.defineProperty(Event.prototype, "type", { enumerable: true });
      class CloseEvent extends Event {
        constructor(type, options = {}) {
          super(type);
          this[kCode] = options.code === undefined ? 0 : options.code;
          this[kReason] = options.reason === undefined ? "" : options.reason;
          this[kWasClean] =
            options.wasClean === undefined ? false : options.wasClean;
        }
        get code() {
          return this[kCode];
        }
        get reason() {
          return this[kReason];
        }
        get wasClean() {
          return this[kWasClean];
        }
      }
      Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
      Object.defineProperty(CloseEvent.prototype, "reason", {
        enumerable: true,
      });
      Object.defineProperty(CloseEvent.prototype, "wasClean", {
        enumerable: true,
      });
      class ErrorEvent extends Event {
        constructor(type, options = {}) {
          super(type);
          this[kError] = options.error === undefined ? null : options.error;
          this[kMessage] = options.message === undefined ? "" : options.message;
        }
        get error() {
          return this[kError];
        }
        get message() {
          return this[kMessage];
        }
      }
      Object.defineProperty(ErrorEvent.prototype, "error", {
        enumerable: true,
      });
      Object.defineProperty(ErrorEvent.prototype, "message", {
        enumerable: true,
      });
      class MessageEvent extends Event {
        constructor(type, options = {}) {
          super(type);
          this[kData] = options.data === undefined ? null : options.data;
        }
        get data() {
          return this[kData];
        }
      }
      Object.defineProperty(MessageEvent.prototype, "data", {
        enumerable: true,
      });
      const EventTarget = {
        addEventListener(type, handler, options = {}) {
          for (const listener of this.listeners(type)) {
            if (
              !options[kForOnEventAttribute] &&
              listener[kListener] === handler &&
              !listener[kForOnEventAttribute]
            ) {
              return;
            }
          }
          let wrapper;
          if (type === "message") {
            wrapper = function onMessage(data, isBinary) {
              const event = new MessageEvent("message", {
                data: isBinary ? data : data.toString(),
              });
              event[kTarget] = this;
              callListener(handler, this, event);
            };
          } else if (type === "close") {
            wrapper = function onClose(code, message) {
              const event = new CloseEvent("close", {
                code,
                reason: message.toString(),
                wasClean: this._closeFrameReceived && this._closeFrameSent,
              });
              event[kTarget] = this;
              callListener(handler, this, event);
            };
          } else if (type === "error") {
            wrapper = function onError(error) {
              const event = new ErrorEvent("error", {
                error,
                message: error.message,
              });
              event[kTarget] = this;
              callListener(handler, this, event);
            };
          } else if (type === "open") {
            wrapper = function onOpen() {
              const event = new Event("open");
              event[kTarget] = this;
              callListener(handler, this, event);
            };
          } else {
            return;
          }
          wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
          wrapper[kListener] = handler;
          if (options.once) {
            this.once(type, wrapper);
          } else {
            this.on(type, wrapper);
          }
        },
        removeEventListener(type, handler) {
          for (const listener of this.listeners(type)) {
            if (
              listener[kListener] === handler &&
              !listener[kForOnEventAttribute]
            ) {
              this.removeListener(type, listener);
              break;
            }
          }
        },
      };
      module.exports = {
        CloseEvent,
        ErrorEvent,
        Event,
        EventTarget,
        MessageEvent,
      };
      function callListener(listener, thisArg, event) {
        if (typeof listener === "object" && listener.handleEvent) {
          listener.handleEvent.call(listener, event);
        } else {
          listener.call(thisArg, event);
        }
      }
    },
    468: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { tokenChars } = __nccwpck_require__(342);
      function push(dest, name, elem) {
        if (dest[name] === undefined) dest[name] = [elem];
        else dest[name].push(elem);
      }
      function parse(header) {
        const offers = Object.create(null);
        let params = Object.create(null);
        let mustUnescape = false;
        let isEscaping = false;
        let inQuotes = false;
        let extensionName;
        let paramName;
        let start = -1;
        let code = -1;
        let end = -1;
        let i = 0;
        for (; i < header.length; i++) {
          code = header.charCodeAt(i);
          if (extensionName === undefined) {
            if (end === -1 && tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (i !== 0 && (code === 32 || code === 9)) {
              if (end === -1 && start !== -1) end = i;
            } else if (code === 59 || code === 44) {
              if (start === -1) {
                throw new SyntaxError(`Unexpected character at index ${i}`);
              }
              if (end === -1) end = i;
              const name = header.slice(start, end);
              if (code === 44) {
                push(offers, name, params);
                params = Object.create(null);
              } else {
                extensionName = name;
              }
              start = end = -1;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (paramName === undefined) {
            if (end === -1 && tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 32 || code === 9) {
              if (end === -1 && start !== -1) end = i;
            } else if (code === 59 || code === 44) {
              if (start === -1) {
                throw new SyntaxError(`Unexpected character at index ${i}`);
              }
              if (end === -1) end = i;
              push(params, header.slice(start, end), true);
              if (code === 44) {
                push(offers, extensionName, params);
                params = Object.create(null);
                extensionName = undefined;
              }
              start = end = -1;
            } else if (code === 61 && start !== -1 && end === -1) {
              paramName = header.slice(start, i);
              start = end = -1;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else {
            if (isEscaping) {
              if (tokenChars[code] !== 1) {
                throw new SyntaxError(`Unexpected character at index ${i}`);
              }
              if (start === -1) start = i;
              else if (!mustUnescape) mustUnescape = true;
              isEscaping = false;
            } else if (inQuotes) {
              if (tokenChars[code] === 1) {
                if (start === -1) start = i;
              } else if (code === 34 && start !== -1) {
                inQuotes = false;
                end = i;
              } else if (code === 92) {
                isEscaping = true;
              } else {
                throw new SyntaxError(`Unexpected character at index ${i}`);
              }
            } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
              inQuotes = true;
            } else if (end === -1 && tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (start !== -1 && (code === 32 || code === 9)) {
              if (end === -1) end = i;
            } else if (code === 59 || code === 44) {
              if (start === -1) {
                throw new SyntaxError(`Unexpected character at index ${i}`);
              }
              if (end === -1) end = i;
              let value = header.slice(start, end);
              if (mustUnescape) {
                value = value.replace(/\\/g, "");
                mustUnescape = false;
              }
              push(params, paramName, value);
              if (code === 44) {
                push(offers, extensionName, params);
                params = Object.create(null);
                extensionName = undefined;
              }
              paramName = undefined;
              start = end = -1;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          }
        }
        if (start === -1 || inQuotes || code === 32 || code === 9) {
          throw new SyntaxError("Unexpected end of input");
        }
        if (end === -1) end = i;
        const token = header.slice(start, end);
        if (extensionName === undefined) {
          push(offers, token, params);
        } else {
          if (paramName === undefined) {
            push(params, token, true);
          } else if (mustUnescape) {
            push(params, paramName, token.replace(/\\/g, ""));
          } else {
            push(params, paramName, token);
          }
          push(offers, extensionName, params);
        }
        return offers;
      }
      function format(extensions) {
        return Object.keys(extensions)
          .map((extension) => {
            let configurations = extensions[extension];
            if (!Array.isArray(configurations))
              configurations = [configurations];
            return configurations
              .map((params) =>
                [extension]
                  .concat(
                    Object.keys(params).map((k) => {
                      let values = params[k];
                      if (!Array.isArray(values)) values = [values];
                      return values
                        .map((v) => (v === true ? k : `${k}=${v}`))
                        .join("; ");
                    }),
                  )
                  .join("; "),
              )
              .join(", ");
          })
          .join(", ");
      }
      module.exports = { format, parse };
    },
    137: (module) => {
      "use strict";
      const kDone = Symbol("kDone");
      const kRun = Symbol("kRun");
      class Limiter {
        constructor(concurrency) {
          this[kDone] = () => {
            this.pending--;
            this[kRun]();
          };
          this.concurrency = concurrency || Infinity;
          this.jobs = [];
          this.pending = 0;
        }
        add(job) {
          this.jobs.push(job);
          this[kRun]();
        }
        [kRun]() {
          if (this.pending === this.concurrency) return;
          if (this.jobs.length) {
            const job = this.jobs.shift();
            this.pending++;
            job(this[kDone]);
          }
        }
      }
      module.exports = Limiter;
    },
    465: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const zlib = __nccwpck_require__(106);
      const bufferUtil = __nccwpck_require__(72);
      const Limiter = __nccwpck_require__(137);
      const { kStatusCode } = __nccwpck_require__(892);
      const FastBuffer = Buffer[Symbol.species];
      const TRAILER = Buffer.from([0, 0, 255, 255]);
      const kPerMessageDeflate = Symbol("permessage-deflate");
      const kTotalLength = Symbol("total-length");
      const kCallback = Symbol("callback");
      const kBuffers = Symbol("buffers");
      const kError = Symbol("error");
      let zlibLimiter;
      class PerMessageDeflate {
        constructor(options, isServer, maxPayload) {
          this._maxPayload = maxPayload | 0;
          this._options = options || {};
          this._threshold =
            this._options.threshold !== undefined
              ? this._options.threshold
              : 1024;
          this._isServer = !!isServer;
          this._deflate = null;
          this._inflate = null;
          this.params = null;
          if (!zlibLimiter) {
            const concurrency =
              this._options.concurrencyLimit !== undefined
                ? this._options.concurrencyLimit
                : 10;
            zlibLimiter = new Limiter(concurrency);
          }
        }
        static get extensionName() {
          return "permessage-deflate";
        }
        offer() {
          const params = {};
          if (this._options.serverNoContextTakeover) {
            params.server_no_context_takeover = true;
          }
          if (this._options.clientNoContextTakeover) {
            params.client_no_context_takeover = true;
          }
          if (this._options.serverMaxWindowBits) {
            params.server_max_window_bits = this._options.serverMaxWindowBits;
          }
          if (this._options.clientMaxWindowBits) {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          } else if (this._options.clientMaxWindowBits == null) {
            params.client_max_window_bits = true;
          }
          return params;
        }
        accept(configurations) {
          configurations = this.normalizeParams(configurations);
          this.params = this._isServer
            ? this.acceptAsServer(configurations)
            : this.acceptAsClient(configurations);
          return this.params;
        }
        cleanup() {
          if (this._inflate) {
            this._inflate.close();
            this._inflate = null;
          }
          if (this._deflate) {
            const callback = this._deflate[kCallback];
            this._deflate.close();
            this._deflate = null;
            if (callback) {
              callback(
                new Error(
                  "The deflate stream was closed while data was being processed",
                ),
              );
            }
          }
        }
        acceptAsServer(offers) {
          const opts = this._options;
          const accepted = offers.find((params) => {
            if (
              (opts.serverNoContextTakeover === false &&
                params.server_no_context_takeover) ||
              (params.server_max_window_bits &&
                (opts.serverMaxWindowBits === false ||
                  (typeof opts.serverMaxWindowBits === "number" &&
                    opts.serverMaxWindowBits >
                      params.server_max_window_bits))) ||
              (typeof opts.clientMaxWindowBits === "number" &&
                !params.client_max_window_bits)
            ) {
              return false;
            }
            return true;
          });
          if (!accepted) {
            throw new Error("None of the extension offers can be accepted");
          }
          if (opts.serverNoContextTakeover) {
            accepted.server_no_context_takeover = true;
          }
          if (opts.clientNoContextTakeover) {
            accepted.client_no_context_takeover = true;
          }
          if (typeof opts.serverMaxWindowBits === "number") {
            accepted.server_max_window_bits = opts.serverMaxWindowBits;
          }
          if (typeof opts.clientMaxWindowBits === "number") {
            accepted.client_max_window_bits = opts.clientMaxWindowBits;
          } else if (
            accepted.client_max_window_bits === true ||
            opts.clientMaxWindowBits === false
          ) {
            delete accepted.client_max_window_bits;
          }
          return accepted;
        }
        acceptAsClient(response) {
          const params = response[0];
          if (
            this._options.clientNoContextTakeover === false &&
            params.client_no_context_takeover
          ) {
            throw new Error(
              'Unexpected parameter "client_no_context_takeover"',
            );
          }
          if (!params.client_max_window_bits) {
            if (typeof this._options.clientMaxWindowBits === "number") {
              params.client_max_window_bits = this._options.clientMaxWindowBits;
            }
          } else if (
            this._options.clientMaxWindowBits === false ||
            (typeof this._options.clientMaxWindowBits === "number" &&
              params.client_max_window_bits > this._options.clientMaxWindowBits)
          ) {
            throw new Error(
              'Unexpected or invalid parameter "client_max_window_bits"',
            );
          }
          return params;
        }
        normalizeParams(configurations) {
          configurations.forEach((params) => {
            Object.keys(params).forEach((key) => {
              let value = params[key];
              if (value.length > 1) {
                throw new Error(
                  `Parameter "${key}" must have only a single value`,
                );
              }
              value = value[0];
              if (key === "client_max_window_bits") {
                if (value !== true) {
                  const num = +value;
                  if (!Number.isInteger(num) || num < 8 || num > 15) {
                    throw new TypeError(
                      `Invalid value for parameter "${key}": ${value}`,
                    );
                  }
                  value = num;
                } else if (!this._isServer) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`,
                  );
                }
              } else if (key === "server_max_window_bits") {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`,
                  );
                }
                value = num;
              } else if (
                key === "client_no_context_takeover" ||
                key === "server_no_context_takeover"
              ) {
                if (value !== true) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`,
                  );
                }
              } else {
                throw new Error(`Unknown parameter "${key}"`);
              }
              params[key] = value;
            });
          });
          return configurations;
        }
        decompress(data, fin, callback) {
          zlibLimiter.add((done) => {
            this._decompress(data, fin, (err, result) => {
              done();
              callback(err, result);
            });
          });
        }
        compress(data, fin, callback) {
          zlibLimiter.add((done) => {
            this._compress(data, fin, (err, result) => {
              done();
              callback(err, result);
            });
          });
        }
        _decompress(data, fin, callback) {
          const endpoint = this._isServer ? "client" : "server";
          if (!this._inflate) {
            const key = `${endpoint}_max_window_bits`;
            const windowBits =
              typeof this.params[key] !== "number"
                ? zlib.Z_DEFAULT_WINDOWBITS
                : this.params[key];
            this._inflate = zlib.createInflateRaw({
              ...this._options.zlibInflateOptions,
              windowBits,
            });
            this._inflate[kPerMessageDeflate] = this;
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            this._inflate.on("error", inflateOnError);
            this._inflate.on("data", inflateOnData);
          }
          this._inflate[kCallback] = callback;
          this._inflate.write(data);
          if (fin) this._inflate.write(TRAILER);
          this._inflate.flush(() => {
            const err = this._inflate[kError];
            if (err) {
              this._inflate.close();
              this._inflate = null;
              callback(err);
              return;
            }
            const data = bufferUtil.concat(
              this._inflate[kBuffers],
              this._inflate[kTotalLength],
            );
            if (this._inflate._readableState.endEmitted) {
              this._inflate.close();
              this._inflate = null;
            } else {
              this._inflate[kTotalLength] = 0;
              this._inflate[kBuffers] = [];
              if (fin && this.params[`${endpoint}_no_context_takeover`]) {
                this._inflate.reset();
              }
            }
            callback(null, data);
          });
        }
        _compress(data, fin, callback) {
          const endpoint = this._isServer ? "server" : "client";
          if (!this._deflate) {
            const key = `${endpoint}_max_window_bits`;
            const windowBits =
              typeof this.params[key] !== "number"
                ? zlib.Z_DEFAULT_WINDOWBITS
                : this.params[key];
            this._deflate = zlib.createDeflateRaw({
              ...this._options.zlibDeflateOptions,
              windowBits,
            });
            this._deflate[kTotalLength] = 0;
            this._deflate[kBuffers] = [];
            this._deflate.on("data", deflateOnData);
          }
          this._deflate[kCallback] = callback;
          this._deflate.write(data);
          this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
            if (!this._deflate) {
              return;
            }
            let data = bufferUtil.concat(
              this._deflate[kBuffers],
              this._deflate[kTotalLength],
            );
            if (fin) {
              data = new FastBuffer(
                data.buffer,
                data.byteOffset,
                data.length - 4,
              );
            }
            this._deflate[kCallback] = null;
            this._deflate[kTotalLength] = 0;
            this._deflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._deflate.reset();
            }
            callback(null, data);
          });
        }
      }
      module.exports = PerMessageDeflate;
      function deflateOnData(chunk) {
        this[kBuffers].push(chunk);
        this[kTotalLength] += chunk.length;
      }
      function inflateOnData(chunk) {
        this[kTotalLength] += chunk.length;
        if (
          this[kPerMessageDeflate]._maxPayload < 1 ||
          this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
        ) {
          this[kBuffers].push(chunk);
          return;
        }
        this[kError] = new RangeError("Max payload size exceeded");
        this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
        this[kError][kStatusCode] = 1009;
        this.removeListener("data", inflateOnData);
        this.reset();
      }
      function inflateOnError(err) {
        this[kPerMessageDeflate]._inflate = null;
        if (this[kError]) {
          this[kCallback](this[kError]);
          return;
        }
        err[kStatusCode] = 1007;
        this[kCallback](err);
      }
    },
    176: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { Writable } = __nccwpck_require__(203);
      const PerMessageDeflate = __nccwpck_require__(465);
      const { BINARY_TYPES, EMPTY_BUFFER, kStatusCode, kWebSocket } =
        __nccwpck_require__(892);
      const { concat, toArrayBuffer, unmask } = __nccwpck_require__(72);
      const { isValidStatusCode, isValidUTF8 } = __nccwpck_require__(342);
      const FastBuffer = Buffer[Symbol.species];
      const GET_INFO = 0;
      const GET_PAYLOAD_LENGTH_16 = 1;
      const GET_PAYLOAD_LENGTH_64 = 2;
      const GET_MASK = 3;
      const GET_DATA = 4;
      const INFLATING = 5;
      const DEFER_EVENT = 6;
      class Receiver extends Writable {
        constructor(options = {}) {
          super();
          this._allowSynchronousEvents =
            options.allowSynchronousEvents !== undefined
              ? options.allowSynchronousEvents
              : true;
          this._binaryType = options.binaryType || BINARY_TYPES[0];
          this._extensions = options.extensions || {};
          this._isServer = !!options.isServer;
          this._maxPayload = options.maxPayload | 0;
          this._skipUTF8Validation = !!options.skipUTF8Validation;
          this[kWebSocket] = undefined;
          this._bufferedBytes = 0;
          this._buffers = [];
          this._compressed = false;
          this._payloadLength = 0;
          this._mask = undefined;
          this._fragmented = 0;
          this._masked = false;
          this._fin = false;
          this._opcode = 0;
          this._totalPayloadLength = 0;
          this._messageLength = 0;
          this._fragments = [];
          this._errored = false;
          this._loop = false;
          this._state = GET_INFO;
        }
        _write(chunk, encoding, cb) {
          if (this._opcode === 8 && this._state == GET_INFO) return cb();
          this._bufferedBytes += chunk.length;
          this._buffers.push(chunk);
          this.startLoop(cb);
        }
        consume(n) {
          this._bufferedBytes -= n;
          if (n === this._buffers[0].length) return this._buffers.shift();
          if (n < this._buffers[0].length) {
            const buf = this._buffers[0];
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n,
            );
            return new FastBuffer(buf.buffer, buf.byteOffset, n);
          }
          const dst = Buffer.allocUnsafe(n);
          do {
            const buf = this._buffers[0];
            const offset = dst.length - n;
            if (n >= buf.length) {
              dst.set(this._buffers.shift(), offset);
            } else {
              dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
              this._buffers[0] = new FastBuffer(
                buf.buffer,
                buf.byteOffset + n,
                buf.length - n,
              );
            }
            n -= buf.length;
          } while (n > 0);
          return dst;
        }
        startLoop(cb) {
          this._loop = true;
          do {
            switch (this._state) {
              case GET_INFO:
                this.getInfo(cb);
                break;
              case GET_PAYLOAD_LENGTH_16:
                this.getPayloadLength16(cb);
                break;
              case GET_PAYLOAD_LENGTH_64:
                this.getPayloadLength64(cb);
                break;
              case GET_MASK:
                this.getMask();
                break;
              case GET_DATA:
                this.getData(cb);
                break;
              case INFLATING:
              case DEFER_EVENT:
                this._loop = false;
                return;
            }
          } while (this._loop);
          if (!this._errored) cb();
        }
        getInfo(cb) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          const buf = this.consume(2);
          if ((buf[0] & 48) !== 0) {
            const error = this.createError(
              RangeError,
              "RSV2 and RSV3 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_2_3",
            );
            cb(error);
            return;
          }
          const compressed = (buf[0] & 64) === 64;
          if (
            compressed &&
            !this._extensions[PerMessageDeflate.extensionName]
          ) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1",
            );
            cb(error);
            return;
          }
          this._fin = (buf[0] & 128) === 128;
          this._opcode = buf[0] & 15;
          this._payloadLength = buf[1] & 127;
          if (this._opcode === 0) {
            if (compressed) {
              const error = this.createError(
                RangeError,
                "RSV1 must be clear",
                true,
                1002,
                "WS_ERR_UNEXPECTED_RSV_1",
              );
              cb(error);
              return;
            }
            if (!this._fragmented) {
              const error = this.createError(
                RangeError,
                "invalid opcode 0",
                true,
                1002,
                "WS_ERR_INVALID_OPCODE",
              );
              cb(error);
              return;
            }
            this._opcode = this._fragmented;
          } else if (this._opcode === 1 || this._opcode === 2) {
            if (this._fragmented) {
              const error = this.createError(
                RangeError,
                `invalid opcode ${this._opcode}`,
                true,
                1002,
                "WS_ERR_INVALID_OPCODE",
              );
              cb(error);
              return;
            }
            this._compressed = compressed;
          } else if (this._opcode > 7 && this._opcode < 11) {
            if (!this._fin) {
              const error = this.createError(
                RangeError,
                "FIN must be set",
                true,
                1002,
                "WS_ERR_EXPECTED_FIN",
              );
              cb(error);
              return;
            }
            if (compressed) {
              const error = this.createError(
                RangeError,
                "RSV1 must be clear",
                true,
                1002,
                "WS_ERR_UNEXPECTED_RSV_1",
              );
              cb(error);
              return;
            }
            if (
              this._payloadLength > 125 ||
              (this._opcode === 8 && this._payloadLength === 1)
            ) {
              const error = this.createError(
                RangeError,
                `invalid payload length ${this._payloadLength}`,
                true,
                1002,
                "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH",
              );
              cb(error);
              return;
            }
          } else {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE",
            );
            cb(error);
            return;
          }
          if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
          this._masked = (buf[1] & 128) === 128;
          if (this._isServer) {
            if (!this._masked) {
              const error = this.createError(
                RangeError,
                "MASK must be set",
                true,
                1002,
                "WS_ERR_EXPECTED_MASK",
              );
              cb(error);
              return;
            }
          } else if (this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_MASK",
            );
            cb(error);
            return;
          }
          if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
          else if (this._payloadLength === 127)
            this._state = GET_PAYLOAD_LENGTH_64;
          else this.haveLength(cb);
        }
        getPayloadLength16(cb) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          this._payloadLength = this.consume(2).readUInt16BE(0);
          this.haveLength(cb);
        }
        getPayloadLength64(cb) {
          if (this._bufferedBytes < 8) {
            this._loop = false;
            return;
          }
          const buf = this.consume(8);
          const num = buf.readUInt32BE(0);
          if (num > Math.pow(2, 53 - 32) - 1) {
            const error = this.createError(
              RangeError,
              "Unsupported WebSocket frame: payload length > 2^53 - 1",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH",
            );
            cb(error);
            return;
          }
          this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
          this.haveLength(cb);
        }
        haveLength(cb) {
          if (this._payloadLength && this._opcode < 8) {
            this._totalPayloadLength += this._payloadLength;
            if (
              this._totalPayloadLength > this._maxPayload &&
              this._maxPayload > 0
            ) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",
              );
              cb(error);
              return;
            }
          }
          if (this._masked) this._state = GET_MASK;
          else this._state = GET_DATA;
        }
        getMask() {
          if (this._bufferedBytes < 4) {
            this._loop = false;
            return;
          }
          this._mask = this.consume(4);
          this._state = GET_DATA;
        }
        getData(cb) {
          let data = EMPTY_BUFFER;
          if (this._payloadLength) {
            if (this._bufferedBytes < this._payloadLength) {
              this._loop = false;
              return;
            }
            data = this.consume(this._payloadLength);
            if (
              this._masked &&
              (this._mask[0] |
                this._mask[1] |
                this._mask[2] |
                this._mask[3]) !==
                0
            ) {
              unmask(data, this._mask);
            }
          }
          if (this._opcode > 7) {
            this.controlMessage(data, cb);
            return;
          }
          if (this._compressed) {
            this._state = INFLATING;
            this.decompress(data, cb);
            return;
          }
          if (data.length) {
            this._messageLength = this._totalPayloadLength;
            this._fragments.push(data);
          }
          this.dataMessage(cb);
        }
        decompress(data, cb) {
          const perMessageDeflate =
            this._extensions[PerMessageDeflate.extensionName];
          perMessageDeflate.decompress(data, this._fin, (err, buf) => {
            if (err) return cb(err);
            if (buf.length) {
              this._messageLength += buf.length;
              if (
                this._messageLength > this._maxPayload &&
                this._maxPayload > 0
              ) {
                const error = this.createError(
                  RangeError,
                  "Max payload size exceeded",
                  false,
                  1009,
                  "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",
                );
                cb(error);
                return;
              }
              this._fragments.push(buf);
            }
            this.dataMessage(cb);
            if (this._state === GET_INFO) this.startLoop(cb);
          });
        }
        dataMessage(cb) {
          if (!this._fin) {
            this._state = GET_INFO;
            return;
          }
          const messageLength = this._messageLength;
          const fragments = this._fragments;
          this._totalPayloadLength = 0;
          this._messageLength = 0;
          this._fragmented = 0;
          this._fragments = [];
          if (this._opcode === 2) {
            let data;
            if (this._binaryType === "nodebuffer") {
              data = concat(fragments, messageLength);
            } else if (this._binaryType === "arraybuffer") {
              data = toArrayBuffer(concat(fragments, messageLength));
            } else if (this._binaryType === "blob") {
              data = new Blob(fragments);
            } else {
              data = fragments;
            }
            if (this._allowSynchronousEvents) {
              this.emit("message", data, true);
              this._state = GET_INFO;
            } else {
              this._state = DEFER_EVENT;
              setImmediate(() => {
                this.emit("message", data, true);
                this._state = GET_INFO;
                this.startLoop(cb);
              });
            }
          } else {
            const buf = concat(fragments, messageLength);
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8",
              );
              cb(error);
              return;
            }
            if (this._state === INFLATING || this._allowSynchronousEvents) {
              this.emit("message", buf, false);
              this._state = GET_INFO;
            } else {
              this._state = DEFER_EVENT;
              setImmediate(() => {
                this.emit("message", buf, false);
                this._state = GET_INFO;
                this.startLoop(cb);
              });
            }
          }
        }
        controlMessage(data, cb) {
          if (this._opcode === 8) {
            if (data.length === 0) {
              this._loop = false;
              this.emit("conclude", 1005, EMPTY_BUFFER);
              this.end();
            } else {
              const code = data.readUInt16BE(0);
              if (!isValidStatusCode(code)) {
                const error = this.createError(
                  RangeError,
                  `invalid status code ${code}`,
                  true,
                  1002,
                  "WS_ERR_INVALID_CLOSE_CODE",
                );
                cb(error);
                return;
              }
              const buf = new FastBuffer(
                data.buffer,
                data.byteOffset + 2,
                data.length - 2,
              );
              if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
                const error = this.createError(
                  Error,
                  "invalid UTF-8 sequence",
                  true,
                  1007,
                  "WS_ERR_INVALID_UTF8",
                );
                cb(error);
                return;
              }
              this._loop = false;
              this.emit("conclude", code, buf);
              this.end();
            }
            this._state = GET_INFO;
            return;
          }
          if (this._allowSynchronousEvents) {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit(this._opcode === 9 ? "ping" : "pong", data);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
        createError(ErrorCtor, message, prefix, statusCode, errorCode) {
          this._loop = false;
          this._errored = true;
          const err = new ErrorCtor(
            prefix ? `Invalid WebSocket frame: ${message}` : message,
          );
          Error.captureStackTrace(err, this.createError);
          err.code = errorCode;
          err[kStatusCode] = statusCode;
          return err;
        }
      }
      module.exports = Receiver;
    },
    480: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { Duplex } = __nccwpck_require__(203);
      const { randomFillSync } = __nccwpck_require__(982);
      const PerMessageDeflate = __nccwpck_require__(465);
      const { EMPTY_BUFFER, kWebSocket, NOOP } = __nccwpck_require__(892);
      const { isBlob, isValidStatusCode } = __nccwpck_require__(342);
      const { mask: applyMask, toBuffer } = __nccwpck_require__(72);
      const kByteLength = Symbol("kByteLength");
      const maskBuffer = Buffer.alloc(4);
      const RANDOM_POOL_SIZE = 8 * 1024;
      let randomPool;
      let randomPoolPointer = RANDOM_POOL_SIZE;
      const DEFAULT = 0;
      const DEFLATING = 1;
      const GET_BLOB_DATA = 2;
      class Sender {
        constructor(socket, extensions, generateMask) {
          this._extensions = extensions || {};
          if (generateMask) {
            this._generateMask = generateMask;
            this._maskBuffer = Buffer.alloc(4);
          }
          this._socket = socket;
          this._firstFragment = true;
          this._compress = false;
          this._bufferedBytes = 0;
          this._queue = [];
          this._state = DEFAULT;
          this.onerror = NOOP;
          this[kWebSocket] = undefined;
        }
        static frame(data, options) {
          let mask;
          let merge = false;
          let offset = 2;
          let skipMasking = false;
          if (options.mask) {
            mask = options.maskBuffer || maskBuffer;
            if (options.generateMask) {
              options.generateMask(mask);
            } else {
              if (randomPoolPointer === RANDOM_POOL_SIZE) {
                if (randomPool === undefined) {
                  randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
                }
                randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
                randomPoolPointer = 0;
              }
              mask[0] = randomPool[randomPoolPointer++];
              mask[1] = randomPool[randomPoolPointer++];
              mask[2] = randomPool[randomPoolPointer++];
              mask[3] = randomPool[randomPoolPointer++];
            }
            skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
            offset = 6;
          }
          let dataLength;
          if (typeof data === "string") {
            if (
              (!options.mask || skipMasking) &&
              options[kByteLength] !== undefined
            ) {
              dataLength = options[kByteLength];
            } else {
              data = Buffer.from(data);
              dataLength = data.length;
            }
          } else {
            dataLength = data.length;
            merge = options.mask && options.readOnly && !skipMasking;
          }
          let payloadLength = dataLength;
          if (dataLength >= 65536) {
            offset += 8;
            payloadLength = 127;
          } else if (dataLength > 125) {
            offset += 2;
            payloadLength = 126;
          }
          const target = Buffer.allocUnsafe(
            merge ? dataLength + offset : offset,
          );
          target[0] = options.fin ? options.opcode | 128 : options.opcode;
          if (options.rsv1) target[0] |= 64;
          target[1] = payloadLength;
          if (payloadLength === 126) {
            target.writeUInt16BE(dataLength, 2);
          } else if (payloadLength === 127) {
            target[2] = target[3] = 0;
            target.writeUIntBE(dataLength, 4, 6);
          }
          if (!options.mask) return [target, data];
          target[1] |= 128;
          target[offset - 4] = mask[0];
          target[offset - 3] = mask[1];
          target[offset - 2] = mask[2];
          target[offset - 1] = mask[3];
          if (skipMasking) return [target, data];
          if (merge) {
            applyMask(data, mask, target, offset, dataLength);
            return [target];
          }
          applyMask(data, mask, data, 0, dataLength);
          return [target, data];
        }
        close(code, data, mask, cb) {
          let buf;
          if (code === undefined) {
            buf = EMPTY_BUFFER;
          } else if (typeof code !== "number" || !isValidStatusCode(code)) {
            throw new TypeError(
              "First argument must be a valid error code number",
            );
          } else if (data === undefined || !data.length) {
            buf = Buffer.allocUnsafe(2);
            buf.writeUInt16BE(code, 0);
          } else {
            const length = Buffer.byteLength(data);
            if (length > 123) {
              throw new RangeError(
                "The message must not be greater than 123 bytes",
              );
            }
            buf = Buffer.allocUnsafe(2 + length);
            buf.writeUInt16BE(code, 0);
            if (typeof data === "string") {
              buf.write(data, 2);
            } else {
              buf.set(data, 2);
            }
          }
          const options = {
            [kByteLength]: buf.length,
            fin: true,
            generateMask: this._generateMask,
            mask,
            maskBuffer: this._maskBuffer,
            opcode: 8,
            readOnly: false,
            rsv1: false,
          };
          if (this._state !== DEFAULT) {
            this.enqueue([this.dispatch, buf, false, options, cb]);
          } else {
            this.sendFrame(Sender.frame(buf, options), cb);
          }
        }
        ping(data, mask, cb) {
          let byteLength;
          let readOnly;
          if (typeof data === "string") {
            byteLength = Buffer.byteLength(data);
            readOnly = false;
          } else if (isBlob(data)) {
            byteLength = data.size;
            readOnly = false;
          } else {
            data = toBuffer(data);
            byteLength = data.length;
            readOnly = toBuffer.readOnly;
          }
          if (byteLength > 125) {
            throw new RangeError(
              "The data size must not be greater than 125 bytes",
            );
          }
          const options = {
            [kByteLength]: byteLength,
            fin: true,
            generateMask: this._generateMask,
            mask,
            maskBuffer: this._maskBuffer,
            opcode: 9,
            readOnly,
            rsv1: false,
          };
          if (isBlob(data)) {
            if (this._state !== DEFAULT) {
              this.enqueue([this.getBlobData, data, false, options, cb]);
            } else {
              this.getBlobData(data, false, options, cb);
            }
          } else if (this._state !== DEFAULT) {
            this.enqueue([this.dispatch, data, false, options, cb]);
          } else {
            this.sendFrame(Sender.frame(data, options), cb);
          }
        }
        pong(data, mask, cb) {
          let byteLength;
          let readOnly;
          if (typeof data === "string") {
            byteLength = Buffer.byteLength(data);
            readOnly = false;
          } else if (isBlob(data)) {
            byteLength = data.size;
            readOnly = false;
          } else {
            data = toBuffer(data);
            byteLength = data.length;
            readOnly = toBuffer.readOnly;
          }
          if (byteLength > 125) {
            throw new RangeError(
              "The data size must not be greater than 125 bytes",
            );
          }
          const options = {
            [kByteLength]: byteLength,
            fin: true,
            generateMask: this._generateMask,
            mask,
            maskBuffer: this._maskBuffer,
            opcode: 10,
            readOnly,
            rsv1: false,
          };
          if (isBlob(data)) {
            if (this._state !== DEFAULT) {
              this.enqueue([this.getBlobData, data, false, options, cb]);
            } else {
              this.getBlobData(data, false, options, cb);
            }
          } else if (this._state !== DEFAULT) {
            this.enqueue([this.dispatch, data, false, options, cb]);
          } else {
            this.sendFrame(Sender.frame(data, options), cb);
          }
        }
        send(data, options, cb) {
          const perMessageDeflate =
            this._extensions[PerMessageDeflate.extensionName];
          let opcode = options.binary ? 2 : 1;
          let rsv1 = options.compress;
          let byteLength;
          let readOnly;
          if (typeof data === "string") {
            byteLength = Buffer.byteLength(data);
            readOnly = false;
          } else if (isBlob(data)) {
            byteLength = data.size;
            readOnly = false;
          } else {
            data = toBuffer(data);
            byteLength = data.length;
            readOnly = toBuffer.readOnly;
          }
          if (this._firstFragment) {
            this._firstFragment = false;
            if (
              rsv1 &&
              perMessageDeflate &&
              perMessageDeflate.params[
                perMessageDeflate._isServer
                  ? "server_no_context_takeover"
                  : "client_no_context_takeover"
              ]
            ) {
              rsv1 = byteLength >= perMessageDeflate._threshold;
            }
            this._compress = rsv1;
          } else {
            rsv1 = false;
            opcode = 0;
          }
          if (options.fin) this._firstFragment = true;
          const opts = {
            [kByteLength]: byteLength,
            fin: options.fin,
            generateMask: this._generateMask,
            mask: options.mask,
            maskBuffer: this._maskBuffer,
            opcode,
            readOnly,
            rsv1,
          };
          if (isBlob(data)) {
            if (this._state !== DEFAULT) {
              this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
            } else {
              this.getBlobData(data, this._compress, opts, cb);
            }
          } else if (this._state !== DEFAULT) {
            this.enqueue([this.dispatch, data, this._compress, opts, cb]);
          } else {
            this.dispatch(data, this._compress, opts, cb);
          }
        }
        getBlobData(blob, compress, options, cb) {
          this._bufferedBytes += options[kByteLength];
          this._state = GET_BLOB_DATA;
          blob
            .arrayBuffer()
            .then((arrayBuffer) => {
              if (this._socket.destroyed) {
                const err = new Error(
                  "The socket was closed while the blob was being read",
                );
                process.nextTick(callCallbacks, this, err, cb);
                return;
              }
              this._bufferedBytes -= options[kByteLength];
              const data = toBuffer(arrayBuffer);
              if (!compress) {
                this._state = DEFAULT;
                this.sendFrame(Sender.frame(data, options), cb);
                this.dequeue();
              } else {
                this.dispatch(data, compress, options, cb);
              }
            })
            .catch((err) => {
              process.nextTick(onError, this, err, cb);
            });
        }
        dispatch(data, compress, options, cb) {
          if (!compress) {
            this.sendFrame(Sender.frame(data, options), cb);
            return;
          }
          const perMessageDeflate =
            this._extensions[PerMessageDeflate.extensionName];
          this._bufferedBytes += options[kByteLength];
          this._state = DEFLATING;
          perMessageDeflate.compress(data, options.fin, (_, buf) => {
            if (this._socket.destroyed) {
              const err = new Error(
                "The socket was closed while data was being compressed",
              );
              callCallbacks(this, err, cb);
              return;
            }
            this._bufferedBytes -= options[kByteLength];
            this._state = DEFAULT;
            options.readOnly = false;
            this.sendFrame(Sender.frame(buf, options), cb);
            this.dequeue();
          });
        }
        dequeue() {
          while (this._state === DEFAULT && this._queue.length) {
            const params = this._queue.shift();
            this._bufferedBytes -= params[3][kByteLength];
            Reflect.apply(params[0], this, params.slice(1));
          }
        }
        enqueue(params) {
          this._bufferedBytes += params[3][kByteLength];
          this._queue.push(params);
        }
        sendFrame(list, cb) {
          if (list.length === 2) {
            this._socket.cork();
            this._socket.write(list[0]);
            this._socket.write(list[1], cb);
            this._socket.uncork();
          } else {
            this._socket.write(list[0], cb);
          }
        }
      }
      module.exports = Sender;
      function callCallbacks(sender, err, cb) {
        if (typeof cb === "function") cb(err);
        for (let i = 0; i < sender._queue.length; i++) {
          const params = sender._queue[i];
          const callback = params[params.length - 1];
          if (typeof callback === "function") callback(err);
        }
      }
      function onError(sender, err, cb) {
        callCallbacks(sender, err, cb);
        sender.onerror(err);
      }
    },
    297: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const WebSocket = __nccwpck_require__(234);
      const { Duplex } = __nccwpck_require__(203);
      function emitClose(stream) {
        stream.emit("close");
      }
      function duplexOnEnd() {
        if (!this.destroyed && this._writableState.finished) {
          this.destroy();
        }
      }
      function duplexOnError(err) {
        this.removeListener("error", duplexOnError);
        this.destroy();
        if (this.listenerCount("error") === 0) {
          this.emit("error", err);
        }
      }
      function createWebSocketStream(ws, options) {
        let terminateOnDestroy = true;
        const duplex = new Duplex({
          ...options,
          autoDestroy: false,
          emitClose: false,
          objectMode: false,
          writableObjectMode: false,
        });
        ws.on("message", function message(msg, isBinary) {
          const data =
            !isBinary && duplex._readableState.objectMode
              ? msg.toString()
              : msg;
          if (!duplex.push(data)) ws.pause();
        });
        ws.once("error", function error(err) {
          if (duplex.destroyed) return;
          terminateOnDestroy = false;
          duplex.destroy(err);
        });
        ws.once("close", function close() {
          if (duplex.destroyed) return;
          duplex.push(null);
        });
        duplex._destroy = function (err, callback) {
          if (ws.readyState === ws.CLOSED) {
            callback(err);
            process.nextTick(emitClose, duplex);
            return;
          }
          let called = false;
          ws.once("error", function error(err) {
            called = true;
            callback(err);
          });
          ws.once("close", function close() {
            if (!called) callback(err);
            process.nextTick(emitClose, duplex);
          });
          if (terminateOnDestroy) ws.terminate();
        };
        duplex._final = function (callback) {
          if (ws.readyState === ws.CONNECTING) {
            ws.once("open", function open() {
              duplex._final(callback);
            });
            return;
          }
          if (ws._socket === null) return;
          if (ws._socket._writableState.finished) {
            callback();
            if (duplex._readableState.endEmitted) duplex.destroy();
          } else {
            ws._socket.once("finish", function finish() {
              callback();
            });
            ws.close();
          }
        };
        duplex._read = function () {
          if (ws.isPaused) ws.resume();
        };
        duplex._write = function (chunk, encoding, callback) {
          if (ws.readyState === ws.CONNECTING) {
            ws.once("open", function open() {
              duplex._write(chunk, encoding, callback);
            });
            return;
          }
          ws.send(chunk, callback);
        };
        duplex.on("end", duplexOnEnd);
        duplex.on("error", duplexOnError);
        return duplex;
      }
      module.exports = createWebSocketStream;
    },
    31: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { tokenChars } = __nccwpck_require__(342);
      function parse(header) {
        const protocols = new Set();
        let start = -1;
        let end = -1;
        let i = 0;
        for (i; i < header.length; i++) {
          const code = header.charCodeAt(i);
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const protocol = header.slice(start, end);
            if (protocols.has(protocol)) {
              throw new SyntaxError(
                `The "${protocol}" subprotocol is duplicated`,
              );
            }
            protocols.add(protocol);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
        if (start === -1 || end !== -1) {
          throw new SyntaxError("Unexpected end of input");
        }
        const protocol = header.slice(start, i);
        if (protocols.has(protocol)) {
          throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
        }
        protocols.add(protocol);
        return protocols;
      }
      module.exports = { parse };
    },
    342: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const { isUtf8 } = __nccwpck_require__(181);
      const { hasBlob } = __nccwpck_require__(892);
      const tokenChars = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 0, 1, 0, 1, 0,
      ];
      function isValidStatusCode(code) {
        return (
          (code >= 1e3 &&
            code <= 1014 &&
            code !== 1004 &&
            code !== 1005 &&
            code !== 1006) ||
          (code >= 3e3 && code <= 4999)
        );
      }
      function _isValidUTF8(buf) {
        const len = buf.length;
        let i = 0;
        while (i < len) {
          if ((buf[i] & 128) === 0) {
            i++;
          } else if ((buf[i] & 224) === 192) {
            if (
              i + 1 === len ||
              (buf[i + 1] & 192) !== 128 ||
              (buf[i] & 254) === 192
            ) {
              return false;
            }
            i += 2;
          } else if ((buf[i] & 240) === 224) {
            if (
              i + 2 >= len ||
              (buf[i + 1] & 192) !== 128 ||
              (buf[i + 2] & 192) !== 128 ||
              (buf[i] === 224 && (buf[i + 1] & 224) === 128) ||
              (buf[i] === 237 && (buf[i + 1] & 224) === 160)
            ) {
              return false;
            }
            i += 3;
          } else if ((buf[i] & 248) === 240) {
            if (
              i + 3 >= len ||
              (buf[i + 1] & 192) !== 128 ||
              (buf[i + 2] & 192) !== 128 ||
              (buf[i + 3] & 192) !== 128 ||
              (buf[i] === 240 && (buf[i + 1] & 240) === 128) ||
              (buf[i] === 244 && buf[i + 1] > 143) ||
              buf[i] > 244
            ) {
              return false;
            }
            i += 4;
          } else {
            return false;
          }
        }
        return true;
      }
      function isBlob(value) {
        return (
          hasBlob &&
          typeof value === "object" &&
          typeof value.arrayBuffer === "function" &&
          typeof value.type === "string" &&
          typeof value.stream === "function" &&
          (value[Symbol.toStringTag] === "Blob" ||
            value[Symbol.toStringTag] === "File")
        );
      }
      module.exports = {
        isBlob,
        isValidStatusCode,
        isValidUTF8: _isValidUTF8,
        tokenChars,
      };
      if (isUtf8) {
        module.exports.isValidUTF8 = function (buf) {
          return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
        };
      } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
        try {
          const isValidUTF8 = __nccwpck_require__(710);
          module.exports.isValidUTF8 = function (buf) {
            return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
          };
        } catch (e) {}
      }
    },
    788: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const EventEmitter = __nccwpck_require__(434);
      const http = __nccwpck_require__(611);
      const { Duplex } = __nccwpck_require__(203);
      const { createHash } = __nccwpck_require__(982);
      const extension = __nccwpck_require__(468);
      const PerMessageDeflate = __nccwpck_require__(465);
      const subprotocol = __nccwpck_require__(31);
      const WebSocket = __nccwpck_require__(234);
      const { GUID, kWebSocket } = __nccwpck_require__(892);
      const keyRegex = /^[+/0-9A-Za-z]{22}==$/;
      const RUNNING = 0;
      const CLOSING = 1;
      const CLOSED = 2;
      class WebSocketServer extends EventEmitter {
        constructor(options, callback) {
          super();
          options = {
            allowSynchronousEvents: true,
            autoPong: true,
            maxPayload: 100 * 1024 * 1024,
            skipUTF8Validation: false,
            perMessageDeflate: false,
            handleProtocols: null,
            clientTracking: true,
            verifyClient: null,
            noServer: false,
            backlog: null,
            server: null,
            host: null,
            path: null,
            port: null,
            WebSocket,
            ...options,
          };
          if (
            (options.port == null && !options.server && !options.noServer) ||
            (options.port != null && (options.server || options.noServer)) ||
            (options.server && options.noServer)
          ) {
            throw new TypeError(
              'One and only one of the "port", "server", or "noServer" options ' +
                "must be specified",
            );
          }
          if (options.port != null) {
            this._server = http.createServer((req, res) => {
              const body = http.STATUS_CODES[426];
              res.writeHead(426, {
                "Content-Length": body.length,
                "Content-Type": "text/plain",
              });
              res.end(body);
            });
            this._server.listen(
              options.port,
              options.host,
              options.backlog,
              callback,
            );
          } else if (options.server) {
            this._server = options.server;
          }
          if (this._server) {
            const emitConnection = this.emit.bind(this, "connection");
            this._removeListeners = addListeners(this._server, {
              listening: this.emit.bind(this, "listening"),
              error: this.emit.bind(this, "error"),
              upgrade: (req, socket, head) => {
                this.handleUpgrade(req, socket, head, emitConnection);
              },
            });
          }
          if (options.perMessageDeflate === true)
            options.perMessageDeflate = {};
          if (options.clientTracking) {
            this.clients = new Set();
            this._shouldEmitClose = false;
          }
          this.options = options;
          this._state = RUNNING;
        }
        address() {
          if (this.options.noServer) {
            throw new Error('The server is operating in "noServer" mode');
          }
          if (!this._server) return null;
          return this._server.address();
        }
        close(cb) {
          if (this._state === CLOSED) {
            if (cb) {
              this.once("close", () => {
                cb(new Error("The server is not running"));
              });
            }
            process.nextTick(emitClose, this);
            return;
          }
          if (cb) this.once("close", cb);
          if (this._state === CLOSING) return;
          this._state = CLOSING;
          if (this.options.noServer || this.options.server) {
            if (this._server) {
              this._removeListeners();
              this._removeListeners = this._server = null;
            }
            if (this.clients) {
              if (!this.clients.size) {
                process.nextTick(emitClose, this);
              } else {
                this._shouldEmitClose = true;
              }
            } else {
              process.nextTick(emitClose, this);
            }
          } else {
            const server = this._server;
            this._removeListeners();
            this._removeListeners = this._server = null;
            server.close(() => {
              emitClose(this);
            });
          }
        }
        shouldHandle(req) {
          if (this.options.path) {
            const index = req.url.indexOf("?");
            const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
            if (pathname !== this.options.path) return false;
          }
          return true;
        }
        handleUpgrade(req, socket, head, cb) {
          socket.on("error", socketOnError);
          const key = req.headers["sec-websocket-key"];
          const upgrade = req.headers.upgrade;
          const version = +req.headers["sec-websocket-version"];
          if (req.method !== "GET") {
            const message = "Invalid HTTP method";
            abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
            return;
          }
          if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
            const message = "Invalid Upgrade header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
          if (key === undefined || !keyRegex.test(key)) {
            const message = "Missing or invalid Sec-WebSocket-Key header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
          if (version !== 13 && version !== 8) {
            const message = "Missing or invalid Sec-WebSocket-Version header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
              "Sec-WebSocket-Version": "13, 8",
            });
            return;
          }
          if (!this.shouldHandle(req)) {
            abortHandshake(socket, 400);
            return;
          }
          const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
          let protocols = new Set();
          if (secWebSocketProtocol !== undefined) {
            try {
              protocols = subprotocol.parse(secWebSocketProtocol);
            } catch (err) {
              const message = "Invalid Sec-WebSocket-Protocol header";
              abortHandshakeOrEmitwsClientError(
                this,
                req,
                socket,
                400,
                message,
              );
              return;
            }
          }
          const secWebSocketExtensions =
            req.headers["sec-websocket-extensions"];
          const extensions = {};
          if (
            this.options.perMessageDeflate &&
            secWebSocketExtensions !== undefined
          ) {
            const perMessageDeflate = new PerMessageDeflate(
              this.options.perMessageDeflate,
              true,
              this.options.maxPayload,
            );
            try {
              const offers = extension.parse(secWebSocketExtensions);
              if (offers[PerMessageDeflate.extensionName]) {
                perMessageDeflate.accept(
                  offers[PerMessageDeflate.extensionName],
                );
                extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
              }
            } catch (err) {
              const message =
                "Invalid or unacceptable Sec-WebSocket-Extensions header";
              abortHandshakeOrEmitwsClientError(
                this,
                req,
                socket,
                400,
                message,
              );
              return;
            }
          }
          if (this.options.verifyClient) {
            const info = {
              origin:
                req.headers[
                  `${version === 8 ? "sec-websocket-origin" : "origin"}`
                ],
              secure: !!(req.socket.authorized || req.socket.encrypted),
              req,
            };
            if (this.options.verifyClient.length === 2) {
              this.options.verifyClient(
                info,
                (verified, code, message, headers) => {
                  if (!verified) {
                    return abortHandshake(
                      socket,
                      code || 401,
                      message,
                      headers,
                    );
                  }
                  this.completeUpgrade(
                    extensions,
                    key,
                    protocols,
                    req,
                    socket,
                    head,
                    cb,
                  );
                },
              );
              return;
            }
            if (!this.options.verifyClient(info))
              return abortHandshake(socket, 401);
          }
          this.completeUpgrade(
            extensions,
            key,
            protocols,
            req,
            socket,
            head,
            cb,
          );
        }
        completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
          if (!socket.readable || !socket.writable) return socket.destroy();
          if (socket[kWebSocket]) {
            throw new Error(
              "server.handleUpgrade() was called more than once with the same " +
                "socket, possibly due to a misconfiguration",
            );
          }
          if (this._state > RUNNING) return abortHandshake(socket, 503);
          const digest = createHash("sha1")
            .update(key + GUID)
            .digest("base64");
          const headers = [
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${digest}`,
          ];
          const ws = new this.options.WebSocket(null, undefined, this.options);
          if (protocols.size) {
            const protocol = this.options.handleProtocols
              ? this.options.handleProtocols(protocols, req)
              : protocols.values().next().value;
            if (protocol) {
              headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
              ws._protocol = protocol;
            }
          }
          if (extensions[PerMessageDeflate.extensionName]) {
            const params = extensions[PerMessageDeflate.extensionName].params;
            const value = extension.format({
              [PerMessageDeflate.extensionName]: [params],
            });
            headers.push(`Sec-WebSocket-Extensions: ${value}`);
            ws._extensions = extensions;
          }
          this.emit("headers", headers, req);
          socket.write(headers.concat("\r\n").join("\r\n"));
          socket.removeListener("error", socketOnError);
          ws.setSocket(socket, head, {
            allowSynchronousEvents: this.options.allowSynchronousEvents,
            maxPayload: this.options.maxPayload,
            skipUTF8Validation: this.options.skipUTF8Validation,
          });
          if (this.clients) {
            this.clients.add(ws);
            ws.on("close", () => {
              this.clients.delete(ws);
              if (this._shouldEmitClose && !this.clients.size) {
                process.nextTick(emitClose, this);
              }
            });
          }
          cb(ws, req);
        }
      }
      module.exports = WebSocketServer;
      function addListeners(server, map) {
        for (const event of Object.keys(map)) server.on(event, map[event]);
        return function removeListeners() {
          for (const event of Object.keys(map)) {
            server.removeListener(event, map[event]);
          }
        };
      }
      function emitClose(server) {
        server._state = CLOSED;
        server.emit("close");
      }
      function socketOnError() {
        this.destroy();
      }
      function abortHandshake(socket, code, message, headers) {
        message = message || http.STATUS_CODES[code];
        headers = {
          Connection: "close",
          "Content-Type": "text/html",
          "Content-Length": Buffer.byteLength(message),
          ...headers,
        };
        socket.once("finish", socket.destroy);
        socket.end(
          `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
            Object.keys(headers)
              .map((h) => `${h}: ${headers[h]}`)
              .join("\r\n") +
            "\r\n\r\n" +
            message,
        );
      }
      function abortHandshakeOrEmitwsClientError(
        server,
        req,
        socket,
        code,
        message,
        headers,
      ) {
        if (server.listenerCount("wsClientError")) {
          const err = new Error(message);
          Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
          server.emit("wsClientError", err, socket, req);
        } else {
          abortHandshake(socket, code, message, headers);
        }
      }
    },
    234: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      const EventEmitter = __nccwpck_require__(434);
      const https = __nccwpck_require__(692);
      const http = __nccwpck_require__(611);
      const net = __nccwpck_require__(278);
      const tls = __nccwpck_require__(756);
      const { randomBytes, createHash } = __nccwpck_require__(982);
      const { Duplex, Readable } = __nccwpck_require__(203);
      const { URL } = __nccwpck_require__(16);
      const PerMessageDeflate = __nccwpck_require__(465);
      const Receiver = __nccwpck_require__(176);
      const Sender = __nccwpck_require__(480);
      const { isBlob } = __nccwpck_require__(342);
      const {
        BINARY_TYPES,
        EMPTY_BUFFER,
        GUID,
        kForOnEventAttribute,
        kListener,
        kStatusCode,
        kWebSocket,
        NOOP,
      } = __nccwpck_require__(892);
      const {
        EventTarget: { addEventListener, removeEventListener },
      } = __nccwpck_require__(95);
      const { format, parse } = __nccwpck_require__(468);
      const { toBuffer } = __nccwpck_require__(72);
      const closeTimeout = 30 * 1e3;
      const kAborted = Symbol("kAborted");
      const protocolVersions = [8, 13];
      const readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
      const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
      class WebSocket extends EventEmitter {
        constructor(address, protocols, options) {
          super();
          this._binaryType = BINARY_TYPES[0];
          this._closeCode = 1006;
          this._closeFrameReceived = false;
          this._closeFrameSent = false;
          this._closeMessage = EMPTY_BUFFER;
          this._closeTimer = null;
          this._errorEmitted = false;
          this._extensions = {};
          this._paused = false;
          this._protocol = "";
          this._readyState = WebSocket.CONNECTING;
          this._receiver = null;
          this._sender = null;
          this._socket = null;
          if (address !== null) {
            this._bufferedAmount = 0;
            this._isServer = false;
            this._redirects = 0;
            if (protocols === undefined) {
              protocols = [];
            } else if (!Array.isArray(protocols)) {
              if (typeof protocols === "object" && protocols !== null) {
                options = protocols;
                protocols = [];
              } else {
                protocols = [protocols];
              }
            }
            initAsClient(this, address, protocols, options);
          } else {
            this._autoPong = options.autoPong;
            this._isServer = true;
          }
        }
        get binaryType() {
          return this._binaryType;
        }
        set binaryType(type) {
          if (!BINARY_TYPES.includes(type)) return;
          this._binaryType = type;
          if (this._receiver) this._receiver._binaryType = type;
        }
        get bufferedAmount() {
          if (!this._socket) return this._bufferedAmount;
          return (
            this._socket._writableState.length + this._sender._bufferedBytes
          );
        }
        get extensions() {
          return Object.keys(this._extensions).join();
        }
        get isPaused() {
          return this._paused;
        }
        get onclose() {
          return null;
        }
        get onerror() {
          return null;
        }
        get onopen() {
          return null;
        }
        get onmessage() {
          return null;
        }
        get protocol() {
          return this._protocol;
        }
        get readyState() {
          return this._readyState;
        }
        get url() {
          return this._url;
        }
        setSocket(socket, head, options) {
          const receiver = new Receiver({
            allowSynchronousEvents: options.allowSynchronousEvents,
            binaryType: this.binaryType,
            extensions: this._extensions,
            isServer: this._isServer,
            maxPayload: options.maxPayload,
            skipUTF8Validation: options.skipUTF8Validation,
          });
          const sender = new Sender(
            socket,
            this._extensions,
            options.generateMask,
          );
          this._receiver = receiver;
          this._sender = sender;
          this._socket = socket;
          receiver[kWebSocket] = this;
          sender[kWebSocket] = this;
          socket[kWebSocket] = this;
          receiver.on("conclude", receiverOnConclude);
          receiver.on("drain", receiverOnDrain);
          receiver.on("error", receiverOnError);
          receiver.on("message", receiverOnMessage);
          receiver.on("ping", receiverOnPing);
          receiver.on("pong", receiverOnPong);
          sender.onerror = senderOnError;
          if (socket.setTimeout) socket.setTimeout(0);
          if (socket.setNoDelay) socket.setNoDelay();
          if (head.length > 0) socket.unshift(head);
          socket.on("close", socketOnClose);
          socket.on("data", socketOnData);
          socket.on("end", socketOnEnd);
          socket.on("error", socketOnError);
          this._readyState = WebSocket.OPEN;
          this.emit("open");
        }
        emitClose() {
          if (!this._socket) {
            this._readyState = WebSocket.CLOSED;
            this.emit("close", this._closeCode, this._closeMessage);
            return;
          }
          if (this._extensions[PerMessageDeflate.extensionName]) {
            this._extensions[PerMessageDeflate.extensionName].cleanup();
          }
          this._receiver.removeAllListeners();
          this._readyState = WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
        }
        close(code, data) {
          if (this.readyState === WebSocket.CLOSED) return;
          if (this.readyState === WebSocket.CONNECTING) {
            const msg =
              "WebSocket was closed before the connection was established";
            abortHandshake(this, this._req, msg);
            return;
          }
          if (this.readyState === WebSocket.CLOSING) {
            if (
              this._closeFrameSent &&
              (this._closeFrameReceived ||
                this._receiver._writableState.errorEmitted)
            ) {
              this._socket.end();
            }
            return;
          }
          this._readyState = WebSocket.CLOSING;
          this._sender.close(code, data, !this._isServer, (err) => {
            if (err) return;
            this._closeFrameSent = true;
            if (
              this._closeFrameReceived ||
              this._receiver._writableState.errorEmitted
            ) {
              this._socket.end();
            }
          });
          setCloseTimer(this);
        }
        pause() {
          if (
            this.readyState === WebSocket.CONNECTING ||
            this.readyState === WebSocket.CLOSED
          ) {
            return;
          }
          this._paused = true;
          this._socket.pause();
        }
        ping(data, mask, cb) {
          if (this.readyState === WebSocket.CONNECTING) {
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          }
          if (typeof data === "function") {
            cb = data;
            data = mask = undefined;
          } else if (typeof mask === "function") {
            cb = mask;
            mask = undefined;
          }
          if (typeof data === "number") data = data.toString();
          if (this.readyState !== WebSocket.OPEN) {
            sendAfterClose(this, data, cb);
            return;
          }
          if (mask === undefined) mask = !this._isServer;
          this._sender.ping(data || EMPTY_BUFFER, mask, cb);
        }
        pong(data, mask, cb) {
          if (this.readyState === WebSocket.CONNECTING) {
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          }
          if (typeof data === "function") {
            cb = data;
            data = mask = undefined;
          } else if (typeof mask === "function") {
            cb = mask;
            mask = undefined;
          }
          if (typeof data === "number") data = data.toString();
          if (this.readyState !== WebSocket.OPEN) {
            sendAfterClose(this, data, cb);
            return;
          }
          if (mask === undefined) mask = !this._isServer;
          this._sender.pong(data || EMPTY_BUFFER, mask, cb);
        }
        resume() {
          if (
            this.readyState === WebSocket.CONNECTING ||
            this.readyState === WebSocket.CLOSED
          ) {
            return;
          }
          this._paused = false;
          if (!this._receiver._writableState.needDrain) this._socket.resume();
        }
        send(data, options, cb) {
          if (this.readyState === WebSocket.CONNECTING) {
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          }
          if (typeof options === "function") {
            cb = options;
            options = {};
          }
          if (typeof data === "number") data = data.toString();
          if (this.readyState !== WebSocket.OPEN) {
            sendAfterClose(this, data, cb);
            return;
          }
          const opts = {
            binary: typeof data !== "string",
            mask: !this._isServer,
            compress: true,
            fin: true,
            ...options,
          };
          if (!this._extensions[PerMessageDeflate.extensionName]) {
            opts.compress = false;
          }
          this._sender.send(data || EMPTY_BUFFER, opts, cb);
        }
        terminate() {
          if (this.readyState === WebSocket.CLOSED) return;
          if (this.readyState === WebSocket.CONNECTING) {
            const msg =
              "WebSocket was closed before the connection was established";
            abortHandshake(this, this._req, msg);
            return;
          }
          if (this._socket) {
            this._readyState = WebSocket.CLOSING;
            this._socket.destroy();
          }
        }
      }
      Object.defineProperty(WebSocket, "CONNECTING", {
        enumerable: true,
        value: readyStates.indexOf("CONNECTING"),
      });
      Object.defineProperty(WebSocket.prototype, "CONNECTING", {
        enumerable: true,
        value: readyStates.indexOf("CONNECTING"),
      });
      Object.defineProperty(WebSocket, "OPEN", {
        enumerable: true,
        value: readyStates.indexOf("OPEN"),
      });
      Object.defineProperty(WebSocket.prototype, "OPEN", {
        enumerable: true,
        value: readyStates.indexOf("OPEN"),
      });
      Object.defineProperty(WebSocket, "CLOSING", {
        enumerable: true,
        value: readyStates.indexOf("CLOSING"),
      });
      Object.defineProperty(WebSocket.prototype, "CLOSING", {
        enumerable: true,
        value: readyStates.indexOf("CLOSING"),
      });
      Object.defineProperty(WebSocket, "CLOSED", {
        enumerable: true,
        value: readyStates.indexOf("CLOSED"),
      });
      Object.defineProperty(WebSocket.prototype, "CLOSED", {
        enumerable: true,
        value: readyStates.indexOf("CLOSED"),
      });
      [
        "binaryType",
        "bufferedAmount",
        "extensions",
        "isPaused",
        "protocol",
        "readyState",
        "url",
      ].forEach((property) => {
        Object.defineProperty(WebSocket.prototype, property, {
          enumerable: true,
        });
      });
      ["open", "error", "close", "message"].forEach((method) => {
        Object.defineProperty(WebSocket.prototype, `on${method}`, {
          enumerable: true,
          get() {
            for (const listener of this.listeners(method)) {
              if (listener[kForOnEventAttribute]) return listener[kListener];
            }
            return null;
          },
          set(handler) {
            for (const listener of this.listeners(method)) {
              if (listener[kForOnEventAttribute]) {
                this.removeListener(method, listener);
                break;
              }
            }
            if (typeof handler !== "function") return;
            this.addEventListener(method, handler, {
              [kForOnEventAttribute]: true,
            });
          },
        });
      });
      WebSocket.prototype.addEventListener = addEventListener;
      WebSocket.prototype.removeEventListener = removeEventListener;
      module.exports = WebSocket;
      function initAsClient(websocket, address, protocols, options) {
        const opts = {
          allowSynchronousEvents: true,
          autoPong: true,
          protocolVersion: protocolVersions[1],
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: true,
          followRedirects: false,
          maxRedirects: 10,
          ...options,
          socketPath: undefined,
          hostname: undefined,
          protocol: undefined,
          timeout: undefined,
          method: "GET",
          host: undefined,
          path: undefined,
          port: undefined,
        };
        websocket._autoPong = opts.autoPong;
        if (!protocolVersions.includes(opts.protocolVersion)) {
          throw new RangeError(
            `Unsupported protocol version: ${opts.protocolVersion} ` +
              `(supported versions: ${protocolVersions.join(", ")})`,
          );
        }
        let parsedUrl;
        if (address instanceof URL) {
          parsedUrl = address;
        } else {
          try {
            parsedUrl = new URL(address);
          } catch (e) {
            throw new SyntaxError(`Invalid URL: ${address}`);
          }
        }
        if (parsedUrl.protocol === "http:") {
          parsedUrl.protocol = "ws:";
        } else if (parsedUrl.protocol === "https:") {
          parsedUrl.protocol = "wss:";
        }
        websocket._url = parsedUrl.href;
        const isSecure = parsedUrl.protocol === "wss:";
        const isIpcUrl = parsedUrl.protocol === "ws+unix:";
        let invalidUrlMessage;
        if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
          invalidUrlMessage =
            'The URL\'s protocol must be one of "ws:", "wss:", ' +
            '"http:", "https:", or "ws+unix:"';
        } else if (isIpcUrl && !parsedUrl.pathname) {
          invalidUrlMessage = "The URL's pathname is empty";
        } else if (parsedUrl.hash) {
          invalidUrlMessage = "The URL contains a fragment identifier";
        }
        if (invalidUrlMessage) {
          const err = new SyntaxError(invalidUrlMessage);
          if (websocket._redirects === 0) {
            throw err;
          } else {
            emitErrorAndClose(websocket, err);
            return;
          }
        }
        const defaultPort = isSecure ? 443 : 80;
        const key = randomBytes(16).toString("base64");
        const request = isSecure ? https.request : http.request;
        const protocolSet = new Set();
        let perMessageDeflate;
        opts.createConnection =
          opts.createConnection || (isSecure ? tlsConnect : netConnect);
        opts.defaultPort = opts.defaultPort || defaultPort;
        opts.port = parsedUrl.port || defaultPort;
        opts.host = parsedUrl.hostname.startsWith("[")
          ? parsedUrl.hostname.slice(1, -1)
          : parsedUrl.hostname;
        opts.headers = {
          ...opts.headers,
          "Sec-WebSocket-Version": opts.protocolVersion,
          "Sec-WebSocket-Key": key,
          Connection: "Upgrade",
          Upgrade: "websocket",
        };
        opts.path = parsedUrl.pathname + parsedUrl.search;
        opts.timeout = opts.handshakeTimeout;
        if (opts.perMessageDeflate) {
          perMessageDeflate = new PerMessageDeflate(
            opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
            false,
            opts.maxPayload,
          );
          opts.headers["Sec-WebSocket-Extensions"] = format({
            [PerMessageDeflate.extensionName]: perMessageDeflate.offer(),
          });
        }
        if (protocols.length) {
          for (const protocol of protocols) {
            if (
              typeof protocol !== "string" ||
              !subprotocolRegex.test(protocol) ||
              protocolSet.has(protocol)
            ) {
              throw new SyntaxError(
                "An invalid or duplicated subprotocol was specified",
              );
            }
            protocolSet.add(protocol);
          }
          opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
        }
        if (opts.origin) {
          if (opts.protocolVersion < 13) {
            opts.headers["Sec-WebSocket-Origin"] = opts.origin;
          } else {
            opts.headers.Origin = opts.origin;
          }
        }
        if (parsedUrl.username || parsedUrl.password) {
          opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
        }
        if (isIpcUrl) {
          const parts = opts.path.split(":");
          opts.socketPath = parts[0];
          opts.path = parts[1];
        }
        let req;
        if (opts.followRedirects) {
          if (websocket._redirects === 0) {
            websocket._originalIpc = isIpcUrl;
            websocket._originalSecure = isSecure;
            websocket._originalHostOrSocketPath = isIpcUrl
              ? opts.socketPath
              : parsedUrl.host;
            const headers = options && options.headers;
            options = { ...options, headers: {} };
            if (headers) {
              for (const [key, value] of Object.entries(headers)) {
                options.headers[key.toLowerCase()] = value;
              }
            }
          } else if (websocket.listenerCount("redirect") === 0) {
            const isSameHost = isIpcUrl
              ? websocket._originalIpc
                ? opts.socketPath === websocket._originalHostOrSocketPath
                : false
              : websocket._originalIpc
                ? false
                : parsedUrl.host === websocket._originalHostOrSocketPath;
            if (!isSameHost || (websocket._originalSecure && !isSecure)) {
              delete opts.headers.authorization;
              delete opts.headers.cookie;
              if (!isSameHost) delete opts.headers.host;
              opts.auth = undefined;
            }
          }
          if (opts.auth && !options.headers.authorization) {
            options.headers.authorization =
              "Basic " + Buffer.from(opts.auth).toString("base64");
          }
          req = websocket._req = request(opts);
          if (websocket._redirects) {
            websocket.emit("redirect", websocket.url, req);
          }
        } else {
          req = websocket._req = request(opts);
        }
        if (opts.timeout) {
          req.on("timeout", () => {
            abortHandshake(websocket, req, "Opening handshake has timed out");
          });
        }
        req.on("error", (err) => {
          if (req === null || req[kAborted]) return;
          req = websocket._req = null;
          emitErrorAndClose(websocket, err);
        });
        req.on("response", (res) => {
          const location = res.headers.location;
          const statusCode = res.statusCode;
          if (
            location &&
            opts.followRedirects &&
            statusCode >= 300 &&
            statusCode < 400
          ) {
            if (++websocket._redirects > opts.maxRedirects) {
              abortHandshake(websocket, req, "Maximum redirects exceeded");
              return;
            }
            req.abort();
            let addr;
            try {
              addr = new URL(location, address);
            } catch (e) {
              const err = new SyntaxError(`Invalid URL: ${location}`);
              emitErrorAndClose(websocket, err);
              return;
            }
            initAsClient(websocket, addr, protocols, options);
          } else if (!websocket.emit("unexpected-response", req, res)) {
            abortHandshake(
              websocket,
              req,
              `Unexpected server response: ${res.statusCode}`,
            );
          }
        });
        req.on("upgrade", (res, socket, head) => {
          websocket.emit("upgrade", res);
          if (websocket.readyState !== WebSocket.CONNECTING) return;
          req = websocket._req = null;
          const upgrade = res.headers.upgrade;
          if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
            abortHandshake(websocket, socket, "Invalid Upgrade header");
            return;
          }
          const digest = createHash("sha1")
            .update(key + GUID)
            .digest("base64");
          if (res.headers["sec-websocket-accept"] !== digest) {
            abortHandshake(
              websocket,
              socket,
              "Invalid Sec-WebSocket-Accept header",
            );
            return;
          }
          const serverProt = res.headers["sec-websocket-protocol"];
          let protError;
          if (serverProt !== undefined) {
            if (!protocolSet.size) {
              protError = "Server sent a subprotocol but none was requested";
            } else if (!protocolSet.has(serverProt)) {
              protError = "Server sent an invalid subprotocol";
            }
          } else if (protocolSet.size) {
            protError = "Server sent no subprotocol";
          }
          if (protError) {
            abortHandshake(websocket, socket, protError);
            return;
          }
          if (serverProt) websocket._protocol = serverProt;
          const secWebSocketExtensions =
            res.headers["sec-websocket-extensions"];
          if (secWebSocketExtensions !== undefined) {
            if (!perMessageDeflate) {
              const message =
                "Server sent a Sec-WebSocket-Extensions header but no extension " +
                "was requested";
              abortHandshake(websocket, socket, message);
              return;
            }
            let extensions;
            try {
              extensions = parse(secWebSocketExtensions);
            } catch (err) {
              const message = "Invalid Sec-WebSocket-Extensions header";
              abortHandshake(websocket, socket, message);
              return;
            }
            const extensionNames = Object.keys(extensions);
            if (
              extensionNames.length !== 1 ||
              extensionNames[0] !== PerMessageDeflate.extensionName
            ) {
              const message =
                "Server indicated an extension that was not requested";
              abortHandshake(websocket, socket, message);
              return;
            }
            try {
              perMessageDeflate.accept(
                extensions[PerMessageDeflate.extensionName],
              );
            } catch (err) {
              const message = "Invalid Sec-WebSocket-Extensions header";
              abortHandshake(websocket, socket, message);
              return;
            }
            websocket._extensions[PerMessageDeflate.extensionName] =
              perMessageDeflate;
          }
          websocket.setSocket(socket, head, {
            allowSynchronousEvents: opts.allowSynchronousEvents,
            generateMask: opts.generateMask,
            maxPayload: opts.maxPayload,
            skipUTF8Validation: opts.skipUTF8Validation,
          });
        });
        if (opts.finishRequest) {
          opts.finishRequest(req, websocket);
        } else {
          req.end();
        }
      }
      function emitErrorAndClose(websocket, err) {
        websocket._readyState = WebSocket.CLOSING;
        websocket._errorEmitted = true;
        websocket.emit("error", err);
        websocket.emitClose();
      }
      function netConnect(options) {
        options.path = options.socketPath;
        return net.connect(options);
      }
      function tlsConnect(options) {
        options.path = undefined;
        if (!options.servername && options.servername !== "") {
          options.servername = net.isIP(options.host) ? "" : options.host;
        }
        return tls.connect(options);
      }
      function abortHandshake(websocket, stream, message) {
        websocket._readyState = WebSocket.CLOSING;
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshake);
        if (stream.setHeader) {
          stream[kAborted] = true;
          stream.abort();
          if (stream.socket && !stream.socket.destroyed) {
            stream.socket.destroy();
          }
          process.nextTick(emitErrorAndClose, websocket, err);
        } else {
          stream.destroy(err);
          stream.once("error", websocket.emit.bind(websocket, "error"));
          stream.once("close", websocket.emitClose.bind(websocket));
        }
      }
      function sendAfterClose(websocket, data, cb) {
        if (data) {
          const length = isBlob(data) ? data.size : toBuffer(data).length;
          if (websocket._socket) websocket._sender._bufferedBytes += length;
          else websocket._bufferedAmount += length;
        }
        if (cb) {
          const err = new Error(
            `WebSocket is not open: readyState ${websocket.readyState} ` +
              `(${readyStates[websocket.readyState]})`,
          );
          process.nextTick(cb, err);
        }
      }
      function receiverOnConclude(code, reason) {
        const websocket = this[kWebSocket];
        websocket._closeFrameReceived = true;
        websocket._closeMessage = reason;
        websocket._closeCode = code;
        if (websocket._socket[kWebSocket] === undefined) return;
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        if (code === 1005) websocket.close();
        else websocket.close(code, reason);
      }
      function receiverOnDrain() {
        const websocket = this[kWebSocket];
        if (!websocket.isPaused) websocket._socket.resume();
      }
      function receiverOnError(err) {
        const websocket = this[kWebSocket];
        if (websocket._socket[kWebSocket] !== undefined) {
          websocket._socket.removeListener("data", socketOnData);
          process.nextTick(resume, websocket._socket);
          websocket.close(err[kStatusCode]);
        }
        if (!websocket._errorEmitted) {
          websocket._errorEmitted = true;
          websocket.emit("error", err);
        }
      }
      function receiverOnFinish() {
        this[kWebSocket].emitClose();
      }
      function receiverOnMessage(data, isBinary) {
        this[kWebSocket].emit("message", data, isBinary);
      }
      function receiverOnPing(data) {
        const websocket = this[kWebSocket];
        if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
        websocket.emit("ping", data);
      }
      function receiverOnPong(data) {
        this[kWebSocket].emit("pong", data);
      }
      function resume(stream) {
        stream.resume();
      }
      function senderOnError(err) {
        const websocket = this[kWebSocket];
        if (websocket.readyState === WebSocket.CLOSED) return;
        if (websocket.readyState === WebSocket.OPEN) {
          websocket._readyState = WebSocket.CLOSING;
          setCloseTimer(websocket);
        }
        this._socket.end();
        if (!websocket._errorEmitted) {
          websocket._errorEmitted = true;
          websocket.emit("error", err);
        }
      }
      function setCloseTimer(websocket) {
        websocket._closeTimer = setTimeout(
          websocket._socket.destroy.bind(websocket._socket),
          closeTimeout,
        );
      }
      function socketOnClose() {
        const websocket = this[kWebSocket];
        this.removeListener("close", socketOnClose);
        this.removeListener("data", socketOnData);
        this.removeListener("end", socketOnEnd);
        websocket._readyState = WebSocket.CLOSING;
        let chunk;
        if (
          !this._readableState.endEmitted &&
          !websocket._closeFrameReceived &&
          !websocket._receiver._writableState.errorEmitted &&
          (chunk = websocket._socket.read()) !== null
        ) {
          websocket._receiver.write(chunk);
        }
        websocket._receiver.end();
        this[kWebSocket] = undefined;
        clearTimeout(websocket._closeTimer);
        if (
          websocket._receiver._writableState.finished ||
          websocket._receiver._writableState.errorEmitted
        ) {
          websocket.emitClose();
        } else {
          websocket._receiver.on("error", receiverOnFinish);
          websocket._receiver.on("finish", receiverOnFinish);
        }
      }
      function socketOnData(chunk) {
        if (!this[kWebSocket]._receiver.write(chunk)) {
          this.pause();
        }
      }
      function socketOnEnd() {
        const websocket = this[kWebSocket];
        websocket._readyState = WebSocket.CLOSING;
        websocket._receiver.end();
        this.end();
      }
      function socketOnError() {
        const websocket = this[kWebSocket];
        this.removeListener("error", socketOnError);
        this.on("error", NOOP);
        if (websocket) {
          websocket._readyState = WebSocket.CLOSING;
          this.destroy();
        }
      }
    },
    431: (module) => {
      module.exports = eval("require")("bufferutil");
    },
    710: (module) => {
      module.exports = eval("require")("utf-8-validate");
    },
    181: (module) => {
      "use strict";
      module.exports = require("buffer");
    },
    982: (module) => {
      "use strict";
      module.exports = require("crypto");
    },
    434: (module) => {
      "use strict";
      module.exports = require("events");
    },
    611: (module) => {
      "use strict";
      module.exports = require("http");
    },
    692: (module) => {
      "use strict";
      module.exports = require("https");
    },
    278: (module) => {
      "use strict";
      module.exports = require("net");
    },
    203: (module) => {
      "use strict";
      module.exports = require("stream");
    },
    756: (module) => {
      "use strict";
      module.exports = require("tls");
    },
    16: (module) => {
      "use strict";
      module.exports = require("url");
    },
    106: (module) => {
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
  var __webpack_exports__ = __nccwpck_require__(821);
  module.exports = __webpack_exports__;
})();
