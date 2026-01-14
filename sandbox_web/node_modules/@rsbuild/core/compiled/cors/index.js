(() => {
  var __webpack_modules__ = {
    970: (module, __unused_webpack_exports, __nccwpck_require__) => {
      (function () {
        "use strict";
        var assign = __nccwpck_require__(637);
        var vary = __nccwpck_require__(321);
        var defaults = {
          origin: "*",
          methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
          preflightContinue: false,
          optionsSuccessStatus: 204,
        };
        function isString(s) {
          return typeof s === "string" || s instanceof String;
        }
        function isOriginAllowed(origin, allowedOrigin) {
          if (Array.isArray(allowedOrigin)) {
            for (var i = 0; i < allowedOrigin.length; ++i) {
              if (isOriginAllowed(origin, allowedOrigin[i])) {
                return true;
              }
            }
            return false;
          } else if (isString(allowedOrigin)) {
            return origin === allowedOrigin;
          } else if (allowedOrigin instanceof RegExp) {
            return allowedOrigin.test(origin);
          } else {
            return !!allowedOrigin;
          }
        }
        function configureOrigin(options, req) {
          var requestOrigin = req.headers.origin,
            headers = [],
            isAllowed;
          if (!options.origin || options.origin === "*") {
            headers.push([{ key: "Access-Control-Allow-Origin", value: "*" }]);
          } else if (isString(options.origin)) {
            headers.push([
              { key: "Access-Control-Allow-Origin", value: options.origin },
            ]);
            headers.push([{ key: "Vary", value: "Origin" }]);
          } else {
            isAllowed = isOriginAllowed(requestOrigin, options.origin);
            headers.push([
              {
                key: "Access-Control-Allow-Origin",
                value: isAllowed ? requestOrigin : false,
              },
            ]);
            headers.push([{ key: "Vary", value: "Origin" }]);
          }
          return headers;
        }
        function configureMethods(options) {
          var methods = options.methods;
          if (methods.join) {
            methods = options.methods.join(",");
          }
          return { key: "Access-Control-Allow-Methods", value: methods };
        }
        function configureCredentials(options) {
          if (options.credentials === true) {
            return { key: "Access-Control-Allow-Credentials", value: "true" };
          }
          return null;
        }
        function configureAllowedHeaders(options, req) {
          var allowedHeaders = options.allowedHeaders || options.headers;
          var headers = [];
          if (!allowedHeaders) {
            allowedHeaders = req.headers["access-control-request-headers"];
            headers.push([
              { key: "Vary", value: "Access-Control-Request-Headers" },
            ]);
          } else if (allowedHeaders.join) {
            allowedHeaders = allowedHeaders.join(",");
          }
          if (allowedHeaders && allowedHeaders.length) {
            headers.push([
              { key: "Access-Control-Allow-Headers", value: allowedHeaders },
            ]);
          }
          return headers;
        }
        function configureExposedHeaders(options) {
          var headers = options.exposedHeaders;
          if (!headers) {
            return null;
          } else if (headers.join) {
            headers = headers.join(",");
          }
          if (headers && headers.length) {
            return { key: "Access-Control-Expose-Headers", value: headers };
          }
          return null;
        }
        function configureMaxAge(options) {
          var maxAge =
            (typeof options.maxAge === "number" || options.maxAge) &&
            options.maxAge.toString();
          if (maxAge && maxAge.length) {
            return { key: "Access-Control-Max-Age", value: maxAge };
          }
          return null;
        }
        function applyHeaders(headers, res) {
          for (var i = 0, n = headers.length; i < n; i++) {
            var header = headers[i];
            if (header) {
              if (Array.isArray(header)) {
                applyHeaders(header, res);
              } else if (header.key === "Vary" && header.value) {
                vary(res, header.value);
              } else if (header.value) {
                res.setHeader(header.key, header.value);
              }
            }
          }
        }
        function cors(options, req, res, next) {
          var headers = [],
            method =
              req.method && req.method.toUpperCase && req.method.toUpperCase();
          if (method === "OPTIONS") {
            headers.push(configureOrigin(options, req));
            headers.push(configureCredentials(options, req));
            headers.push(configureMethods(options, req));
            headers.push(configureAllowedHeaders(options, req));
            headers.push(configureMaxAge(options, req));
            headers.push(configureExposedHeaders(options, req));
            applyHeaders(headers, res);
            if (options.preflightContinue) {
              next();
            } else {
              res.statusCode = options.optionsSuccessStatus;
              res.setHeader("Content-Length", "0");
              res.end();
            }
          } else {
            headers.push(configureOrigin(options, req));
            headers.push(configureCredentials(options, req));
            headers.push(configureExposedHeaders(options, req));
            applyHeaders(headers, res);
            next();
          }
        }
        function middlewareWrapper(o) {
          var optionsCallback = null;
          if (typeof o === "function") {
            optionsCallback = o;
          } else {
            optionsCallback = function (req, cb) {
              cb(null, o);
            };
          }
          return function corsMiddleware(req, res, next) {
            optionsCallback(req, function (err, options) {
              if (err) {
                next(err);
              } else {
                var corsOptions = assign({}, defaults, options);
                var originCallback = null;
                if (
                  corsOptions.origin &&
                  typeof corsOptions.origin === "function"
                ) {
                  originCallback = corsOptions.origin;
                } else if (corsOptions.origin) {
                  originCallback = function (origin, cb) {
                    cb(null, corsOptions.origin);
                  };
                }
                if (originCallback) {
                  originCallback(req.headers.origin, function (err2, origin) {
                    if (err2 || !origin) {
                      next(err2);
                    } else {
                      corsOptions.origin = origin;
                      cors(corsOptions, req, res, next);
                    }
                  });
                } else {
                  next();
                }
              }
            });
          };
        }
        module.exports = middlewareWrapper;
      })();
    },
    637: (module) => {
      "use strict";
      /*
object-assign
(c) Sindre Sorhus
@license MIT
*/ var getOwnPropertySymbols = Object.getOwnPropertySymbols;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var propIsEnumerable = Object.prototype.propertyIsEnumerable;
      function toObject(val) {
        if (val === null || val === undefined) {
          throw new TypeError(
            "Object.assign cannot be called with null or undefined",
          );
        }
        return Object(val);
      }
      function shouldUseNative() {
        try {
          if (!Object.assign) {
            return false;
          }
          var test1 = new String("abc");
          test1[5] = "de";
          if (Object.getOwnPropertyNames(test1)[0] === "5") {
            return false;
          }
          var test2 = {};
          for (var i = 0; i < 10; i++) {
            test2["_" + String.fromCharCode(i)] = i;
          }
          var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
            return test2[n];
          });
          if (order2.join("") !== "0123456789") {
            return false;
          }
          var test3 = {};
          "abcdefghijklmnopqrst".split("").forEach(function (letter) {
            test3[letter] = letter;
          });
          if (
            Object.keys(Object.assign({}, test3)).join("") !==
            "abcdefghijklmnopqrst"
          ) {
            return false;
          }
          return true;
        } catch (err) {
          return false;
        }
      }
      module.exports = shouldUseNative()
        ? Object.assign
        : function (target, source) {
            var from;
            var to = toObject(target);
            var symbols;
            for (var s = 1; s < arguments.length; s++) {
              from = Object(arguments[s]);
              for (var key in from) {
                if (hasOwnProperty.call(from, key)) {
                  to[key] = from[key];
                }
              }
              if (getOwnPropertySymbols) {
                symbols = getOwnPropertySymbols(from);
                for (var i = 0; i < symbols.length; i++) {
                  if (propIsEnumerable.call(from, symbols[i])) {
                    to[symbols[i]] = from[symbols[i]];
                  }
                }
              }
            }
            return to;
          };
    },
    321: (module) => {
      "use strict";
      /*!
       * vary
       * Copyright(c) 2014-2017 Douglas Christopher Wilson
       * MIT Licensed
       */ module.exports = vary;
      module.exports.append = append;
      var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
      function append(header, field) {
        if (typeof header !== "string") {
          throw new TypeError("header argument is required");
        }
        if (!field) {
          throw new TypeError("field argument is required");
        }
        var fields = !Array.isArray(field) ? parse(String(field)) : field;
        for (var j = 0; j < fields.length; j++) {
          if (!FIELD_NAME_REGEXP.test(fields[j])) {
            throw new TypeError(
              "field argument contains an invalid header name",
            );
          }
        }
        if (header === "*") {
          return header;
        }
        var val = header;
        var vals = parse(header.toLowerCase());
        if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
          return "*";
        }
        for (var i = 0; i < fields.length; i++) {
          var fld = fields[i].toLowerCase();
          if (vals.indexOf(fld) === -1) {
            vals.push(fld);
            val = val ? val + ", " + fields[i] : fields[i];
          }
        }
        return val;
      }
      function parse(header) {
        var end = 0;
        var list = [];
        var start = 0;
        for (var i = 0, len = header.length; i < len; i++) {
          switch (header.charCodeAt(i)) {
            case 32:
              if (start === end) {
                start = end = i + 1;
              }
              break;
            case 44:
              list.push(header.substring(start, end));
              start = end = i + 1;
              break;
            default:
              end = i + 1;
              break;
          }
        }
        list.push(header.substring(start, end));
        return list;
      }
      function vary(res, field) {
        if (!res || !res.getHeader || !res.setHeader) {
          throw new TypeError("res argument is required");
        }
        var val = res.getHeader("Vary") || "";
        var header = Array.isArray(val) ? val.join(", ") : String(val);
        if ((val = append(header, field))) {
          res.setHeader("Vary", val);
        }
      }
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
  var __webpack_exports__ = __nccwpck_require__(970);
  module.exports = __webpack_exports__;
})();
