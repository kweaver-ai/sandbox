(() => {
  var __webpack_modules__ = {
    5767: (module) => {
      "use strict";
      module.exports = clone;
      var getPrototypeOf =
        Object.getPrototypeOf ||
        function (obj) {
          return obj.__proto__;
        };
      function clone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Object)
          var copy = { __proto__: getPrototypeOf(obj) };
        else var copy = Object.create(null);
        Object.getOwnPropertyNames(obj).forEach(function (key) {
          Object.defineProperty(
            copy,
            key,
            Object.getOwnPropertyDescriptor(obj, key),
          );
        });
        return copy;
      }
    },
    5219: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var fs = __nccwpck_require__(9896);
      var polyfills = __nccwpck_require__(6190);
      var legacy = __nccwpck_require__(6383);
      var clone = __nccwpck_require__(5767);
      var util = __nccwpck_require__(9023);
      var gracefulQueue;
      var previousSymbol;
      if (typeof Symbol === "function" && typeof Symbol.for === "function") {
        gracefulQueue = Symbol.for("graceful-fs.queue");
        previousSymbol = Symbol.for("graceful-fs.previous");
      } else {
        gracefulQueue = "___graceful-fs.queue";
        previousSymbol = "___graceful-fs.previous";
      }
      function noop() {}
      function publishQueue(context, queue) {
        Object.defineProperty(context, gracefulQueue, {
          get: function () {
            return queue;
          },
        });
      }
      var debug = noop;
      if (util.debuglog) debug = util.debuglog("gfs4");
      else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
        debug = function () {
          var m = util.format.apply(util, arguments);
          m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
          console.error(m);
        };
      if (!fs[gracefulQueue]) {
        var queue = global[gracefulQueue] || [];
        publishQueue(fs, queue);
        fs.close = (function (fs$close) {
          function close(fd, cb) {
            return fs$close.call(fs, fd, function (err) {
              if (!err) {
                resetQueue();
              }
              if (typeof cb === "function") cb.apply(this, arguments);
            });
          }
          Object.defineProperty(close, previousSymbol, { value: fs$close });
          return close;
        })(fs.close);
        fs.closeSync = (function (fs$closeSync) {
          function closeSync(fd) {
            fs$closeSync.apply(fs, arguments);
            resetQueue();
          }
          Object.defineProperty(closeSync, previousSymbol, {
            value: fs$closeSync,
          });
          return closeSync;
        })(fs.closeSync);
        if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
          process.on("exit", function () {
            debug(fs[gracefulQueue]);
            __nccwpck_require__(2613).equal(fs[gracefulQueue].length, 0);
          });
        }
      }
      if (!global[gracefulQueue]) {
        publishQueue(global, fs[gracefulQueue]);
      }
      module.exports = patch(clone(fs));
      if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
        module.exports = patch(fs);
        fs.__patched = true;
      }
      function patch(fs) {
        polyfills(fs);
        fs.gracefulify = patch;
        fs.createReadStream = createReadStream;
        fs.createWriteStream = createWriteStream;
        var fs$readFile = fs.readFile;
        fs.readFile = readFile;
        function readFile(path, options, cb) {
          if (typeof options === "function") ((cb = options), (options = null));
          return go$readFile(path, options, cb);
          function go$readFile(path, options, cb, startTime) {
            return fs$readFile(path, options, function (err) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$readFile,
                  [path, options, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (typeof cb === "function") cb.apply(this, arguments);
              }
            });
          }
        }
        var fs$writeFile = fs.writeFile;
        fs.writeFile = writeFile;
        function writeFile(path, data, options, cb) {
          if (typeof options === "function") ((cb = options), (options = null));
          return go$writeFile(path, data, options, cb);
          function go$writeFile(path, data, options, cb, startTime) {
            return fs$writeFile(path, data, options, function (err) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$writeFile,
                  [path, data, options, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (typeof cb === "function") cb.apply(this, arguments);
              }
            });
          }
        }
        var fs$appendFile = fs.appendFile;
        if (fs$appendFile) fs.appendFile = appendFile;
        function appendFile(path, data, options, cb) {
          if (typeof options === "function") ((cb = options), (options = null));
          return go$appendFile(path, data, options, cb);
          function go$appendFile(path, data, options, cb, startTime) {
            return fs$appendFile(path, data, options, function (err) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$appendFile,
                  [path, data, options, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (typeof cb === "function") cb.apply(this, arguments);
              }
            });
          }
        }
        var fs$copyFile = fs.copyFile;
        if (fs$copyFile) fs.copyFile = copyFile;
        function copyFile(src, dest, flags, cb) {
          if (typeof flags === "function") {
            cb = flags;
            flags = 0;
          }
          return go$copyFile(src, dest, flags, cb);
          function go$copyFile(src, dest, flags, cb, startTime) {
            return fs$copyFile(src, dest, flags, function (err) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$copyFile,
                  [src, dest, flags, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (typeof cb === "function") cb.apply(this, arguments);
              }
            });
          }
        }
        var fs$readdir = fs.readdir;
        fs.readdir = readdir;
        var noReaddirOptionVersions = /^v[0-5]\./;
        function readdir(path, options, cb) {
          if (typeof options === "function") ((cb = options), (options = null));
          var go$readdir = noReaddirOptionVersions.test(process.version)
            ? function go$readdir(path, options, cb, startTime) {
                return fs$readdir(
                  path,
                  fs$readdirCallback(path, options, cb, startTime),
                );
              }
            : function go$readdir(path, options, cb, startTime) {
                return fs$readdir(
                  path,
                  options,
                  fs$readdirCallback(path, options, cb, startTime),
                );
              };
          return go$readdir(path, options, cb);
          function fs$readdirCallback(path, options, cb, startTime) {
            return function (err, files) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$readdir,
                  [path, options, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (files && files.sort) files.sort();
                if (typeof cb === "function") cb.call(this, err, files);
              }
            };
          }
        }
        if (process.version.substr(0, 4) === "v0.8") {
          var legStreams = legacy(fs);
          ReadStream = legStreams.ReadStream;
          WriteStream = legStreams.WriteStream;
        }
        var fs$ReadStream = fs.ReadStream;
        if (fs$ReadStream) {
          ReadStream.prototype = Object.create(fs$ReadStream.prototype);
          ReadStream.prototype.open = ReadStream$open;
        }
        var fs$WriteStream = fs.WriteStream;
        if (fs$WriteStream) {
          WriteStream.prototype = Object.create(fs$WriteStream.prototype);
          WriteStream.prototype.open = WriteStream$open;
        }
        Object.defineProperty(fs, "ReadStream", {
          get: function () {
            return ReadStream;
          },
          set: function (val) {
            ReadStream = val;
          },
          enumerable: true,
          configurable: true,
        });
        Object.defineProperty(fs, "WriteStream", {
          get: function () {
            return WriteStream;
          },
          set: function (val) {
            WriteStream = val;
          },
          enumerable: true,
          configurable: true,
        });
        var FileReadStream = ReadStream;
        Object.defineProperty(fs, "FileReadStream", {
          get: function () {
            return FileReadStream;
          },
          set: function (val) {
            FileReadStream = val;
          },
          enumerable: true,
          configurable: true,
        });
        var FileWriteStream = WriteStream;
        Object.defineProperty(fs, "FileWriteStream", {
          get: function () {
            return FileWriteStream;
          },
          set: function (val) {
            FileWriteStream = val;
          },
          enumerable: true,
          configurable: true,
        });
        function ReadStream(path, options) {
          if (this instanceof ReadStream)
            return (fs$ReadStream.apply(this, arguments), this);
          else
            return ReadStream.apply(
              Object.create(ReadStream.prototype),
              arguments,
            );
        }
        function ReadStream$open() {
          var that = this;
          open(that.path, that.flags, that.mode, function (err, fd) {
            if (err) {
              if (that.autoClose) that.destroy();
              that.emit("error", err);
            } else {
              that.fd = fd;
              that.emit("open", fd);
              that.read();
            }
          });
        }
        function WriteStream(path, options) {
          if (this instanceof WriteStream)
            return (fs$WriteStream.apply(this, arguments), this);
          else
            return WriteStream.apply(
              Object.create(WriteStream.prototype),
              arguments,
            );
        }
        function WriteStream$open() {
          var that = this;
          open(that.path, that.flags, that.mode, function (err, fd) {
            if (err) {
              that.destroy();
              that.emit("error", err);
            } else {
              that.fd = fd;
              that.emit("open", fd);
            }
          });
        }
        function createReadStream(path, options) {
          return new fs.ReadStream(path, options);
        }
        function createWriteStream(path, options) {
          return new fs.WriteStream(path, options);
        }
        var fs$open = fs.open;
        fs.open = open;
        function open(path, flags, mode, cb) {
          if (typeof mode === "function") ((cb = mode), (mode = null));
          return go$open(path, flags, mode, cb);
          function go$open(path, flags, mode, cb, startTime) {
            return fs$open(path, flags, mode, function (err, fd) {
              if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
                enqueue([
                  go$open,
                  [path, flags, mode, cb],
                  err,
                  startTime || Date.now(),
                  Date.now(),
                ]);
              else {
                if (typeof cb === "function") cb.apply(this, arguments);
              }
            });
          }
        }
        return fs;
      }
      function enqueue(elem) {
        debug("ENQUEUE", elem[0].name, elem[1]);
        fs[gracefulQueue].push(elem);
        retry();
      }
      var retryTimer;
      function resetQueue() {
        var now = Date.now();
        for (var i = 0; i < fs[gracefulQueue].length; ++i) {
          if (fs[gracefulQueue][i].length > 2) {
            fs[gracefulQueue][i][3] = now;
            fs[gracefulQueue][i][4] = now;
          }
        }
        retry();
      }
      function retry() {
        clearTimeout(retryTimer);
        retryTimer = undefined;
        if (fs[gracefulQueue].length === 0) return;
        var elem = fs[gracefulQueue].shift();
        var fn = elem[0];
        var args = elem[1];
        var err = elem[2];
        var startTime = elem[3];
        var lastTime = elem[4];
        if (startTime === undefined) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args);
        } else if (Date.now() - startTime >= 6e4) {
          debug("TIMEOUT", fn.name, args);
          var cb = args.pop();
          if (typeof cb === "function") cb.call(null, err);
        } else {
          var sinceAttempt = Date.now() - lastTime;
          var sinceStart = Math.max(lastTime - startTime, 1);
          var desiredDelay = Math.min(sinceStart * 1.2, 100);
          if (sinceAttempt >= desiredDelay) {
            debug("RETRY", fn.name, args);
            fn.apply(null, args.concat([startTime]));
          } else {
            fs[gracefulQueue].push(elem);
          }
        }
        if (retryTimer === undefined) {
          retryTimer = setTimeout(retry, 0);
        }
      }
    },
    6383: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var Stream = __nccwpck_require__(2203).Stream;
      module.exports = legacy;
      function legacy(fs) {
        return { ReadStream, WriteStream };
        function ReadStream(path, options) {
          if (!(this instanceof ReadStream))
            return new ReadStream(path, options);
          Stream.call(this);
          var self = this;
          this.path = path;
          this.fd = null;
          this.readable = true;
          this.paused = false;
          this.flags = "r";
          this.mode = 438;
          this.bufferSize = 64 * 1024;
          options = options || {};
          var keys = Object.keys(options);
          for (var index = 0, length = keys.length; index < length; index++) {
            var key = keys[index];
            this[key] = options[key];
          }
          if (this.encoding) this.setEncoding(this.encoding);
          if (this.start !== undefined) {
            if ("number" !== typeof this.start) {
              throw TypeError("start must be a Number");
            }
            if (this.end === undefined) {
              this.end = Infinity;
            } else if ("number" !== typeof this.end) {
              throw TypeError("end must be a Number");
            }
            if (this.start > this.end) {
              throw new Error("start must be <= end");
            }
            this.pos = this.start;
          }
          if (this.fd !== null) {
            process.nextTick(function () {
              self._read();
            });
            return;
          }
          fs.open(this.path, this.flags, this.mode, function (err, fd) {
            if (err) {
              self.emit("error", err);
              self.readable = false;
              return;
            }
            self.fd = fd;
            self.emit("open", fd);
            self._read();
          });
        }
        function WriteStream(path, options) {
          if (!(this instanceof WriteStream))
            return new WriteStream(path, options);
          Stream.call(this);
          this.path = path;
          this.fd = null;
          this.writable = true;
          this.flags = "w";
          this.encoding = "binary";
          this.mode = 438;
          this.bytesWritten = 0;
          options = options || {};
          var keys = Object.keys(options);
          for (var index = 0, length = keys.length; index < length; index++) {
            var key = keys[index];
            this[key] = options[key];
          }
          if (this.start !== undefined) {
            if ("number" !== typeof this.start) {
              throw TypeError("start must be a Number");
            }
            if (this.start < 0) {
              throw new Error("start must be >= zero");
            }
            this.pos = this.start;
          }
          this.busy = false;
          this._queue = [];
          if (this.fd === null) {
            this._open = fs.open;
            this._queue.push([
              this._open,
              this.path,
              this.flags,
              this.mode,
              undefined,
            ]);
            this.flush();
          }
        }
      }
    },
    6190: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var constants = __nccwpck_require__(9140);
      var origCwd = process.cwd;
      var cwd = null;
      var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
      process.cwd = function () {
        if (!cwd) cwd = origCwd.call(process);
        return cwd;
      };
      try {
        process.cwd();
      } catch (er) {}
      if (typeof process.chdir === "function") {
        var chdir = process.chdir;
        process.chdir = function (d) {
          cwd = null;
          chdir.call(process, d);
        };
        if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
      }
      module.exports = patch;
      function patch(fs) {
        if (
          constants.hasOwnProperty("O_SYMLINK") &&
          process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)
        ) {
          patchLchmod(fs);
        }
        if (!fs.lutimes) {
          patchLutimes(fs);
        }
        fs.chown = chownFix(fs.chown);
        fs.fchown = chownFix(fs.fchown);
        fs.lchown = chownFix(fs.lchown);
        fs.chmod = chmodFix(fs.chmod);
        fs.fchmod = chmodFix(fs.fchmod);
        fs.lchmod = chmodFix(fs.lchmod);
        fs.chownSync = chownFixSync(fs.chownSync);
        fs.fchownSync = chownFixSync(fs.fchownSync);
        fs.lchownSync = chownFixSync(fs.lchownSync);
        fs.chmodSync = chmodFixSync(fs.chmodSync);
        fs.fchmodSync = chmodFixSync(fs.fchmodSync);
        fs.lchmodSync = chmodFixSync(fs.lchmodSync);
        fs.stat = statFix(fs.stat);
        fs.fstat = statFix(fs.fstat);
        fs.lstat = statFix(fs.lstat);
        fs.statSync = statFixSync(fs.statSync);
        fs.fstatSync = statFixSync(fs.fstatSync);
        fs.lstatSync = statFixSync(fs.lstatSync);
        if (fs.chmod && !fs.lchmod) {
          fs.lchmod = function (path, mode, cb) {
            if (cb) process.nextTick(cb);
          };
          fs.lchmodSync = function () {};
        }
        if (fs.chown && !fs.lchown) {
          fs.lchown = function (path, uid, gid, cb) {
            if (cb) process.nextTick(cb);
          };
          fs.lchownSync = function () {};
        }
        if (platform === "win32") {
          fs.rename =
            typeof fs.rename !== "function"
              ? fs.rename
              : (function (fs$rename) {
                  function rename(from, to, cb) {
                    var start = Date.now();
                    var backoff = 0;
                    fs$rename(from, to, function CB(er) {
                      if (
                        er &&
                        (er.code === "EACCES" ||
                          er.code === "EPERM" ||
                          er.code === "EBUSY") &&
                        Date.now() - start < 6e4
                      ) {
                        setTimeout(function () {
                          fs.stat(to, function (stater, st) {
                            if (stater && stater.code === "ENOENT")
                              fs$rename(from, to, CB);
                            else cb(er);
                          });
                        }, backoff);
                        if (backoff < 100) backoff += 10;
                        return;
                      }
                      if (cb) cb(er);
                    });
                  }
                  if (Object.setPrototypeOf)
                    Object.setPrototypeOf(rename, fs$rename);
                  return rename;
                })(fs.rename);
        }
        fs.read =
          typeof fs.read !== "function"
            ? fs.read
            : (function (fs$read) {
                function read(fd, buffer, offset, length, position, callback_) {
                  var callback;
                  if (callback_ && typeof callback_ === "function") {
                    var eagCounter = 0;
                    callback = function (er, _, __) {
                      if (er && er.code === "EAGAIN" && eagCounter < 10) {
                        eagCounter++;
                        return fs$read.call(
                          fs,
                          fd,
                          buffer,
                          offset,
                          length,
                          position,
                          callback,
                        );
                      }
                      callback_.apply(this, arguments);
                    };
                  }
                  return fs$read.call(
                    fs,
                    fd,
                    buffer,
                    offset,
                    length,
                    position,
                    callback,
                  );
                }
                if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
                return read;
              })(fs.read);
        fs.readSync =
          typeof fs.readSync !== "function"
            ? fs.readSync
            : (function (fs$readSync) {
                return function (fd, buffer, offset, length, position) {
                  var eagCounter = 0;
                  while (true) {
                    try {
                      return fs$readSync.call(
                        fs,
                        fd,
                        buffer,
                        offset,
                        length,
                        position,
                      );
                    } catch (er) {
                      if (er.code === "EAGAIN" && eagCounter < 10) {
                        eagCounter++;
                        continue;
                      }
                      throw er;
                    }
                  }
                };
              })(fs.readSync);
        function patchLchmod(fs) {
          fs.lchmod = function (path, mode, callback) {
            fs.open(
              path,
              constants.O_WRONLY | constants.O_SYMLINK,
              mode,
              function (err, fd) {
                if (err) {
                  if (callback) callback(err);
                  return;
                }
                fs.fchmod(fd, mode, function (err) {
                  fs.close(fd, function (err2) {
                    if (callback) callback(err || err2);
                  });
                });
              },
            );
          };
          fs.lchmodSync = function (path, mode) {
            var fd = fs.openSync(
              path,
              constants.O_WRONLY | constants.O_SYMLINK,
              mode,
            );
            var threw = true;
            var ret;
            try {
              ret = fs.fchmodSync(fd, mode);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs.closeSync(fd);
                } catch (er) {}
              } else {
                fs.closeSync(fd);
              }
            }
            return ret;
          };
        }
        function patchLutimes(fs) {
          if (constants.hasOwnProperty("O_SYMLINK") && fs.futimes) {
            fs.lutimes = function (path, at, mt, cb) {
              fs.open(path, constants.O_SYMLINK, function (er, fd) {
                if (er) {
                  if (cb) cb(er);
                  return;
                }
                fs.futimes(fd, at, mt, function (er) {
                  fs.close(fd, function (er2) {
                    if (cb) cb(er || er2);
                  });
                });
              });
            };
            fs.lutimesSync = function (path, at, mt) {
              var fd = fs.openSync(path, constants.O_SYMLINK);
              var ret;
              var threw = true;
              try {
                ret = fs.futimesSync(fd, at, mt);
                threw = false;
              } finally {
                if (threw) {
                  try {
                    fs.closeSync(fd);
                  } catch (er) {}
                } else {
                  fs.closeSync(fd);
                }
              }
              return ret;
            };
          } else if (fs.futimes) {
            fs.lutimes = function (_a, _b, _c, cb) {
              if (cb) process.nextTick(cb);
            };
            fs.lutimesSync = function () {};
          }
        }
        function chmodFix(orig) {
          if (!orig) return orig;
          return function (target, mode, cb) {
            return orig.call(fs, target, mode, function (er) {
              if (chownErOk(er)) er = null;
              if (cb) cb.apply(this, arguments);
            });
          };
        }
        function chmodFixSync(orig) {
          if (!orig) return orig;
          return function (target, mode) {
            try {
              return orig.call(fs, target, mode);
            } catch (er) {
              if (!chownErOk(er)) throw er;
            }
          };
        }
        function chownFix(orig) {
          if (!orig) return orig;
          return function (target, uid, gid, cb) {
            return orig.call(fs, target, uid, gid, function (er) {
              if (chownErOk(er)) er = null;
              if (cb) cb.apply(this, arguments);
            });
          };
        }
        function chownFixSync(orig) {
          if (!orig) return orig;
          return function (target, uid, gid) {
            try {
              return orig.call(fs, target, uid, gid);
            } catch (er) {
              if (!chownErOk(er)) throw er;
            }
          };
        }
        function statFix(orig) {
          if (!orig) return orig;
          return function (target, options, cb) {
            if (typeof options === "function") {
              cb = options;
              options = null;
            }
            function callback(er, stats) {
              if (stats) {
                if (stats.uid < 0) stats.uid += 4294967296;
                if (stats.gid < 0) stats.gid += 4294967296;
              }
              if (cb) cb.apply(this, arguments);
            }
            return options
              ? orig.call(fs, target, options, callback)
              : orig.call(fs, target, callback);
          };
        }
        function statFixSync(orig) {
          if (!orig) return orig;
          return function (target, options) {
            var stats = options
              ? orig.call(fs, target, options)
              : orig.call(fs, target);
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            return stats;
          };
        }
        function chownErOk(er) {
          if (!er) return true;
          if (er.code === "ENOSYS") return true;
          var nonroot = !process.getuid || process.getuid() !== 0;
          if (nonroot) {
            if (er.code === "EINVAL" || er.code === "EPERM") return true;
          }
          return false;
        }
      }
    },
    7642: (module, __unused_webpack_exports, __nccwpck_require__) => {
      function __ncc_wildcard$0(arg) {
        if (arg === "bmp.js" || arg === "bmp") return __nccwpck_require__(7303);
        else if (arg === "dds.js" || arg === "dds")
          return __nccwpck_require__(2205);
        else if (arg === "gif.js" || arg === "gif")
          return __nccwpck_require__(2466);
        else if (arg === "jpg.js" || arg === "jpg")
          return __nccwpck_require__(6927);
        else if (arg === "png.js" || arg === "png")
          return __nccwpck_require__(4859);
        else if (arg === "psd.js" || arg === "psd")
          return __nccwpck_require__(4447);
        else if (arg === "svg.js" || arg === "svg")
          return __nccwpck_require__(7698);
        else if (arg === "tiff.js" || arg === "tiff")
          return __nccwpck_require__(2485);
        else if (arg === "webp.js" || arg === "webp")
          return __nccwpck_require__(9784);
      }
      ("use strict");
      var typeMap = {};
      var types = __nccwpck_require__(6951);
      types.forEach(function (type) {
        typeMap[type] = __ncc_wildcard$0(type).detect;
      });
      module.exports = function (buffer, filepath) {
        var type, result;
        for (type in typeMap) {
          result = typeMap[type](buffer, filepath);
          if (result) {
            return type;
          }
        }
      };
    },
    9693: (module, __unused_webpack_exports, __nccwpck_require__) => {
      function __ncc_wildcard$0(arg) {
        if (arg === "bmp.js" || arg === "bmp") return __nccwpck_require__(7303);
        else if (arg === "dds.js" || arg === "dds")
          return __nccwpck_require__(2205);
        else if (arg === "gif.js" || arg === "gif")
          return __nccwpck_require__(2466);
        else if (arg === "jpg.js" || arg === "jpg")
          return __nccwpck_require__(6927);
        else if (arg === "png.js" || arg === "png")
          return __nccwpck_require__(4859);
        else if (arg === "psd.js" || arg === "psd")
          return __nccwpck_require__(4447);
        else if (arg === "svg.js" || arg === "svg")
          return __nccwpck_require__(7698);
        else if (arg === "tiff.js" || arg === "tiff")
          return __nccwpck_require__(2485);
        else if (arg === "webp.js" || arg === "webp")
          return __nccwpck_require__(9784);
      }
      ("use strict");
      var fs = __nccwpck_require__(9896);
      var path = __nccwpck_require__(6928);
      var detector = __nccwpck_require__(7642);
      var handlers = {};
      var types = __nccwpck_require__(6951);
      types.forEach(function (type) {
        handlers[type] = __ncc_wildcard$0(type);
      });
      var MaxBufferSize = 128 * 1024;
      function lookup(buffer, filepath) {
        var type = detector(buffer, filepath);
        if (type in handlers) {
          var size = handlers[type].calculate(buffer, filepath);
          if (size !== false) {
            size.type = type;
            return size;
          }
        }
        throw new TypeError(
          "unsupported file type: " + type + " (file: " + filepath + ")",
        );
      }
      function asyncFileToBuffer(filepath, callback) {
        fs.open(filepath, "r", function (err, descriptor) {
          if (err) {
            return callback(err);
          }
          var size = fs.fstatSync(descriptor).size;
          if (size <= 0) {
            return callback(
              new Error("File size is not greater than 0 —— " + filepath),
            );
          }
          var bufferSize = Math.min(size, MaxBufferSize);
          var buffer = new Buffer(bufferSize);
          fs.read(descriptor, buffer, 0, bufferSize, 0, function (err) {
            if (err) {
              return callback(err);
            }
            fs.close(descriptor, function (err) {
              callback(err, buffer);
            });
          });
        });
      }
      function syncFileToBuffer(filepath) {
        var descriptor = fs.openSync(filepath, "r");
        var size = fs.fstatSync(descriptor).size;
        var bufferSize = Math.min(size, MaxBufferSize);
        var buffer = new Buffer(bufferSize);
        fs.readSync(descriptor, buffer, 0, bufferSize, 0);
        fs.closeSync(descriptor);
        return buffer;
      }
      module.exports = function (input, callback) {
        if (Buffer.isBuffer(input)) {
          return lookup(input);
        }
        if (typeof input !== "string") {
          throw new TypeError("invalid invocation");
        }
        var filepath = path.resolve(input);
        if (typeof callback === "function") {
          asyncFileToBuffer(filepath, function (err, buffer) {
            if (err) {
              return callback(err);
            }
            var dimensions;
            try {
              dimensions = lookup(buffer, filepath);
            } catch (e) {
              err = e;
            }
            callback(err, dimensions);
          });
        } else {
          var buffer = syncFileToBuffer(filepath);
          return lookup(buffer, filepath);
        }
      };
      module.exports.types = types;
    },
    5780: (module) => {
      "use strict";
      function readUInt(buffer, bits, offset, isBigEndian) {
        offset = offset || 0;
        var endian = !!isBigEndian ? "BE" : "LE";
        var method = buffer["readUInt" + bits + endian];
        return method.call(buffer, offset);
      }
      module.exports = readUInt;
    },
    6951: (module) => {
      "use strict";
      module.exports = [
        "bmp",
        "gif",
        "jpg",
        "png",
        "psd",
        "svg",
        "tiff",
        "webp",
        "dds",
      ];
    },
    7303: (module) => {
      "use strict";
      function isBMP(buffer) {
        return "BM" === buffer.toString("ascii", 0, 2);
      }
      function calculate(buffer) {
        return {
          width: buffer.readUInt32LE(18),
          height: Math.abs(buffer.readInt32LE(22)),
        };
      }
      module.exports = { detect: isBMP, calculate };
    },
    2205: (module) => {
      "use strict";
      function isDDS(buffer) {
        return buffer.readUInt32LE(0) === 542327876;
      }
      function calculate(buffer) {
        return {
          height: buffer.readUInt32LE(12),
          width: buffer.readUInt32LE(16),
        };
      }
      module.exports = { detect: isDDS, calculate };
    },
    2466: (module) => {
      "use strict";
      var gifRegexp = /^GIF8[79]a/;
      function isGIF(buffer) {
        var signature = buffer.toString("ascii", 0, 6);
        return gifRegexp.test(signature);
      }
      function calculate(buffer) {
        return {
          width: buffer.readUInt16LE(6),
          height: buffer.readUInt16LE(8),
        };
      }
      module.exports = { detect: isGIF, calculate };
    },
    6927: (module) => {
      "use strict";
      function isJPG(buffer) {
        var SOIMarker = buffer.toString("hex", 0, 2);
        return "ffd8" === SOIMarker;
      }
      function extractSize(buffer, i) {
        return {
          height: buffer.readUInt16BE(i),
          width: buffer.readUInt16BE(i + 2),
        };
      }
      function validateBuffer(buffer, i) {
        if (i > buffer.length) {
          throw new TypeError("Corrupt JPG, exceeded buffer limits");
        }
        if (buffer[i] !== 255) {
          throw new TypeError("Invalid JPG, marker table corrupted");
        }
      }
      function calculate(buffer) {
        buffer = buffer.slice(4);
        var i, next;
        while (buffer.length) {
          i = buffer.readUInt16BE(0);
          validateBuffer(buffer, i);
          next = buffer[i + 1];
          if (next === 192 || next === 193 || next === 194) {
            return extractSize(buffer, i + 5);
          }
          buffer = buffer.slice(i + 2);
        }
        throw new TypeError("Invalid JPG, no size found");
      }
      module.exports = { detect: isJPG, calculate };
    },
    4859: (module) => {
      "use strict";
      var pngSignature = "PNG\r\n\n";
      var pngImageHeaderChunkName = "IHDR";
      var pngFriedChunkName = "CgBI";
      function isPNG(buffer) {
        if (pngSignature === buffer.toString("ascii", 1, 8)) {
          var chunkName = buffer.toString("ascii", 12, 16);
          if (chunkName === pngFriedChunkName) {
            chunkName = buffer.toString("ascii", 28, 32);
          }
          if (chunkName !== pngImageHeaderChunkName) {
            throw new TypeError("invalid png");
          }
          return true;
        }
      }
      function calculate(buffer) {
        if (buffer.toString("ascii", 12, 16) === pngFriedChunkName) {
          return {
            width: buffer.readUInt32BE(32),
            height: buffer.readUInt32BE(36),
          };
        }
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        };
      }
      module.exports = { detect: isPNG, calculate };
    },
    4447: (module) => {
      "use strict";
      function isPSD(buffer) {
        return "8BPS" === buffer.toString("ascii", 0, 4);
      }
      function calculate(buffer) {
        return {
          width: buffer.readUInt32BE(18),
          height: buffer.readUInt32BE(14),
        };
      }
      module.exports = { detect: isPSD, calculate };
    },
    7698: (module) => {
      "use strict";
      var svgReg = /<svg[^>]+[^>]*>/;
      function isSVG(buffer) {
        return svgReg.test(buffer);
      }
      var extractorRegExps = {
        root: /<svg\s[^>]+>/,
        width: /\bwidth=(['"])([^%]+?)\1/,
        height: /\bheight=(['"])([^%]+?)\1/,
        viewbox: /\bviewBox=(['"])(.+?)\1/,
      };
      function parseViewbox(viewbox) {
        var bounds = viewbox.split(" ");
        return {
          width: parseInt(bounds[2], 10),
          height: parseInt(bounds[3], 10),
        };
      }
      function parseAttributes(root) {
        var width = root.match(extractorRegExps.width);
        var height = root.match(extractorRegExps.height);
        var viewbox = root.match(extractorRegExps.viewbox);
        return {
          width: width && parseInt(width[2], 10),
          height: height && parseInt(height[2], 10),
          viewbox: viewbox && parseViewbox(viewbox[2]),
        };
      }
      function calculateByDimensions(attrs) {
        return { width: attrs.width, height: attrs.height };
      }
      function calculateByViewbox(attrs) {
        var ratio = attrs.viewbox.width / attrs.viewbox.height;
        if (attrs.width) {
          return {
            width: attrs.width,
            height: Math.floor(attrs.width / ratio),
          };
        }
        if (attrs.height) {
          return {
            width: Math.floor(attrs.height * ratio),
            height: attrs.height,
          };
        }
        return { width: attrs.viewbox.width, height: attrs.viewbox.height };
      }
      function calculate(buffer) {
        var root = buffer.toString("utf8").match(extractorRegExps.root);
        if (root) {
          var attrs = parseAttributes(root[0]);
          if (attrs.width && attrs.height) {
            return calculateByDimensions(attrs);
          }
          if (attrs.viewbox) {
            return calculateByViewbox(attrs);
          }
        }
        throw new TypeError("invalid svg");
      }
      module.exports = { detect: isSVG, calculate };
    },
    2485: (module, __unused_webpack_exports, __nccwpck_require__) => {
      "use strict";
      var fs = __nccwpck_require__(9896);
      var readUInt = __nccwpck_require__(5780);
      function isTIFF(buffer) {
        var hex4 = buffer.toString("hex", 0, 4);
        return "49492a00" === hex4 || "4d4d002a" === hex4;
      }
      function readIFD(buffer, filepath, isBigEndian) {
        var ifdOffset = readUInt(buffer, 32, 4, isBigEndian);
        var bufferSize = 1024;
        var fileSize = fs.statSync(filepath).size;
        if (ifdOffset + bufferSize > fileSize) {
          bufferSize = fileSize - ifdOffset - 10;
        }
        var endBuffer = new Buffer(bufferSize);
        var descriptor = fs.openSync(filepath, "r");
        fs.readSync(descriptor, endBuffer, 0, bufferSize, ifdOffset);
        var ifdBuffer = endBuffer.slice(2);
        return ifdBuffer;
      }
      function readValue(buffer, isBigEndian) {
        var low = readUInt(buffer, 16, 8, isBigEndian);
        var high = readUInt(buffer, 16, 10, isBigEndian);
        return (high << 16) + low;
      }
      function nextTag(buffer) {
        if (buffer.length > 24) {
          return buffer.slice(12);
        }
      }
      function extractTags(buffer, isBigEndian) {
        var tags = {};
        var code, type, length;
        while (buffer && buffer.length) {
          code = readUInt(buffer, 16, 0, isBigEndian);
          type = readUInt(buffer, 16, 2, isBigEndian);
          length = readUInt(buffer, 32, 4, isBigEndian);
          if (code === 0) {
            break;
          } else {
            if (length === 1 && (type === 3 || type === 4)) {
              tags[code] = readValue(buffer, isBigEndian);
            }
            buffer = nextTag(buffer);
          }
        }
        return tags;
      }
      function determineEndianness(buffer) {
        var signature = buffer.toString("ascii", 0, 2);
        if ("II" === signature) {
          return "LE";
        } else if ("MM" === signature) {
          return "BE";
        }
      }
      function calculate(buffer, filepath) {
        if (!filepath) {
          throw new TypeError("Tiff doesn't support buffer");
        }
        var isBigEndian = determineEndianness(buffer) === "BE";
        var ifdBuffer = readIFD(buffer, filepath, isBigEndian);
        var tags = extractTags(ifdBuffer, isBigEndian);
        var width = tags[256];
        var height = tags[257];
        if (!width || !height) {
          throw new TypeError("Invalid Tiff, missing tags");
        }
        return { width, height };
      }
      module.exports = { detect: isTIFF, calculate };
    },
    9784: (module) => {
      "use strict";
      function isWebP(buffer) {
        var riffHeader = "RIFF" === buffer.toString("ascii", 0, 4);
        var webpHeader = "WEBP" === buffer.toString("ascii", 8, 12);
        var vp8Header = "VP8" === buffer.toString("ascii", 12, 15);
        return riffHeader && webpHeader && vp8Header;
      }
      function calculate(buffer) {
        var chunkHeader = buffer.toString("ascii", 12, 16);
        buffer = buffer.slice(20, 30);
        if (chunkHeader === "VP8X") {
          var extendedHeader = buffer[0];
          var validStart = (extendedHeader & 192) === 0;
          var validEnd = (extendedHeader & 1) === 0;
          if (validStart && validEnd) {
            return calculateExtended(buffer);
          } else {
            return false;
          }
        }
        if (chunkHeader === "VP8 " && buffer[0] !== 47) {
          return calculateLossy(buffer);
        }
        var signature = buffer.toString("hex", 3, 6);
        if (chunkHeader === "VP8L" && signature !== "9d012a") {
          return calculateLossless(buffer);
        }
        return false;
      }
      function calculateExtended(buffer) {
        return {
          width: 1 + buffer.readUIntLE(4, 3),
          height: 1 + buffer.readUIntLE(7, 3),
        };
      }
      function calculateLossless(buffer) {
        return {
          width: 1 + (((buffer[2] & 63) << 8) | buffer[1]),
          height:
            1 +
            (((buffer[4] & 15) << 10) |
              (buffer[3] << 2) |
              ((buffer[2] & 192) >> 6)),
        };
      }
      function calculateLossy(buffer) {
        return {
          width: buffer.readInt16LE(6) & 16383,
          height: buffer.readInt16LE(8) & 16383,
        };
      }
      module.exports = { detect: isWebP, calculate };
    },
    9994: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function getType(payload) {
        return Object.prototype.toString.call(payload).slice(8, -1);
      }
      function isUndefined(payload) {
        return getType(payload) === "Undefined";
      }
      function isNull(payload) {
        return getType(payload) === "Null";
      }
      function isPlainObject(payload) {
        if (getType(payload) !== "Object") return false;
        return (
          payload.constructor === Object &&
          Object.getPrototypeOf(payload) === Object.prototype
        );
      }
      function isObject(payload) {
        return isPlainObject(payload);
      }
      function isEmptyObject(payload) {
        return isPlainObject(payload) && Object.keys(payload).length === 0;
      }
      function isFullObject(payload) {
        return isPlainObject(payload) && Object.keys(payload).length > 0;
      }
      function isAnyObject(payload) {
        return getType(payload) === "Object";
      }
      function isObjectLike(payload) {
        return isAnyObject(payload);
      }
      function isFunction(payload) {
        return typeof payload === "function";
      }
      function isArray(payload) {
        return getType(payload) === "Array";
      }
      function isFullArray(payload) {
        return isArray(payload) && payload.length > 0;
      }
      function isEmptyArray(payload) {
        return isArray(payload) && payload.length === 0;
      }
      function isString(payload) {
        return getType(payload) === "String";
      }
      function isFullString(payload) {
        return isString(payload) && payload !== "";
      }
      function isEmptyString(payload) {
        return payload === "";
      }
      function isNumber(payload) {
        return getType(payload) === "Number" && !isNaN(payload);
      }
      function isBoolean(payload) {
        return getType(payload) === "Boolean";
      }
      function isRegExp(payload) {
        return getType(payload) === "RegExp";
      }
      function isMap(payload) {
        return getType(payload) === "Map";
      }
      function isWeakMap(payload) {
        return getType(payload) === "WeakMap";
      }
      function isSet(payload) {
        return getType(payload) === "Set";
      }
      function isWeakSet(payload) {
        return getType(payload) === "WeakSet";
      }
      function isSymbol(payload) {
        return getType(payload) === "Symbol";
      }
      function isDate(payload) {
        return getType(payload) === "Date" && !isNaN(payload);
      }
      function isBlob(payload) {
        return getType(payload) === "Blob";
      }
      function isFile(payload) {
        return getType(payload) === "File";
      }
      function isPromise(payload) {
        return getType(payload) === "Promise";
      }
      function isError(payload) {
        return getType(payload) === "Error";
      }
      function isNaNValue(payload) {
        return getType(payload) === "Number" && isNaN(payload);
      }
      function isPrimitive(payload) {
        return (
          isBoolean(payload) ||
          isNull(payload) ||
          isUndefined(payload) ||
          isNumber(payload) ||
          isString(payload) ||
          isSymbol(payload)
        );
      }
      var isNullOrUndefined = isOneOf(isNull, isUndefined);
      function isOneOf(a, b, c, d, e) {
        return function (value) {
          return (
            a(value) ||
            b(value) ||
            (!!c && c(value)) ||
            (!!d && d(value)) ||
            (!!e && e(value))
          );
        };
      }
      function isType(payload, type) {
        if (!(type instanceof Function)) {
          throw new TypeError("Type must be a function");
        }
        if (!Object.prototype.hasOwnProperty.call(type, "prototype")) {
          throw new TypeError("Type is not a class");
        }
        var name = type.name;
        return (
          getType(payload) === name ||
          Boolean(payload && payload.constructor === type)
        );
      }
      exports.getType = getType;
      exports.isAnyObject = isAnyObject;
      exports.isArray = isArray;
      exports.isBlob = isBlob;
      exports.isBoolean = isBoolean;
      exports.isDate = isDate;
      exports.isEmptyArray = isEmptyArray;
      exports.isEmptyObject = isEmptyObject;
      exports.isEmptyString = isEmptyString;
      exports.isError = isError;
      exports.isFile = isFile;
      exports.isFullArray = isFullArray;
      exports.isFullObject = isFullObject;
      exports.isFullString = isFullString;
      exports.isFunction = isFunction;
      exports.isMap = isMap;
      exports.isNaNValue = isNaNValue;
      exports.isNull = isNull;
      exports.isNullOrUndefined = isNullOrUndefined;
      exports.isNumber = isNumber;
      exports.isObject = isObject;
      exports.isObjectLike = isObjectLike;
      exports.isOneOf = isOneOf;
      exports.isPlainObject = isPlainObject;
      exports.isPrimitive = isPrimitive;
      exports.isPromise = isPromise;
      exports.isRegExp = isRegExp;
      exports.isSet = isSet;
      exports.isString = isString;
      exports.isSymbol = isSymbol;
      exports.isType = isType;
      exports.isUndefined = isUndefined;
      exports.isWeakMap = isWeakMap;
      exports.isWeakSet = isWeakSet;
    },
    7243: (module, __unused_webpack_exports, __nccwpck_require__) => {
      module.exports = __nccwpck_require__(6456)["default"];
    },
    2645: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports["default"] = {
        encodeBase64: function encodeBase64(str) {
          var buffer = Buffer.from ? Buffer.from(str) : new Buffer(str);
          return buffer.toString("base64");
        },
        mimeLookup: function (filename) {
          return __nccwpck_require__(375).lookup(filename);
        },
        charsetLookup: function (mime) {
          return __nccwpck_require__(375).charsets.lookup(mime);
        },
        getSourceMapGenerator: function getSourceMapGenerator() {
          return __nccwpck_require__(1361).SourceMapGenerator;
        },
      };
    },
    4722: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var path_1 = tslib_1.__importDefault(__nccwpck_require__(6928));
      var fs_1 = tslib_1.__importDefault(__nccwpck_require__(9817));
      var abstract_file_manager_js_1 = tslib_1.__importDefault(
        __nccwpck_require__(758),
      );
      var FileManager = function () {};
      FileManager.prototype = Object.assign(
        new abstract_file_manager_js_1.default(),
        {
          supports: function () {
            return true;
          },
          supportsSync: function () {
            return true;
          },
          loadFile: function (
            filename,
            currentDirectory,
            options,
            environment,
            callback,
          ) {
            var fullFilename;
            var isAbsoluteFilename = this.isPathAbsolute(filename);
            var filenamesTried = [];
            var self = this;
            var prefix = filename.slice(0, 1);
            var explicit = prefix === "." || prefix === "/";
            var result = null;
            var isNodeModule = false;
            var npmPrefix = "npm://";
            options = options || {};
            var paths = isAbsoluteFilename ? [""] : [currentDirectory];
            if (options.paths) {
              paths.push.apply(paths, options.paths);
            }
            if (!isAbsoluteFilename && paths.indexOf(".") === -1) {
              paths.push(".");
            }
            var prefixes = options.prefixes || [""];
            var fileParts = this.extractUrlParts(filename);
            if (options.syncImport) {
              getFileData(returnData, returnData);
              if (callback) {
                callback(result.error, result);
              } else {
                return result;
              }
            } else {
              return new Promise(getFileData);
            }
            function returnData(data) {
              if (!data.filename) {
                result = { error: data };
              } else {
                result = data;
              }
            }
            function getFileData(fulfill, reject) {
              (function tryPathIndex(i) {
                function tryWithExtension() {
                  var extFilename = options.ext
                    ? self.tryAppendExtension(fullFilename, options.ext)
                    : fullFilename;
                  if (
                    extFilename !== fullFilename &&
                    !explicit &&
                    paths[i] === "."
                  ) {
                    try {
                      fullFilename = require.resolve(extFilename);
                      isNodeModule = true;
                    } catch (e) {
                      filenamesTried.push(npmPrefix + extFilename);
                      fullFilename = extFilename;
                    }
                  } else {
                    fullFilename = extFilename;
                  }
                }
                if (i < paths.length) {
                  (function tryPrefix(j) {
                    if (j < prefixes.length) {
                      isNodeModule = false;
                      fullFilename =
                        fileParts.rawPath + prefixes[j] + fileParts.filename;
                      if (paths[i]) {
                        fullFilename = path_1.default.join(
                          paths[i],
                          fullFilename,
                        );
                      }
                      if (!explicit && paths[i] === ".") {
                        try {
                          fullFilename = require.resolve(fullFilename);
                          isNodeModule = true;
                        } catch (e) {
                          filenamesTried.push(npmPrefix + fullFilename);
                          tryWithExtension();
                        }
                      } else {
                        tryWithExtension();
                      }
                      var readFileArgs = [fullFilename];
                      if (!options.rawBuffer) {
                        readFileArgs.push("utf-8");
                      }
                      if (options.syncImport) {
                        try {
                          var data = fs_1.default.readFileSync.apply(
                            this,
                            readFileArgs,
                          );
                          fulfill({ contents: data, filename: fullFilename });
                        } catch (e) {
                          filenamesTried.push(
                            isNodeModule
                              ? npmPrefix + fullFilename
                              : fullFilename,
                          );
                          return tryPrefix(j + 1);
                        }
                      } else {
                        readFileArgs.push(function (e, data) {
                          if (e) {
                            filenamesTried.push(
                              isNodeModule
                                ? npmPrefix + fullFilename
                                : fullFilename,
                            );
                            return tryPrefix(j + 1);
                          }
                          fulfill({ contents: data, filename: fullFilename });
                        });
                        fs_1.default.readFile.apply(this, readFileArgs);
                      }
                    } else {
                      tryPathIndex(i + 1);
                    }
                  })(0);
                } else {
                  reject({
                    type: "File",
                    message: "'"
                      .concat(filename, "' wasn't found. Tried - ")
                      .concat(filenamesTried.join(",")),
                  });
                }
              })(0);
            }
          },
          loadFileSync: function (
            filename,
            currentDirectory,
            options,
            environment,
          ) {
            options.syncImport = true;
            return this.loadFile(
              filename,
              currentDirectory,
              options,
              environment,
            );
          },
        },
      );
      exports["default"] = FileManager;
    },
    9817: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var fs;
      try {
        fs = __nccwpck_require__(5219);
      } catch (e) {
        fs = __nccwpck_require__(9896);
      }
      exports["default"] = fs;
    },
    5731: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      var __webpack_unused_export__;
      __webpack_unused_export__ = { value: true };
      var tslib_1 = __nccwpck_require__(5477);
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var function_registry_1 = tslib_1.__importDefault(
        __nccwpck_require__(3247),
      );
      exports.A = function (environment) {
        function imageSize(functionContext, filePathNode) {
          var filePath = filePathNode.value;
          var currentFileInfo = functionContext.currentFileInfo;
          var currentDirectory = currentFileInfo.rewriteUrls
            ? currentFileInfo.currentDirectory
            : currentFileInfo.entryPath;
          var fragmentStart = filePath.indexOf("#");
          if (fragmentStart !== -1) {
            filePath = filePath.slice(0, fragmentStart);
          }
          var fileManager = environment.getFileManager(
            filePath,
            currentDirectory,
            functionContext.context,
            environment,
            true,
          );
          if (!fileManager) {
            throw {
              type: "File",
              message: "Can not set up FileManager for ".concat(filePathNode),
            };
          }
          var fileSync = fileManager.loadFileSync(
            filePath,
            currentDirectory,
            functionContext.context,
            environment,
          );
          if (fileSync.error) {
            throw fileSync.error;
          }
          var sizeOf = __nccwpck_require__(9693);
          return sizeOf(fileSync.filename);
        }
        var imageFunctions = {
          "image-size": function (filePathNode) {
            var size = imageSize(this, filePathNode);
            return new expression_1.default([
              new dimension_1.default(size.width, "px"),
              new dimension_1.default(size.height, "px"),
            ]);
          },
          "image-width": function (filePathNode) {
            var size = imageSize(this, filePathNode);
            return new dimension_1.default(size.width, "px");
          },
          "image-height": function (filePathNode) {
            var size = imageSize(this, filePathNode);
            return new dimension_1.default(size.height, "px");
          },
        };
        function_registry_1.default.addMultiple(imageFunctions);
      };
    },
    6456: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      var __webpack_unused_export__;
      __webpack_unused_export__ = { value: true };
      var tslib_1 = __nccwpck_require__(5477);
      var environment_1 = tslib_1.__importDefault(__nccwpck_require__(2645));
      var file_manager_1 = tslib_1.__importDefault(__nccwpck_require__(4722));
      var url_file_manager_1 = tslib_1.__importDefault(
        __nccwpck_require__(5430),
      );
      var less_1 = tslib_1.__importDefault(__nccwpck_require__(4777));
      var less = (0, less_1.default)(environment_1.default, [
        new file_manager_1.default(),
        new url_file_manager_1.default(),
      ]);
      var lessc_helper_1 = tslib_1.__importDefault(__nccwpck_require__(9963));
      less.createFromEnvironment = less_1.default;
      less.lesscHelper = lessc_helper_1.default;
      less.PluginLoader = __nccwpck_require__(8829).A;
      less.fs = __nccwpck_require__(9817)["default"];
      less.FileManager = file_manager_1.default;
      less.UrlFileManager = url_file_manager_1.default;
      less.options = __nccwpck_require__(8111).A();
      __nccwpck_require__(5731).A(less.environment);
      exports["default"] = less;
    },
    9963: (__unused_webpack_module, exports) => {
      var lessc_helper = {
        stylize: function (str, style) {
          var styles = {
            reset: [0, 0],
            bold: [1, 22],
            inverse: [7, 27],
            underline: [4, 24],
            yellow: [33, 39],
            green: [32, 39],
            red: [31, 39],
            grey: [90, 39],
          };
          return "["
            .concat(styles[style][0], "m")
            .concat(str, "[")
            .concat(styles[style][1], "m");
        },
        printUsage: function () {
          console.log(
            "usage: lessc [option option=parameter ...] <source> [destination]",
          );
          console.log("");
          console.log(
            "If source is set to `-' (dash or hyphen-minus), input is read from stdin.",
          );
          console.log("");
          console.log("options:");
          console.log(
            "  -h, --help                   Prints help (this message) and exit.",
          );
          console.log(
            "  --include-path=PATHS         Sets include paths. Separated by `:'. `;' also supported on windows.",
          );
          console.log(
            "  -M, --depends                Outputs a makefile import dependency list to stdout.",
          );
          console.log(
            "  --no-color                   Disables colorized output.",
          );
          console.log(
            "  --ie-compat                  Enables IE8 compatibility checks.",
          );
          console.log(
            "  --js                         Enables inline JavaScript in less files",
          );
          console.log(
            "  -l, --lint                   Syntax check only (lint).",
          );
          console.log(
            "  -s, --silent                 Suppresses output of error messages.",
          );
          console.log(
            "  --quiet                      Suppresses output of warnings.",
          );
          console.log(
            "  --strict-imports             Forces evaluation of imports.",
          );
          console.log(
            "  --insecure                   Allows imports from insecure https hosts.",
          );
          console.log(
            "  -v, --version                Prints version number and exit.",
          );
          console.log("  --verbose                    Be verbose.");
          console.log(
            "  --source-map[=FILENAME]      Outputs a v3 sourcemap to the filename (or output filename.map).",
          );
          console.log(
            "  --source-map-rootpath=X      Adds this path onto the sourcemap filename and less file paths.",
          );
          console.log(
            "  --source-map-basepath=X      Sets sourcemap base path, defaults to current working directory.",
          );
          console.log(
            "  --source-map-include-source  Puts the less files into the map instead of referencing them.",
          );
          console.log(
            "  --source-map-inline          Puts the map (and any less files) as a base64 data uri into the output css file.",
          );
          console.log(
            "  --source-map-url=URL         Sets a custom URL to map file, for sourceMappingURL comment",
          );
          console.log("                               in generated CSS file.");
          console.log(
            "  --source-map-no-annotation   Excludes the sourceMappingURL comment from the output css file.",
          );
          console.log(
            "  -rp, --rootpath=URL          Sets rootpath for url rewriting in relative imports and urls",
          );
          console.log(
            "                               Works with or without the relative-urls option.",
          );
          console.log(
            "  -ru=, --rewrite-urls=        Rewrites URLs to make them relative to the base less file.",
          );
          console.log(
            "    all|local|off              'all' rewrites all URLs, 'local' just those starting with a '.'",
          );
          console.log("");
          console.log("  -m=, --math=");
          console.log(
            "     always                    Less will eagerly perform math operations always.",
          );
          console.log(
            "     parens-division           Math performed except for division (/) operator",
          );
          console.log(
            "     parens | strict           Math only performed inside parentheses",
          );
          console.log(
            "     strict-legacy             Parens required in very strict terms (legacy --strict-math)",
          );
          console.log("");
          console.log(
            "  -su=on|off                   Allows mixed units, e.g. 1px+1em or 1px*1px which have units",
          );
          console.log(
            "  --strict-units=on|off        that cannot be represented.",
          );
          console.log(
            "  --global-var='VAR=VALUE'     Defines a variable that can be referenced by the file.",
          );
          console.log(
            "  --modify-var='VAR=VALUE'     Modifies a variable already declared in the file.",
          );
          console.log(
            "  --url-args='QUERYSTRING'     Adds params into url tokens (e.g. 42, cb=42 or 'a=1&b=2')",
          );
          console.log(
            "  --plugin=PLUGIN=OPTIONS      Loads a plugin. You can also omit the --plugin= if the plugin begins",
          );
          console.log(
            "                               less-plugin. E.g. the clean css plugin is called less-plugin-clean-css",
          );
          console.log(
            "                               once installed (npm install less-plugin-clean-css), use either with",
          );
          console.log(
            "                               --plugin=less-plugin-clean-css or just --clean-css",
          );
          console.log(
            '                               specify options afterwards e.g. --plugin=less-plugin-clean-css="advanced"',
          );
          console.log(
            '                               or --clean-css="advanced"',
          );
          console.log(
            "  --disable-plugin-rule        Disallow @plugin statements",
          );
          console.log("");
          console.log("-------------------------- Deprecated ----------------");
          console.log(
            "  -sm=on|off               Legacy parens-only math. Use --math",
          );
          console.log("  --strict-math=on|off     ");
          console.log("");
          console.log(
            "  --line-numbers=TYPE      Outputs filename and line numbers.",
          );
          console.log(
            "                           TYPE can be either 'comments', which will output",
          );
          console.log(
            "                           the debug info within comments, 'mediaquery'",
          );
          console.log(
            "                           that will output the information within a fake",
          );
          console.log(
            "                           media query which is compatible with the SASS",
          );
          console.log(
            "                           format, and 'all' which will do both.",
          );
          console.log(
            "  -x, --compress           Compresses output by removing some whitespaces.",
          );
          console.log(
            "                           We recommend you use a dedicated minifer like less-plugin-clean-css",
          );
          console.log("");
          console.log("Report bugs to: http://github.com/less/less.js/issues");
          console.log("Home page: <http://lesscss.org/>");
        },
      };
      for (var h in lessc_helper) {
        if (lessc_helper.hasOwnProperty(h)) {
          exports[h] = lessc_helper[h];
        }
      }
    },
    8829: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      var __webpack_unused_export__;
      __webpack_unused_export__ = { value: true };
      var tslib_1 = __nccwpck_require__(5477);
      var path_1 = tslib_1.__importDefault(__nccwpck_require__(6928));
      var abstract_plugin_loader_js_1 = tslib_1.__importDefault(
        __nccwpck_require__(6353),
      );
      var PluginLoader = function (less) {
        this.less = less;
        this.require = function (prefix) {
          prefix = path_1.default.dirname(prefix);
          return function (id) {
            var str = id.substr(0, 2);
            if (str === ".." || str === "./") {
              return require(path_1.default.join(prefix, id));
            } else {
              return require(id);
            }
          };
        };
      };
      PluginLoader.prototype = Object.assign(
        new abstract_plugin_loader_js_1.default(),
        {
          loadPlugin: function (
            filename,
            basePath,
            context,
            environment,
            fileManager,
          ) {
            var prefix = filename.slice(0, 1);
            var explicit =
              prefix === "." ||
              prefix === "/" ||
              filename.slice(-3).toLowerCase() === ".js";
            if (!explicit) {
              context.prefixes = ["less-plugin-", ""];
            }
            if (context.syncImport) {
              return fileManager.loadFileSync(
                filename,
                basePath,
                context,
                environment,
              );
            }
            return new Promise(function (fulfill, reject) {
              fileManager
                .loadFile(filename, basePath, context, environment)
                .then(function (data) {
                  try {
                    fulfill(data);
                  } catch (e) {
                    console.log(e);
                    reject(e);
                  }
                })
                .catch(function (err) {
                  reject(err);
                });
            });
          },
          loadPluginSync: function (
            filename,
            basePath,
            context,
            environment,
            fileManager,
          ) {
            context.syncImport = true;
            return this.loadPlugin(
              filename,
              basePath,
              context,
              environment,
              fileManager,
            );
          },
        },
      );
      exports.A = PluginLoader;
    },
    5430: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var isUrlRe = /^(?:https?:)?\/\//i;
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(7016));
      var request;
      var abstract_file_manager_js_1 = tslib_1.__importDefault(
        __nccwpck_require__(758),
      );
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      var UrlFileManager = function () {};
      UrlFileManager.prototype = Object.assign(
        new abstract_file_manager_js_1.default(),
        {
          supports: function (
            filename,
            currentDirectory,
            options,
            environment,
          ) {
            return isUrlRe.test(filename) || isUrlRe.test(currentDirectory);
          },
          loadFile: function (
            filename,
            currentDirectory,
            options,
            environment,
          ) {
            return new Promise(function (fulfill, reject) {
              if (request === undefined) {
                try {
                  request = __nccwpck_require__(9316);
                } catch (e) {
                  request = null;
                }
              }
              if (!request) {
                reject({
                  type: "File",
                  message:
                    "optional dependency 'needle' required to import over http(s)\n",
                });
                return;
              }
              var urlStr = isUrlRe.test(filename)
                ? filename
                : url_1.default.resolve(currentDirectory, filename);
              var hackUrlStr =
                urlStr.indexOf("?") === -1 ? urlStr + "?" : urlStr;
              request.get(
                hackUrlStr,
                { follow_max: 5 },
                function (err, resp, body) {
                  if (err || (resp && resp.statusCode >= 400)) {
                    var message =
                      resp && resp.statusCode === 404
                        ? "resource '".concat(urlStr, "' was not found\n")
                        : "resource '"
                            .concat(urlStr, "' gave this Error:\n  ")
                            .concat(
                              err || resp.statusMessage || resp.statusCode,
                              "\n",
                            );
                    reject({ type: "File", message });
                    return;
                  }
                  if (resp.statusCode >= 300) {
                    reject({
                      type: "File",
                      message: "resource '".concat(
                        urlStr,
                        "' caused too many redirects",
                      ),
                    });
                    return;
                  }
                  body = body.toString("utf8");
                  if (!body) {
                    logger_1.default.warn(
                      "Warning: Empty body (HTTP "
                        .concat(resp.statusCode, ') returned by "')
                        .concat(urlStr, '"'),
                    );
                  }
                  fulfill({ contents: body || "", filename: urlStr });
                },
              );
            });
          },
        },
      );
      exports["default"] = UrlFileManager;
    },
    3664: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.RewriteUrls = exports.Math = void 0;
      exports.Math = { ALWAYS: 0, PARENS_DIVISION: 1, PARENS: 2 };
      exports.RewriteUrls = { OFF: 0, LOCAL: 1, ALL: 2 };
    },
    8461: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var contexts = {};
      exports["default"] = contexts;
      var Constants = tslib_1.__importStar(__nccwpck_require__(3664));
      var copyFromOriginal = function copyFromOriginal(
        original,
        destination,
        propertiesToCopy,
      ) {
        if (!original) {
          return;
        }
        for (var i = 0; i < propertiesToCopy.length; i++) {
          if (
            Object.prototype.hasOwnProperty.call(original, propertiesToCopy[i])
          ) {
            destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
          }
        }
      };
      var parseCopyProperties = [
        "paths",
        "rewriteUrls",
        "rootpath",
        "strictImports",
        "insecure",
        "dumpLineNumbers",
        "compress",
        "syncImport",
        "chunkInput",
        "mime",
        "useFileCache",
        "processImports",
        "pluginManager",
        "quiet",
      ];
      contexts.Parse = function (options) {
        copyFromOriginal(options, this, parseCopyProperties);
        if (typeof this.paths === "string") {
          this.paths = [this.paths];
        }
      };
      var evalCopyProperties = [
        "paths",
        "compress",
        "math",
        "strictUnits",
        "sourceMap",
        "importMultiple",
        "urlArgs",
        "javascriptEnabled",
        "pluginManager",
        "importantScope",
        "rewriteUrls",
      ];
      contexts.Eval = function (options, frames) {
        copyFromOriginal(options, this, evalCopyProperties);
        if (typeof this.paths === "string") {
          this.paths = [this.paths];
        }
        this.frames = frames || [];
        this.importantScope = this.importantScope || [];
      };
      contexts.Eval.prototype.enterCalc = function () {
        if (!this.calcStack) {
          this.calcStack = [];
        }
        this.calcStack.push(true);
        this.inCalc = true;
      };
      contexts.Eval.prototype.exitCalc = function () {
        this.calcStack.pop();
        if (!this.calcStack.length) {
          this.inCalc = false;
        }
      };
      contexts.Eval.prototype.inParenthesis = function () {
        if (!this.parensStack) {
          this.parensStack = [];
        }
        this.parensStack.push(true);
      };
      contexts.Eval.prototype.outOfParenthesis = function () {
        this.parensStack.pop();
      };
      contexts.Eval.prototype.inCalc = false;
      contexts.Eval.prototype.mathOn = true;
      contexts.Eval.prototype.isMathOn = function (op) {
        if (!this.mathOn) {
          return false;
        }
        if (
          op === "/" &&
          this.math !== Constants.Math.ALWAYS &&
          (!this.parensStack || !this.parensStack.length)
        ) {
          return false;
        }
        if (this.math > Constants.Math.PARENS_DIVISION) {
          return this.parensStack && this.parensStack.length;
        }
        return true;
      };
      contexts.Eval.prototype.pathRequiresRewrite = function (path) {
        var isRelative =
          this.rewriteUrls === Constants.RewriteUrls.LOCAL
            ? isPathLocalRelative
            : isPathRelative;
        return isRelative(path);
      };
      contexts.Eval.prototype.rewritePath = function (path, rootpath) {
        var newPath;
        rootpath = rootpath || "";
        newPath = this.normalizePath(rootpath + path);
        if (
          isPathLocalRelative(path) &&
          isPathRelative(rootpath) &&
          isPathLocalRelative(newPath) === false
        ) {
          newPath = "./".concat(newPath);
        }
        return newPath;
      };
      contexts.Eval.prototype.normalizePath = function (path) {
        var segments = path.split("/").reverse();
        var segment;
        path = [];
        while (segments.length !== 0) {
          segment = segments.pop();
          switch (segment) {
            case ".":
              break;
            case "..":
              if (path.length === 0 || path[path.length - 1] === "..") {
                path.push(segment);
              } else {
                path.pop();
              }
              break;
            default:
              path.push(segment);
              break;
          }
        }
        return path.join("/");
      };
      function isPathRelative(path) {
        return !/^(?:[a-z-]+:|\/|#)/i.test(path);
      }
      function isPathLocalRelative(path) {
        return path.charAt(0) === ".";
      }
    },
    8236: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports["default"] = {
        aliceblue: "#f0f8ff",
        antiquewhite: "#faebd7",
        aqua: "#00ffff",
        aquamarine: "#7fffd4",
        azure: "#f0ffff",
        beige: "#f5f5dc",
        bisque: "#ffe4c4",
        black: "#000000",
        blanchedalmond: "#ffebcd",
        blue: "#0000ff",
        blueviolet: "#8a2be2",
        brown: "#a52a2a",
        burlywood: "#deb887",
        cadetblue: "#5f9ea0",
        chartreuse: "#7fff00",
        chocolate: "#d2691e",
        coral: "#ff7f50",
        cornflowerblue: "#6495ed",
        cornsilk: "#fff8dc",
        crimson: "#dc143c",
        cyan: "#00ffff",
        darkblue: "#00008b",
        darkcyan: "#008b8b",
        darkgoldenrod: "#b8860b",
        darkgray: "#a9a9a9",
        darkgrey: "#a9a9a9",
        darkgreen: "#006400",
        darkkhaki: "#bdb76b",
        darkmagenta: "#8b008b",
        darkolivegreen: "#556b2f",
        darkorange: "#ff8c00",
        darkorchid: "#9932cc",
        darkred: "#8b0000",
        darksalmon: "#e9967a",
        darkseagreen: "#8fbc8f",
        darkslateblue: "#483d8b",
        darkslategray: "#2f4f4f",
        darkslategrey: "#2f4f4f",
        darkturquoise: "#00ced1",
        darkviolet: "#9400d3",
        deeppink: "#ff1493",
        deepskyblue: "#00bfff",
        dimgray: "#696969",
        dimgrey: "#696969",
        dodgerblue: "#1e90ff",
        firebrick: "#b22222",
        floralwhite: "#fffaf0",
        forestgreen: "#228b22",
        fuchsia: "#ff00ff",
        gainsboro: "#dcdcdc",
        ghostwhite: "#f8f8ff",
        gold: "#ffd700",
        goldenrod: "#daa520",
        gray: "#808080",
        grey: "#808080",
        green: "#008000",
        greenyellow: "#adff2f",
        honeydew: "#f0fff0",
        hotpink: "#ff69b4",
        indianred: "#cd5c5c",
        indigo: "#4b0082",
        ivory: "#fffff0",
        khaki: "#f0e68c",
        lavender: "#e6e6fa",
        lavenderblush: "#fff0f5",
        lawngreen: "#7cfc00",
        lemonchiffon: "#fffacd",
        lightblue: "#add8e6",
        lightcoral: "#f08080",
        lightcyan: "#e0ffff",
        lightgoldenrodyellow: "#fafad2",
        lightgray: "#d3d3d3",
        lightgrey: "#d3d3d3",
        lightgreen: "#90ee90",
        lightpink: "#ffb6c1",
        lightsalmon: "#ffa07a",
        lightseagreen: "#20b2aa",
        lightskyblue: "#87cefa",
        lightslategray: "#778899",
        lightslategrey: "#778899",
        lightsteelblue: "#b0c4de",
        lightyellow: "#ffffe0",
        lime: "#00ff00",
        limegreen: "#32cd32",
        linen: "#faf0e6",
        magenta: "#ff00ff",
        maroon: "#800000",
        mediumaquamarine: "#66cdaa",
        mediumblue: "#0000cd",
        mediumorchid: "#ba55d3",
        mediumpurple: "#9370d8",
        mediumseagreen: "#3cb371",
        mediumslateblue: "#7b68ee",
        mediumspringgreen: "#00fa9a",
        mediumturquoise: "#48d1cc",
        mediumvioletred: "#c71585",
        midnightblue: "#191970",
        mintcream: "#f5fffa",
        mistyrose: "#ffe4e1",
        moccasin: "#ffe4b5",
        navajowhite: "#ffdead",
        navy: "#000080",
        oldlace: "#fdf5e6",
        olive: "#808000",
        olivedrab: "#6b8e23",
        orange: "#ffa500",
        orangered: "#ff4500",
        orchid: "#da70d6",
        palegoldenrod: "#eee8aa",
        palegreen: "#98fb98",
        paleturquoise: "#afeeee",
        palevioletred: "#d87093",
        papayawhip: "#ffefd5",
        peachpuff: "#ffdab9",
        peru: "#cd853f",
        pink: "#ffc0cb",
        plum: "#dda0dd",
        powderblue: "#b0e0e6",
        purple: "#800080",
        rebeccapurple: "#663399",
        red: "#ff0000",
        rosybrown: "#bc8f8f",
        royalblue: "#4169e1",
        saddlebrown: "#8b4513",
        salmon: "#fa8072",
        sandybrown: "#f4a460",
        seagreen: "#2e8b57",
        seashell: "#fff5ee",
        sienna: "#a0522d",
        silver: "#c0c0c0",
        skyblue: "#87ceeb",
        slateblue: "#6a5acd",
        slategray: "#708090",
        slategrey: "#708090",
        snow: "#fffafa",
        springgreen: "#00ff7f",
        steelblue: "#4682b4",
        tan: "#d2b48c",
        teal: "#008080",
        thistle: "#d8bfd8",
        tomato: "#ff6347",
        turquoise: "#40e0d0",
        violet: "#ee82ee",
        wheat: "#f5deb3",
        white: "#ffffff",
        whitesmoke: "#f5f5f5",
        yellow: "#ffff00",
        yellowgreen: "#9acd32",
      };
    },
    1654: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var colors_1 = tslib_1.__importDefault(__nccwpck_require__(8236));
      var unit_conversions_1 = tslib_1.__importDefault(
        __nccwpck_require__(2074),
      );
      exports["default"] = {
        colors: colors_1.default,
        unitConversions: unit_conversions_1.default,
      };
    },
    2074: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports["default"] = {
        length: {
          m: 1,
          cm: 0.01,
          mm: 0.001,
          in: 0.0254,
          px: 0.0254 / 96,
          pt: 0.0254 / 72,
          pc: (0.0254 / 72) * 12,
        },
        duration: { s: 1, ms: 0.001 },
        angle: { rad: 1 / (2 * Math.PI), deg: 1 / 360, grad: 1 / 400, turn: 1 },
      };
    },
    8111: (__unused_webpack_module, exports) => {
      "use strict";
      var __webpack_unused_export__;
      __webpack_unused_export__ = { value: true };
      function default_1() {
        return {
          javascriptEnabled: false,
          depends: false,
          compress: false,
          lint: false,
          paths: [],
          color: true,
          strictImports: false,
          insecure: false,
          rootpath: "",
          rewriteUrls: false,
          math: 1,
          strictUnits: false,
          globalVars: null,
          modifyVars: null,
          urlArgs: "",
        };
      }
      exports.A = default_1;
    },
    758: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var AbstractFileManager = (function () {
        function AbstractFileManager() {}
        AbstractFileManager.prototype.getPath = function (filename) {
          var j = filename.lastIndexOf("?");
          if (j > 0) {
            filename = filename.slice(0, j);
          }
          j = filename.lastIndexOf("/");
          if (j < 0) {
            j = filename.lastIndexOf("\\");
          }
          if (j < 0) {
            return "";
          }
          return filename.slice(0, j + 1);
        };
        AbstractFileManager.prototype.tryAppendExtension = function (
          path,
          ext,
        ) {
          return /(\.[a-z]*$)|([?;].*)$/.test(path) ? path : path + ext;
        };
        AbstractFileManager.prototype.tryAppendLessExtension = function (path) {
          return this.tryAppendExtension(path, ".less");
        };
        AbstractFileManager.prototype.supportsSync = function () {
          return false;
        };
        AbstractFileManager.prototype.alwaysMakePathsAbsolute = function () {
          return false;
        };
        AbstractFileManager.prototype.isPathAbsolute = function (filename) {
          return /^(?:[a-z-]+:|\/|\\|#)/i.test(filename);
        };
        AbstractFileManager.prototype.join = function (basePath, laterPath) {
          if (!basePath) {
            return laterPath;
          }
          return basePath + laterPath;
        };
        AbstractFileManager.prototype.pathDiff = function (url, baseUrl) {
          var urlParts = this.extractUrlParts(url);
          var baseUrlParts = this.extractUrlParts(baseUrl);
          var i;
          var max;
          var urlDirectories;
          var baseUrlDirectories;
          var diff = "";
          if (urlParts.hostPart !== baseUrlParts.hostPart) {
            return "";
          }
          max = Math.max(
            baseUrlParts.directories.length,
            urlParts.directories.length,
          );
          for (i = 0; i < max; i++) {
            if (baseUrlParts.directories[i] !== urlParts.directories[i]) {
              break;
            }
          }
          baseUrlDirectories = baseUrlParts.directories.slice(i);
          urlDirectories = urlParts.directories.slice(i);
          for (i = 0; i < baseUrlDirectories.length - 1; i++) {
            diff += "../";
          }
          for (i = 0; i < urlDirectories.length - 1; i++) {
            diff += "".concat(urlDirectories[i], "/");
          }
          return diff;
        };
        AbstractFileManager.prototype.extractUrlParts = function (
          url,
          baseUrl,
        ) {
          var urlPartsRegex =
            /^((?:[a-z-]+:)?\/{2}(?:[^/?#]*\/)|([/\\]))?((?:[^/\\?#]*[/\\])*)([^/\\?#]*)([#?].*)?$/i;
          var urlParts = url.match(urlPartsRegex);
          var returner = {};
          var rawDirectories = [];
          var directories = [];
          var i;
          var baseUrlParts;
          if (!urlParts) {
            throw new Error("Could not parse sheet href - '".concat(url, "'"));
          }
          if (baseUrl && (!urlParts[1] || urlParts[2])) {
            baseUrlParts = baseUrl.match(urlPartsRegex);
            if (!baseUrlParts) {
              throw new Error(
                "Could not parse page url - '".concat(baseUrl, "'"),
              );
            }
            urlParts[1] = urlParts[1] || baseUrlParts[1] || "";
            if (!urlParts[2]) {
              urlParts[3] = baseUrlParts[3] + urlParts[3];
            }
          }
          if (urlParts[3]) {
            rawDirectories = urlParts[3].replace(/\\/g, "/").split("/");
            for (i = 0; i < rawDirectories.length; i++) {
              if (rawDirectories[i] === "..") {
                directories.pop();
              } else if (rawDirectories[i] !== ".") {
                directories.push(rawDirectories[i]);
              }
            }
          }
          returner.hostPart = urlParts[1];
          returner.directories = directories;
          returner.rawPath = (urlParts[1] || "") + rawDirectories.join("/");
          returner.path = (urlParts[1] || "") + directories.join("/");
          returner.filename = urlParts[4];
          returner.fileUrl = returner.path + (urlParts[4] || "");
          returner.url = returner.fileUrl + (urlParts[5] || "");
          return returner;
        };
        return AbstractFileManager;
      })();
      exports["default"] = AbstractFileManager;
    },
    6353: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var function_registry_1 = tslib_1.__importDefault(
        __nccwpck_require__(3247),
      );
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var AbstractPluginLoader = (function () {
        function AbstractPluginLoader() {
          this.require = function () {
            return null;
          };
        }
        AbstractPluginLoader.prototype.evalPlugin = function (
          contents,
          context,
          imports,
          pluginOptions,
          fileInfo,
        ) {
          var loader,
            registry,
            pluginObj,
            localModule,
            pluginManager,
            filename,
            result;
          pluginManager = context.pluginManager;
          if (fileInfo) {
            if (typeof fileInfo === "string") {
              filename = fileInfo;
            } else {
              filename = fileInfo.filename;
            }
          }
          var shortname = new this.less.FileManager().extractUrlParts(
            filename,
          ).filename;
          if (filename) {
            pluginObj = pluginManager.get(filename);
            if (pluginObj) {
              result = this.trySetOptions(
                pluginObj,
                filename,
                shortname,
                pluginOptions,
              );
              if (result) {
                return result;
              }
              try {
                if (pluginObj.use) {
                  pluginObj.use.call(this.context, pluginObj);
                }
              } catch (e) {
                e.message = e.message || "Error during @plugin call";
                return new less_error_1.default(e, imports, filename);
              }
              return pluginObj;
            }
          }
          localModule = { exports: {}, pluginManager, fileInfo };
          registry = function_registry_1.default.create();
          var registerPlugin = function (obj) {
            pluginObj = obj;
          };
          try {
            loader = new Function(
              "module",
              "require",
              "registerPlugin",
              "functions",
              "tree",
              "less",
              "fileInfo",
              contents,
            );
            loader(
              localModule,
              this.require(filename),
              registerPlugin,
              registry,
              this.less.tree,
              this.less,
              fileInfo,
            );
          } catch (e) {
            return new less_error_1.default(e, imports, filename);
          }
          if (!pluginObj) {
            pluginObj = localModule.exports;
          }
          pluginObj = this.validatePlugin(pluginObj, filename, shortname);
          if (pluginObj instanceof less_error_1.default) {
            return pluginObj;
          }
          if (pluginObj) {
            pluginObj.imports = imports;
            pluginObj.filename = filename;
            if (
              !pluginObj.minVersion ||
              this.compareVersion("3.0.0", pluginObj.minVersion) < 0
            ) {
              result = this.trySetOptions(
                pluginObj,
                filename,
                shortname,
                pluginOptions,
              );
              if (result) {
                return result;
              }
            }
            pluginManager.addPlugin(pluginObj, fileInfo.filename, registry);
            pluginObj.functions = registry.getLocalFunctions();
            result = this.trySetOptions(
              pluginObj,
              filename,
              shortname,
              pluginOptions,
            );
            if (result) {
              return result;
            }
            try {
              if (pluginObj.use) {
                pluginObj.use.call(this.context, pluginObj);
              }
            } catch (e) {
              e.message = e.message || "Error during @plugin call";
              return new less_error_1.default(e, imports, filename);
            }
          } else {
            return new less_error_1.default(
              { message: "Not a valid plugin" },
              imports,
              filename,
            );
          }
          return pluginObj;
        };
        AbstractPluginLoader.prototype.trySetOptions = function (
          plugin,
          filename,
          name,
          options,
        ) {
          if (options && !plugin.setOptions) {
            return new less_error_1.default({
              message: "Options have been provided but the plugin ".concat(
                name,
                " does not support any options.",
              ),
            });
          }
          try {
            plugin.setOptions && plugin.setOptions(options);
          } catch (e) {
            return new less_error_1.default(e);
          }
        };
        AbstractPluginLoader.prototype.validatePlugin = function (
          plugin,
          filename,
          name,
        ) {
          if (plugin) {
            if (typeof plugin === "function") {
              plugin = new plugin();
            }
            if (plugin.minVersion) {
              if (
                this.compareVersion(plugin.minVersion, this.less.version) < 0
              ) {
                return new less_error_1.default({
                  message: "Plugin "
                    .concat(name, " requires version ")
                    .concat(this.versionToString(plugin.minVersion)),
                });
              }
            }
            return plugin;
          }
          return null;
        };
        AbstractPluginLoader.prototype.compareVersion = function (
          aVersion,
          bVersion,
        ) {
          if (typeof aVersion === "string") {
            aVersion = aVersion.match(/^(\d+)\.?(\d+)?\.?(\d+)?/);
            aVersion.shift();
          }
          for (var i = 0; i < aVersion.length; i++) {
            if (aVersion[i] !== bVersion[i]) {
              return parseInt(aVersion[i]) > parseInt(bVersion[i]) ? -1 : 1;
            }
          }
          return 0;
        };
        AbstractPluginLoader.prototype.versionToString = function (version) {
          var versionString = "";
          for (var i = 0; i < version.length; i++) {
            versionString += (versionString ? "." : "") + version[i];
          }
          return versionString;
        };
        AbstractPluginLoader.prototype.printUsage = function (plugins) {
          for (var i = 0; i < plugins.length; i++) {
            var plugin = plugins[i];
            if (plugin.printUsage) {
              plugin.printUsage();
            }
          }
        };
        return AbstractPluginLoader;
      })();
      exports["default"] = AbstractPluginLoader;
    },
    7026: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      var Environment = (function () {
        function Environment(externalEnvironment, fileManagers) {
          this.fileManagers = fileManagers || [];
          externalEnvironment = externalEnvironment || {};
          var optionalFunctions = [
            "encodeBase64",
            "mimeLookup",
            "charsetLookup",
            "getSourceMapGenerator",
          ];
          var requiredFunctions = [];
          var functions = requiredFunctions.concat(optionalFunctions);
          for (var i = 0; i < functions.length; i++) {
            var propName = functions[i];
            var environmentFunc = externalEnvironment[propName];
            if (environmentFunc) {
              this[propName] = environmentFunc.bind(externalEnvironment);
            } else if (i < requiredFunctions.length) {
              this.warn(
                "missing required function in environment - ".concat(propName),
              );
            }
          }
        }
        Environment.prototype.getFileManager = function (
          filename,
          currentDirectory,
          options,
          environment,
          isSync,
        ) {
          if (!filename) {
            logger_1.default.warn(
              "getFileManager called with no filename.. Please report this issue. continuing.",
            );
          }
          if (currentDirectory === undefined) {
            logger_1.default.warn(
              "getFileManager called with null directory.. Please report this issue. continuing.",
            );
          }
          var fileManagers = this.fileManagers;
          if (options.pluginManager) {
            fileManagers = []
              .concat(fileManagers)
              .concat(options.pluginManager.getFileManagers());
          }
          for (var i = fileManagers.length - 1; i >= 0; i--) {
            var fileManager = fileManagers[i];
            if (
              fileManager[isSync ? "supportsSync" : "supports"](
                filename,
                currentDirectory,
                options,
                environment,
              )
            ) {
              return fileManager;
            }
          }
          return null;
        };
        Environment.prototype.addFileManager = function (fileManager) {
          this.fileManagers.push(fileManager);
        };
        Environment.prototype.clearFileManagers = function () {
          this.fileManagers = [];
        };
        return Environment;
      })();
      exports["default"] = Environment;
    },
    835: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      function boolean(condition) {
        return condition ? keyword_1.default.True : keyword_1.default.False;
      }
      function If(context, condition, trueValue, falseValue) {
        return condition.eval(context)
          ? trueValue.eval(context)
          : falseValue
            ? falseValue.eval(context)
            : new anonymous_1.default();
      }
      If.evalArgs = false;
      function isdefined(context, variable) {
        try {
          variable.eval(context);
          return keyword_1.default.True;
        } catch (e) {
          return keyword_1.default.False;
        }
      }
      isdefined.evalArgs = false;
      exports["default"] = { isdefined, boolean, if: If };
    },
    680: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      function colorBlend(mode, color1, color2) {
        var ab = color1.alpha;
        var cb;
        var as = color2.alpha;
        var cs;
        var ar;
        var cr;
        var r = [];
        ar = as + ab * (1 - as);
        for (var i = 0; i < 3; i++) {
          cb = color1.rgb[i] / 255;
          cs = color2.rgb[i] / 255;
          cr = mode(cb, cs);
          if (ar) {
            cr = (as * cs + ab * (cb - as * (cb + cs - cr))) / ar;
          }
          r[i] = cr * 255;
        }
        return new color_1.default(r, ar);
      }
      var colorBlendModeFunctions = {
        multiply: function (cb, cs) {
          return cb * cs;
        },
        screen: function (cb, cs) {
          return cb + cs - cb * cs;
        },
        overlay: function (cb, cs) {
          cb *= 2;
          return cb <= 1
            ? colorBlendModeFunctions.multiply(cb, cs)
            : colorBlendModeFunctions.screen(cb - 1, cs);
        },
        softlight: function (cb, cs) {
          var d = 1;
          var e = cb;
          if (cs > 0.5) {
            e = 1;
            d = cb > 0.25 ? Math.sqrt(cb) : ((16 * cb - 12) * cb + 4) * cb;
          }
          return cb - (1 - 2 * cs) * e * (d - cb);
        },
        hardlight: function (cb, cs) {
          return colorBlendModeFunctions.overlay(cs, cb);
        },
        difference: function (cb, cs) {
          return Math.abs(cb - cs);
        },
        exclusion: function (cb, cs) {
          return cb + cs - 2 * cb * cs;
        },
        average: function (cb, cs) {
          return (cb + cs) / 2;
        },
        negation: function (cb, cs) {
          return 1 - Math.abs(cb + cs - 1);
        },
      };
      for (var f in colorBlendModeFunctions) {
        if (colorBlendModeFunctions.hasOwnProperty(f)) {
          colorBlend[f] = colorBlend.bind(null, colorBlendModeFunctions[f]);
        }
      }
      exports["default"] = colorBlend;
    },
    7460: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var operation_1 = tslib_1.__importDefault(__nccwpck_require__(2351));
      var colorFunctions;
      function clamp(val) {
        return Math.min(1, Math.max(0, val));
      }
      function hsla(origColor, hsl) {
        var color = colorFunctions.hsla(hsl.h, hsl.s, hsl.l, hsl.a);
        if (color) {
          if (origColor.value && /^(rgb|hsl)/.test(origColor.value)) {
            color.value = origColor.value;
          } else {
            color.value = "rgb";
          }
          return color;
        }
      }
      function toHSL(color) {
        if (color.toHSL) {
          return color.toHSL();
        } else {
          throw new Error("Argument cannot be evaluated to a color");
        }
      }
      function toHSV(color) {
        if (color.toHSV) {
          return color.toHSV();
        } else {
          throw new Error("Argument cannot be evaluated to a color");
        }
      }
      function number(n) {
        if (n instanceof dimension_1.default) {
          return parseFloat(n.unit.is("%") ? n.value / 100 : n.value);
        } else if (typeof n === "number") {
          return n;
        } else {
          throw {
            type: "Argument",
            message: "color functions take numbers as parameters",
          };
        }
      }
      function scaled(n, size) {
        if (n instanceof dimension_1.default && n.unit.is("%")) {
          return parseFloat((n.value * size) / 100);
        } else {
          return number(n);
        }
      }
      colorFunctions = {
        rgb: function (r, g, b) {
          var a = 1;
          if (r instanceof expression_1.default) {
            var val = r.value;
            r = val[0];
            g = val[1];
            b = val[2];
            if (b instanceof operation_1.default) {
              var op = b;
              b = op.operands[0];
              a = op.operands[1];
            }
          }
          var color = colorFunctions.rgba(r, g, b, a);
          if (color) {
            color.value = "rgb";
            return color;
          }
        },
        rgba: function (r, g, b, a) {
          try {
            if (r instanceof color_1.default) {
              if (g) {
                a = number(g);
              } else {
                a = r.alpha;
              }
              return new color_1.default(r.rgb, a, "rgba");
            }
            var rgb = [r, g, b].map(function (c) {
              return scaled(c, 255);
            });
            a = number(a);
            return new color_1.default(rgb, a, "rgba");
          } catch (e) {}
        },
        hsl: function (h, s, l) {
          var a = 1;
          if (h instanceof expression_1.default) {
            var val = h.value;
            h = val[0];
            s = val[1];
            l = val[2];
            if (l instanceof operation_1.default) {
              var op = l;
              l = op.operands[0];
              a = op.operands[1];
            }
          }
          var color = colorFunctions.hsla(h, s, l, a);
          if (color) {
            color.value = "hsl";
            return color;
          }
        },
        hsla: function (h, s, l, a) {
          var m1;
          var m2;
          function hue(h) {
            h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
            if (h * 6 < 1) {
              return m1 + (m2 - m1) * h * 6;
            } else if (h * 2 < 1) {
              return m2;
            } else if (h * 3 < 2) {
              return m1 + (m2 - m1) * (2 / 3 - h) * 6;
            } else {
              return m1;
            }
          }
          try {
            if (h instanceof color_1.default) {
              if (s) {
                a = number(s);
              } else {
                a = h.alpha;
              }
              return new color_1.default(h.rgb, a, "hsla");
            }
            h = (number(h) % 360) / 360;
            s = clamp(number(s));
            l = clamp(number(l));
            a = clamp(number(a));
            m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
            m1 = l * 2 - m2;
            var rgb = [
              hue(h + 1 / 3) * 255,
              hue(h) * 255,
              hue(h - 1 / 3) * 255,
            ];
            a = number(a);
            return new color_1.default(rgb, a, "hsla");
          } catch (e) {}
        },
        hsv: function (h, s, v) {
          return colorFunctions.hsva(h, s, v, 1);
        },
        hsva: function (h, s, v, a) {
          h = ((number(h) % 360) / 360) * 360;
          s = number(s);
          v = number(v);
          a = number(a);
          var i;
          var f;
          i = Math.floor((h / 60) % 6);
          f = h / 60 - i;
          var vs = [v, v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)];
          var perm = [
            [0, 3, 1],
            [2, 0, 1],
            [1, 0, 3],
            [1, 2, 0],
            [3, 1, 0],
            [0, 1, 2],
          ];
          return colorFunctions.rgba(
            vs[perm[i][0]] * 255,
            vs[perm[i][1]] * 255,
            vs[perm[i][2]] * 255,
            a,
          );
        },
        hue: function (color) {
          return new dimension_1.default(toHSL(color).h);
        },
        saturation: function (color) {
          return new dimension_1.default(toHSL(color).s * 100, "%");
        },
        lightness: function (color) {
          return new dimension_1.default(toHSL(color).l * 100, "%");
        },
        hsvhue: function (color) {
          return new dimension_1.default(toHSV(color).h);
        },
        hsvsaturation: function (color) {
          return new dimension_1.default(toHSV(color).s * 100, "%");
        },
        hsvvalue: function (color) {
          return new dimension_1.default(toHSV(color).v * 100, "%");
        },
        red: function (color) {
          return new dimension_1.default(color.rgb[0]);
        },
        green: function (color) {
          return new dimension_1.default(color.rgb[1]);
        },
        blue: function (color) {
          return new dimension_1.default(color.rgb[2]);
        },
        alpha: function (color) {
          return new dimension_1.default(toHSL(color).a);
        },
        luma: function (color) {
          return new dimension_1.default(color.luma() * color.alpha * 100, "%");
        },
        luminance: function (color) {
          var luminance =
            (0.2126 * color.rgb[0]) / 255 +
            (0.7152 * color.rgb[1]) / 255 +
            (0.0722 * color.rgb[2]) / 255;
          return new dimension_1.default(luminance * color.alpha * 100, "%");
        },
        saturate: function (color, amount, method) {
          if (!color.rgb) {
            return null;
          }
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s += (hsl.s * amount.value) / 100;
          } else {
            hsl.s += amount.value / 100;
          }
          hsl.s = clamp(hsl.s);
          return hsla(color, hsl);
        },
        desaturate: function (color, amount, method) {
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s -= (hsl.s * amount.value) / 100;
          } else {
            hsl.s -= amount.value / 100;
          }
          hsl.s = clamp(hsl.s);
          return hsla(color, hsl);
        },
        lighten: function (color, amount, method) {
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l += (hsl.l * amount.value) / 100;
          } else {
            hsl.l += amount.value / 100;
          }
          hsl.l = clamp(hsl.l);
          return hsla(color, hsl);
        },
        darken: function (color, amount, method) {
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l -= (hsl.l * amount.value) / 100;
          } else {
            hsl.l -= amount.value / 100;
          }
          hsl.l = clamp(hsl.l);
          return hsla(color, hsl);
        },
        fadein: function (color, amount, method) {
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a += (hsl.a * amount.value) / 100;
          } else {
            hsl.a += amount.value / 100;
          }
          hsl.a = clamp(hsl.a);
          return hsla(color, hsl);
        },
        fadeout: function (color, amount, method) {
          var hsl = toHSL(color);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a -= (hsl.a * amount.value) / 100;
          } else {
            hsl.a -= amount.value / 100;
          }
          hsl.a = clamp(hsl.a);
          return hsla(color, hsl);
        },
        fade: function (color, amount) {
          var hsl = toHSL(color);
          hsl.a = amount.value / 100;
          hsl.a = clamp(hsl.a);
          return hsla(color, hsl);
        },
        spin: function (color, amount) {
          var hsl = toHSL(color);
          var hue = (hsl.h + amount.value) % 360;
          hsl.h = hue < 0 ? 360 + hue : hue;
          return hsla(color, hsl);
        },
        mix: function (color1, color2, weight) {
          if (!weight) {
            weight = new dimension_1.default(50);
          }
          var p = weight.value / 100;
          var w = p * 2 - 1;
          var a = toHSL(color1).a - toHSL(color2).a;
          var w1 = ((w * a == -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
          var w2 = 1 - w1;
          var rgb = [
            color1.rgb[0] * w1 + color2.rgb[0] * w2,
            color1.rgb[1] * w1 + color2.rgb[1] * w2,
            color1.rgb[2] * w1 + color2.rgb[2] * w2,
          ];
          var alpha = color1.alpha * p + color2.alpha * (1 - p);
          return new color_1.default(rgb, alpha);
        },
        greyscale: function (color) {
          return colorFunctions.desaturate(color, new dimension_1.default(100));
        },
        contrast: function (color, dark, light, threshold) {
          if (!color.rgb) {
            return null;
          }
          if (typeof light === "undefined") {
            light = colorFunctions.rgba(255, 255, 255, 1);
          }
          if (typeof dark === "undefined") {
            dark = colorFunctions.rgba(0, 0, 0, 1);
          }
          if (dark.luma() > light.luma()) {
            var t = light;
            light = dark;
            dark = t;
          }
          if (typeof threshold === "undefined") {
            threshold = 0.43;
          } else {
            threshold = number(threshold);
          }
          if (color.luma() < threshold) {
            return light;
          } else {
            return dark;
          }
        },
        argb: function (color) {
          return new anonymous_1.default(color.toARGB());
        },
        color: function (c) {
          if (
            c instanceof quoted_1.default &&
            /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})$/i.test(c.value)
          ) {
            var val = c.value.slice(1);
            return new color_1.default(val, undefined, "#".concat(val));
          }
          if (
            c instanceof color_1.default ||
            (c = color_1.default.fromKeyword(c.value))
          ) {
            c.value = undefined;
            return c;
          }
          throw {
            type: "Argument",
            message:
              "argument must be a color keyword or 3|4|6|8 digit hex e.g. #FFF",
          };
        },
        tint: function (color, amount) {
          return colorFunctions.mix(
            colorFunctions.rgb(255, 255, 255),
            color,
            amount,
          );
        },
        shade: function (color, amount) {
          return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color, amount);
        },
      };
      exports["default"] = colorFunctions;
    },
    4180: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(595));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      exports["default"] = function (environment) {
        var fallback = function (functionThis, node) {
          return new url_1.default(
            node,
            functionThis.index,
            functionThis.currentFileInfo,
          ).eval(functionThis.context);
        };
        return {
          "data-uri": function (mimetypeNode, filePathNode) {
            if (!filePathNode) {
              filePathNode = mimetypeNode;
              mimetypeNode = null;
            }
            var mimetype = mimetypeNode && mimetypeNode.value;
            var filePath = filePathNode.value;
            var currentFileInfo = this.currentFileInfo;
            var currentDirectory = currentFileInfo.rewriteUrls
              ? currentFileInfo.currentDirectory
              : currentFileInfo.entryPath;
            var fragmentStart = filePath.indexOf("#");
            var fragment = "";
            if (fragmentStart !== -1) {
              fragment = filePath.slice(fragmentStart);
              filePath = filePath.slice(0, fragmentStart);
            }
            var context = utils.clone(this.context);
            context.rawBuffer = true;
            var fileManager = environment.getFileManager(
              filePath,
              currentDirectory,
              context,
              environment,
              true,
            );
            if (!fileManager) {
              return fallback(this, filePathNode);
            }
            var useBase64 = false;
            if (!mimetypeNode) {
              mimetype = environment.mimeLookup(filePath);
              if (mimetype === "image/svg+xml") {
                useBase64 = false;
              } else {
                var charset = environment.charsetLookup(mimetype);
                useBase64 = ["US-ASCII", "UTF-8"].indexOf(charset) < 0;
              }
              if (useBase64) {
                mimetype += ";base64";
              }
            } else {
              useBase64 = /;base64$/.test(mimetype);
            }
            var fileSync = fileManager.loadFileSync(
              filePath,
              currentDirectory,
              context,
              environment,
            );
            if (!fileSync.contents) {
              logger_1.default.warn(
                "Skipped data-uri embedding of ".concat(
                  filePath,
                  " because file not found",
                ),
              );
              return fallback(this, filePathNode || mimetypeNode);
            }
            var buf = fileSync.contents;
            if (useBase64 && !environment.encodeBase64) {
              return fallback(this, filePathNode);
            }
            buf = useBase64
              ? environment.encodeBase64(buf)
              : encodeURIComponent(buf);
            var uri = "data:"
              .concat(mimetype, ",")
              .concat(buf)
              .concat(fragment);
            return new url_1.default(
              new quoted_1.default(
                '"'.concat(uri, '"'),
                uri,
                false,
                this.index,
                this.currentFileInfo,
              ),
              this.index,
              this.currentFileInfo,
            );
          },
        };
      };
    },
    2614: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var defaultFunc = {
        eval: function () {
          var v = this.value_;
          var e = this.error_;
          if (e) {
            throw e;
          }
          if (!utils.isNullOrUndefined(v)) {
            return v ? keyword_1.default.True : keyword_1.default.False;
          }
        },
        value: function (v) {
          this.value_ = v;
        },
        error: function (e) {
          this.error_ = e;
        },
        reset: function () {
          this.value_ = this.error_ = null;
        },
      };
      exports["default"] = defaultFunc;
    },
    8403: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var functionCaller = (function () {
        function functionCaller(name, context, index, currentFileInfo) {
          this.name = name.toLowerCase();
          this.index = index;
          this.context = context;
          this.currentFileInfo = currentFileInfo;
          this.func = context.frames[0].functionRegistry.get(this.name);
        }
        functionCaller.prototype.isValid = function () {
          return Boolean(this.func);
        };
        functionCaller.prototype.call = function (args) {
          var _this = this;
          if (!Array.isArray(args)) {
            args = [args];
          }
          var evalArgs = this.func.evalArgs;
          if (evalArgs !== false) {
            args = args.map(function (a) {
              return a.eval(_this.context);
            });
          }
          var commentFilter = function (item) {
            return !(item.type === "Comment");
          };
          args = args.filter(commentFilter).map(function (item) {
            if (item.type === "Expression") {
              var subNodes = item.value.filter(commentFilter);
              if (subNodes.length === 1) {
                if (item.parens && subNodes[0].op === "/") {
                  return item;
                }
                return subNodes[0];
              } else {
                return new expression_1.default(subNodes);
              }
            }
            return item;
          });
          if (evalArgs === false) {
            return this.func.apply(
              this,
              tslib_1.__spreadArray([this.context], args, false),
            );
          }
          return this.func.apply(this, args);
        };
        return functionCaller;
      })();
      exports["default"] = functionCaller;
    },
    3247: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function makeRegistry(base) {
        return {
          _data: {},
          add: function (name, func) {
            name = name.toLowerCase();
            if (this._data.hasOwnProperty(name)) {
            }
            this._data[name] = func;
          },
          addMultiple: function (functions) {
            var _this = this;
            Object.keys(functions).forEach(function (name) {
              _this.add(name, functions[name]);
            });
          },
          get: function (name) {
            return this._data[name] || (base && base.get(name));
          },
          getLocalFunctions: function () {
            return this._data;
          },
          inherit: function () {
            return makeRegistry(this);
          },
          create: function (base) {
            return makeRegistry(base);
          },
        };
      }
      exports["default"] = makeRegistry(null);
    },
    7923: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var function_registry_1 = tslib_1.__importDefault(
        __nccwpck_require__(3247),
      );
      var function_caller_1 = tslib_1.__importDefault(
        __nccwpck_require__(8403),
      );
      var boolean_1 = tslib_1.__importDefault(__nccwpck_require__(835));
      var default_1 = tslib_1.__importDefault(__nccwpck_require__(2614));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(7460));
      var color_blending_1 = tslib_1.__importDefault(__nccwpck_require__(680));
      var data_uri_1 = tslib_1.__importDefault(__nccwpck_require__(4180));
      var list_1 = tslib_1.__importDefault(__nccwpck_require__(2167));
      var math_1 = tslib_1.__importDefault(__nccwpck_require__(5033));
      var number_1 = tslib_1.__importDefault(__nccwpck_require__(9946));
      var string_1 = tslib_1.__importDefault(__nccwpck_require__(7098));
      var svg_1 = tslib_1.__importDefault(__nccwpck_require__(3025));
      var types_1 = tslib_1.__importDefault(__nccwpck_require__(2306));
      var style_1 = tslib_1.__importDefault(__nccwpck_require__(5958));
      exports["default"] = function (environment) {
        var functions = {
          functionRegistry: function_registry_1.default,
          functionCaller: function_caller_1.default,
        };
        function_registry_1.default.addMultiple(boolean_1.default);
        function_registry_1.default.add(
          "default",
          default_1.default.eval.bind(default_1.default),
        );
        function_registry_1.default.addMultiple(color_1.default);
        function_registry_1.default.addMultiple(color_blending_1.default);
        function_registry_1.default.addMultiple(
          (0, data_uri_1.default)(environment),
        );
        function_registry_1.default.addMultiple(list_1.default);
        function_registry_1.default.addMultiple(math_1.default);
        function_registry_1.default.addMultiple(number_1.default);
        function_registry_1.default.addMultiple(string_1.default);
        function_registry_1.default.addMultiple(
          (0, svg_1.default)(environment),
        );
        function_registry_1.default.addMultiple(types_1.default);
        function_registry_1.default.addMultiple(style_1.default);
        return functions;
      };
    },
    2167: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var comment_1 = tslib_1.__importDefault(__nccwpck_require__(6435));
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var element_1 = tslib_1.__importDefault(__nccwpck_require__(7974));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var getItemsFromNode = function (node) {
        var items = Array.isArray(node.value) ? node.value : Array(node);
        return items;
      };
      exports["default"] = {
        _SELF: function (n) {
          return n;
        },
        "~": function () {
          var expr = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            expr[_i] = arguments[_i];
          }
          if (expr.length === 1) {
            return expr[0];
          }
          return new value_1.default(expr);
        },
        extract: function (values, index) {
          index = index.value - 1;
          return getItemsFromNode(values)[index];
        },
        length: function (values) {
          return new dimension_1.default(getItemsFromNode(values).length);
        },
        range: function (start, end, step) {
          var from;
          var to;
          var stepValue = 1;
          var list = [];
          if (end) {
            to = end;
            from = start.value;
            if (step) {
              stepValue = step.value;
            }
          } else {
            from = 1;
            to = start;
          }
          for (var i = from; i <= to.value; i += stepValue) {
            list.push(new dimension_1.default(i, to.unit));
          }
          return new expression_1.default(list);
        },
        each: function (list, rs) {
          var _this = this;
          var rules = [];
          var newRules;
          var iterator;
          var tryEval = function (val) {
            if (val instanceof node_1.default) {
              return val.eval(_this.context);
            }
            return val;
          };
          if (list.value && !(list instanceof quoted_1.default)) {
            if (Array.isArray(list.value)) {
              iterator = list.value.map(tryEval);
            } else {
              iterator = [tryEval(list.value)];
            }
          } else if (list.ruleset) {
            iterator = tryEval(list.ruleset).rules;
          } else if (list.rules) {
            iterator = list.rules.map(tryEval);
          } else if (Array.isArray(list)) {
            iterator = list.map(tryEval);
          } else {
            iterator = [tryEval(list)];
          }
          var valueName = "@value";
          var keyName = "@key";
          var indexName = "@index";
          if (rs.params) {
            valueName = rs.params[0] && rs.params[0].name;
            keyName = rs.params[1] && rs.params[1].name;
            indexName = rs.params[2] && rs.params[2].name;
            rs = rs.rules;
          } else {
            rs = rs.ruleset;
          }
          for (var i = 0; i < iterator.length; i++) {
            var key = void 0;
            var value = void 0;
            var item = iterator[i];
            if (item instanceof declaration_1.default) {
              key =
                typeof item.name === "string" ? item.name : item.name[0].value;
              value = item.value;
            } else {
              key = new dimension_1.default(i + 1);
              value = item;
            }
            if (item instanceof comment_1.default) {
              continue;
            }
            newRules = rs.rules.slice(0);
            if (valueName) {
              newRules.push(
                new declaration_1.default(
                  valueName,
                  value,
                  false,
                  false,
                  this.index,
                  this.currentFileInfo,
                ),
              );
            }
            if (indexName) {
              newRules.push(
                new declaration_1.default(
                  indexName,
                  new dimension_1.default(i + 1),
                  false,
                  false,
                  this.index,
                  this.currentFileInfo,
                ),
              );
            }
            if (keyName) {
              newRules.push(
                new declaration_1.default(
                  keyName,
                  key,
                  false,
                  false,
                  this.index,
                  this.currentFileInfo,
                ),
              );
            }
            rules.push(
              new ruleset_1.default(
                [new selector_1.default([new element_1.default("", "&")])],
                newRules,
                rs.strictImports,
                rs.visibilityInfo(),
              ),
            );
          }
          return new ruleset_1.default(
            [new selector_1.default([new element_1.default("", "&")])],
            rules,
            rs.strictImports,
            rs.visibilityInfo(),
          ).eval(this.context);
        },
      };
    },
    8890: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var MathHelper = function (fn, unit, n) {
        if (!(n instanceof dimension_1.default)) {
          throw { type: "Argument", message: "argument must be a number" };
        }
        if (unit === null) {
          unit = n.unit;
        } else {
          n = n.unify();
        }
        return new dimension_1.default(fn(parseFloat(n.value)), unit);
      };
      exports["default"] = MathHelper;
    },
    5033: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var math_helper_js_1 = tslib_1.__importDefault(__nccwpck_require__(8890));
      var mathFunctions = {
        ceil: null,
        floor: null,
        sqrt: null,
        abs: null,
        tan: "",
        sin: "",
        cos: "",
        atan: "rad",
        asin: "rad",
        acos: "rad",
      };
      for (var f in mathFunctions) {
        if (mathFunctions.hasOwnProperty(f)) {
          mathFunctions[f] = math_helper_js_1.default.bind(
            null,
            Math[f],
            mathFunctions[f],
          );
        }
      }
      mathFunctions.round = function (n, f) {
        var fraction = typeof f === "undefined" ? 0 : f.value;
        return (0, math_helper_js_1.default)(
          function (num) {
            return num.toFixed(fraction);
          },
          null,
          n,
        );
      };
      exports["default"] = mathFunctions;
    },
    9946: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var math_helper_js_1 = tslib_1.__importDefault(__nccwpck_require__(8890));
      var minMax = function (isMin, args) {
        var _this = this;
        args = Array.prototype.slice.call(args);
        switch (args.length) {
          case 0:
            throw {
              type: "Argument",
              message: "one or more arguments required",
            };
        }
        var i;
        var j;
        var current;
        var currentUnified;
        var referenceUnified;
        var unit;
        var unitStatic;
        var unitClone;
        var order = [];
        var values = {};
        for (i = 0; i < args.length; i++) {
          current = args[i];
          if (!(current instanceof dimension_1.default)) {
            if (Array.isArray(args[i].value)) {
              Array.prototype.push.apply(
                args,
                Array.prototype.slice.call(args[i].value),
              );
              continue;
            } else {
              throw { type: "Argument", message: "incompatible types" };
            }
          }
          currentUnified =
            current.unit.toString() === "" && unitClone !== undefined
              ? new dimension_1.default(current.value, unitClone).unify()
              : current.unify();
          unit =
            currentUnified.unit.toString() === "" && unitStatic !== undefined
              ? unitStatic
              : currentUnified.unit.toString();
          unitStatic =
            (unit !== "" && unitStatic === undefined) ||
            (unit !== "" && order[0].unify().unit.toString() === "")
              ? unit
              : unitStatic;
          unitClone =
            unit !== "" && unitClone === undefined
              ? current.unit.toString()
              : unitClone;
          j =
            values[""] !== undefined && unit !== "" && unit === unitStatic
              ? values[""]
              : values[unit];
          if (j === undefined) {
            if (unitStatic !== undefined && unit !== unitStatic) {
              throw { type: "Argument", message: "incompatible types" };
            }
            values[unit] = order.length;
            order.push(current);
            continue;
          }
          referenceUnified =
            order[j].unit.toString() === "" && unitClone !== undefined
              ? new dimension_1.default(order[j].value, unitClone).unify()
              : order[j].unify();
          if (
            (isMin && currentUnified.value < referenceUnified.value) ||
            (!isMin && currentUnified.value > referenceUnified.value)
          ) {
            order[j] = current;
          }
        }
        if (order.length == 1) {
          return order[0];
        }
        args = order
          .map(function (a) {
            return a.toCSS(_this.context);
          })
          .join(this.context.compress ? "," : ", ");
        return new anonymous_1.default(
          "".concat(isMin ? "min" : "max", "(").concat(args, ")"),
        );
      };
      exports["default"] = {
        min: function () {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return minMax.call(this, true, args);
          } catch (e) {}
        },
        max: function () {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return minMax.call(this, false, args);
          } catch (e) {}
        },
        convert: function (val, unit) {
          return val.convertTo(unit.value);
        },
        pi: function () {
          return new dimension_1.default(Math.PI);
        },
        mod: function (a, b) {
          return new dimension_1.default(a.value % b.value, a.unit);
        },
        pow: function (x, y) {
          if (typeof x === "number" && typeof y === "number") {
            x = new dimension_1.default(x);
            y = new dimension_1.default(y);
          } else if (
            !(x instanceof dimension_1.default) ||
            !(y instanceof dimension_1.default)
          ) {
            throw { type: "Argument", message: "arguments must be numbers" };
          }
          return new dimension_1.default(Math.pow(x.value, y.value), x.unit);
        },
        percentage: function (n) {
          var result = (0, math_helper_js_1.default)(
            function (num) {
              return num * 100;
            },
            "%",
            n,
          );
          return result;
        },
      };
    },
    7098: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var javascript_1 = tslib_1.__importDefault(__nccwpck_require__(8099));
      exports["default"] = {
        e: function (str) {
          return new quoted_1.default(
            '"',
            str instanceof javascript_1.default ? str.evaluated : str.value,
            true,
          );
        },
        escape: function (str) {
          return new anonymous_1.default(
            encodeURI(str.value)
              .replace(/=/g, "%3D")
              .replace(/:/g, "%3A")
              .replace(/#/g, "%23")
              .replace(/;/g, "%3B")
              .replace(/\(/g, "%28")
              .replace(/\)/g, "%29"),
          );
        },
        replace: function (string, pattern, replacement, flags) {
          var result = string.value;
          replacement =
            replacement.type === "Quoted"
              ? replacement.value
              : replacement.toCSS();
          result = result.replace(
            new RegExp(pattern.value, flags ? flags.value : ""),
            replacement,
          );
          return new quoted_1.default(
            string.quote || "",
            result,
            string.escaped,
          );
        },
        "%": function (string) {
          var args = Array.prototype.slice.call(arguments, 1);
          var result = string.value;
          var _loop_1 = function (i) {
            result = result.replace(/%[sda]/i, function (token) {
              var value =
                args[i].type === "Quoted" && token.match(/s/i)
                  ? args[i].value
                  : args[i].toCSS();
              return token.match(/[A-Z]$/) ? encodeURIComponent(value) : value;
            });
          };
          for (var i = 0; i < args.length; i++) {
            _loop_1(i);
          }
          result = result.replace(/%%/g, "%");
          return new quoted_1.default(
            string.quote || "",
            result,
            string.escaped,
          );
        },
      };
    },
    5958: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var variable_2 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var styleExpression = function (args) {
        var _this = this;
        args = Array.prototype.slice.call(args);
        switch (args.length) {
          case 0:
            throw {
              type: "Argument",
              message: "one or more arguments required",
            };
        }
        var entityList = [
          new variable_1.default(
            args[0].value,
            this.index,
            this.currentFileInfo,
          ).eval(this.context),
        ];
        args = entityList
          .map(function (a) {
            return a.toCSS(_this.context);
          })
          .join(this.context.compress ? "," : ", ");
        return new variable_2.default("style(".concat(args, ")"));
      };
      exports["default"] = {
        style: function () {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return styleExpression.call(this, args);
          } catch (e) {}
        },
      };
    },
    3025: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(595));
      exports["default"] = function () {
        return {
          "svg-gradient": function (direction) {
            var stops;
            var gradientDirectionSvg;
            var gradientType = "linear";
            var rectangleDimension = 'x="0" y="0" width="1" height="1"';
            var renderEnv = { compress: false };
            var returner;
            var directionValue = direction.toCSS(renderEnv);
            var i;
            var color;
            var position;
            var positionValue;
            var alpha;
            function throwArgumentDescriptor() {
              throw {
                type: "Argument",
                message:
                  "svg-gradient expects direction, start_color [start_position], [color position,]...," +
                  " end_color [end_position] or direction, color list",
              };
            }
            if (arguments.length == 2) {
              if (arguments[1].value.length < 2) {
                throwArgumentDescriptor();
              }
              stops = arguments[1].value;
            } else if (arguments.length < 3) {
              throwArgumentDescriptor();
            } else {
              stops = Array.prototype.slice.call(arguments, 1);
            }
            switch (directionValue) {
              case "to bottom":
                gradientDirectionSvg = 'x1="0%" y1="0%" x2="0%" y2="100%"';
                break;
              case "to right":
                gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="0%"';
                break;
              case "to bottom right":
                gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="100%"';
                break;
              case "to top right":
                gradientDirectionSvg = 'x1="0%" y1="100%" x2="100%" y2="0%"';
                break;
              case "ellipse":
              case "ellipse at center":
                gradientType = "radial";
                gradientDirectionSvg = 'cx="50%" cy="50%" r="75%"';
                rectangleDimension = 'x="-50" y="-50" width="101" height="101"';
                break;
              default:
                throw {
                  type: "Argument",
                  message:
                    "svg-gradient direction must be 'to bottom', 'to right'," +
                    " 'to bottom right', 'to top right' or 'ellipse at center'",
                };
            }
            returner =
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><'
                .concat(gradientType, 'Gradient id="g" ')
                .concat(gradientDirectionSvg, ">");
            for (i = 0; i < stops.length; i += 1) {
              if (stops[i] instanceof expression_1.default) {
                color = stops[i].value[0];
                position = stops[i].value[1];
              } else {
                color = stops[i];
                position = undefined;
              }
              if (
                !(color instanceof color_1.default) ||
                (!(
                  (i === 0 || i + 1 === stops.length) &&
                  position === undefined
                ) &&
                  !(position instanceof dimension_1.default))
              ) {
                throwArgumentDescriptor();
              }
              positionValue = position
                ? position.toCSS(renderEnv)
                : i === 0
                  ? "0%"
                  : "100%";
              alpha = color.alpha;
              returner += '<stop offset="'
                .concat(positionValue, '" stop-color="')
                .concat(color.toRGB(), '"')
                .concat(
                  alpha < 1 ? ' stop-opacity="'.concat(alpha, '"') : "",
                  "/>",
                );
            }
            returner += "</"
              .concat(gradientType, "Gradient><rect ")
              .concat(rectangleDimension, ' fill="url(#g)" /></svg>');
            returner = encodeURIComponent(returner);
            returner = "data:image/svg+xml,".concat(returner);
            return new url_1.default(
              new quoted_1.default(
                "'".concat(returner, "'"),
                returner,
                false,
                this.index,
                this.currentFileInfo,
              ),
              this.index,
              this.currentFileInfo,
            );
          },
        };
      };
    },
    2306: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      var detached_ruleset_1 = tslib_1.__importDefault(
        __nccwpck_require__(4393),
      );
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(595));
      var operation_1 = tslib_1.__importDefault(__nccwpck_require__(2351));
      var isa = function (n, Type) {
        return n instanceof Type
          ? keyword_1.default.True
          : keyword_1.default.False;
      };
      var isunit = function (n, unit) {
        if (unit === undefined) {
          throw {
            type: "Argument",
            message: "missing the required second argument to isunit.",
          };
        }
        unit = typeof unit.value === "string" ? unit.value : unit;
        if (typeof unit !== "string") {
          throw {
            type: "Argument",
            message: "Second argument to isunit should be a unit or a string.",
          };
        }
        return n instanceof dimension_1.default && n.unit.is(unit)
          ? keyword_1.default.True
          : keyword_1.default.False;
      };
      exports["default"] = {
        isruleset: function (n) {
          return isa(n, detached_ruleset_1.default);
        },
        iscolor: function (n) {
          return isa(n, color_1.default);
        },
        isnumber: function (n) {
          return isa(n, dimension_1.default);
        },
        isstring: function (n) {
          return isa(n, quoted_1.default);
        },
        iskeyword: function (n) {
          return isa(n, keyword_1.default);
        },
        isurl: function (n) {
          return isa(n, url_1.default);
        },
        ispixel: function (n) {
          return isunit(n, "px");
        },
        ispercentage: function (n) {
          return isunit(n, "%");
        },
        isem: function (n) {
          return isunit(n, "em");
        },
        isunit,
        unit: function (val, unit) {
          if (!(val instanceof dimension_1.default)) {
            throw {
              type: "Argument",
              message: "the first argument to unit must be a number".concat(
                val instanceof operation_1.default
                  ? ". Have you forgotten parenthesis?"
                  : "",
              ),
            };
          }
          if (unit) {
            if (unit instanceof keyword_1.default) {
              unit = unit.value;
            } else {
              unit = unit.toCSS();
            }
          } else {
            unit = "";
          }
          return new dimension_1.default(val.value, unit);
        },
        "get-unit": function (n) {
          return new anonymous_1.default(n.unit);
        },
      };
    },
    8782: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var parser_1 = tslib_1.__importDefault(__nccwpck_require__(7613));
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      function default_1(environment) {
        var ImportManager = (function () {
          function ImportManager(less, context, rootFileInfo) {
            this.less = less;
            this.rootFilename = rootFileInfo.filename;
            this.paths = context.paths || [];
            this.contents = {};
            this.contentsIgnoredChars = {};
            this.mime = context.mime;
            this.error = null;
            this.context = context;
            this.queue = [];
            this.files = {};
          }
          ImportManager.prototype.push = function (
            path,
            tryAppendExtension,
            currentFileInfo,
            importOptions,
            callback,
          ) {
            var importManager = this,
              pluginLoader = this.context.pluginManager.Loader;
            this.queue.push(path);
            var fileParsedFunc = function (e, root, fullPath) {
              importManager.queue.splice(importManager.queue.indexOf(path), 1);
              var importedEqualsRoot = fullPath === importManager.rootFilename;
              if (importOptions.optional && e) {
                callback(null, { rules: [] }, false, null);
                logger_1.default.info(
                  "The file ".concat(
                    fullPath,
                    " was skipped because it was not found and the import was marked optional.",
                  ),
                );
              } else {
                if (!importManager.files[fullPath] && !importOptions.inline) {
                  importManager.files[fullPath] = {
                    root,
                    options: importOptions,
                  };
                }
                if (e && !importManager.error) {
                  importManager.error = e;
                }
                callback(e, root, importedEqualsRoot, fullPath);
              }
            };
            var newFileInfo = {
              rewriteUrls: this.context.rewriteUrls,
              entryPath: currentFileInfo.entryPath,
              rootpath: currentFileInfo.rootpath,
              rootFilename: currentFileInfo.rootFilename,
            };
            var fileManager = environment.getFileManager(
              path,
              currentFileInfo.currentDirectory,
              this.context,
              environment,
            );
            if (!fileManager) {
              fileParsedFunc({
                message: "Could not find a file-manager for ".concat(path),
              });
              return;
            }
            var loadFileCallback = function (loadedFile) {
              var plugin;
              var resolvedFilename = loadedFile.filename;
              var contents = loadedFile.contents.replace(/^\uFEFF/, "");
              newFileInfo.currentDirectory =
                fileManager.getPath(resolvedFilename);
              if (newFileInfo.rewriteUrls) {
                newFileInfo.rootpath = fileManager.join(
                  importManager.context.rootpath || "",
                  fileManager.pathDiff(
                    newFileInfo.currentDirectory,
                    newFileInfo.entryPath,
                  ),
                );
                if (
                  !fileManager.isPathAbsolute(newFileInfo.rootpath) &&
                  fileManager.alwaysMakePathsAbsolute()
                ) {
                  newFileInfo.rootpath = fileManager.join(
                    newFileInfo.entryPath,
                    newFileInfo.rootpath,
                  );
                }
              }
              newFileInfo.filename = resolvedFilename;
              var newEnv = new contexts_1.default.Parse(importManager.context);
              newEnv.processImports = false;
              importManager.contents[resolvedFilename] = contents;
              if (currentFileInfo.reference || importOptions.reference) {
                newFileInfo.reference = true;
              }
              if (importOptions.isPlugin) {
                plugin = pluginLoader.evalPlugin(
                  contents,
                  newEnv,
                  importManager,
                  importOptions.pluginArgs,
                  newFileInfo,
                );
                if (plugin instanceof less_error_1.default) {
                  fileParsedFunc(plugin, null, resolvedFilename);
                } else {
                  fileParsedFunc(null, plugin, resolvedFilename);
                }
              } else if (importOptions.inline) {
                fileParsedFunc(null, contents, resolvedFilename);
              } else {
                if (
                  importManager.files[resolvedFilename] &&
                  !importManager.files[resolvedFilename].options.multiple &&
                  !importOptions.multiple
                ) {
                  fileParsedFunc(
                    null,
                    importManager.files[resolvedFilename].root,
                    resolvedFilename,
                  );
                } else {
                  new parser_1.default(
                    newEnv,
                    importManager,
                    newFileInfo,
                  ).parse(contents, function (e, root) {
                    fileParsedFunc(e, root, resolvedFilename);
                  });
                }
              }
            };
            var loadedFile;
            var promise;
            var context = utils.clone(this.context);
            if (tryAppendExtension) {
              context.ext = importOptions.isPlugin ? ".js" : ".less";
            }
            if (importOptions.isPlugin) {
              context.mime = "application/javascript";
              if (context.syncImport) {
                loadedFile = pluginLoader.loadPluginSync(
                  path,
                  currentFileInfo.currentDirectory,
                  context,
                  environment,
                  fileManager,
                );
              } else {
                promise = pluginLoader.loadPlugin(
                  path,
                  currentFileInfo.currentDirectory,
                  context,
                  environment,
                  fileManager,
                );
              }
            } else {
              if (context.syncImport) {
                loadedFile = fileManager.loadFileSync(
                  path,
                  currentFileInfo.currentDirectory,
                  context,
                  environment,
                );
              } else {
                promise = fileManager.loadFile(
                  path,
                  currentFileInfo.currentDirectory,
                  context,
                  environment,
                  function (err, loadedFile) {
                    if (err) {
                      fileParsedFunc(err);
                    } else {
                      loadFileCallback(loadedFile);
                    }
                  },
                );
              }
            }
            if (loadedFile) {
              if (!loadedFile.filename) {
                fileParsedFunc(loadedFile);
              } else {
                loadFileCallback(loadedFile);
              }
            } else if (promise) {
              promise.then(loadFileCallback, fileParsedFunc);
            }
          };
          return ImportManager;
        })();
        return ImportManager;
      }
      exports["default"] = default_1;
    },
    4777: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var environment_1 = tslib_1.__importDefault(__nccwpck_require__(7026));
      var data_1 = tslib_1.__importDefault(__nccwpck_require__(1654));
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      var abstract_file_manager_1 = tslib_1.__importDefault(
        __nccwpck_require__(758),
      );
      var abstract_plugin_loader_1 = tslib_1.__importDefault(
        __nccwpck_require__(6353),
      );
      var visitors_1 = tslib_1.__importDefault(__nccwpck_require__(3185));
      var parser_1 = tslib_1.__importDefault(__nccwpck_require__(7613));
      var functions_1 = tslib_1.__importDefault(__nccwpck_require__(7923));
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var transform_tree_1 = tslib_1.__importDefault(__nccwpck_require__(8054));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var plugin_manager_1 = tslib_1.__importDefault(__nccwpck_require__(620));
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      var source_map_output_1 = tslib_1.__importDefault(
        __nccwpck_require__(8421),
      );
      var source_map_builder_1 = tslib_1.__importDefault(
        __nccwpck_require__(2785),
      );
      var parse_tree_1 = tslib_1.__importDefault(__nccwpck_require__(7967));
      var import_manager_1 = tslib_1.__importDefault(__nccwpck_require__(8782));
      var parse_1 = tslib_1.__importDefault(__nccwpck_require__(2286));
      var render_1 = tslib_1.__importDefault(__nccwpck_require__(1881));
      var package_json_1 = __nccwpck_require__(3344);
      var parse_node_version_1 = tslib_1.__importDefault(
        __nccwpck_require__(3394),
      );
      function default_1(environment, fileManagers) {
        var sourceMapOutput, sourceMapBuilder, parseTree, importManager;
        environment = new environment_1.default(environment, fileManagers);
        sourceMapOutput = (0, source_map_output_1.default)(environment);
        sourceMapBuilder = (0, source_map_builder_1.default)(
          sourceMapOutput,
          environment,
        );
        parseTree = (0, parse_tree_1.default)(sourceMapBuilder);
        importManager = (0, import_manager_1.default)(environment);
        var render = (0, render_1.default)(
          environment,
          parseTree,
          importManager,
        );
        var parse = (0, parse_1.default)(environment, parseTree, importManager);
        var v = (0, parse_node_version_1.default)(
          "v".concat(package_json_1.version),
        );
        var initial = {
          version: [v.major, v.minor, v.patch],
          data: data_1.default,
          tree: tree_1.default,
          Environment: environment_1.default,
          AbstractFileManager: abstract_file_manager_1.default,
          AbstractPluginLoader: abstract_plugin_loader_1.default,
          environment,
          visitors: visitors_1.default,
          Parser: parser_1.default,
          functions: (0, functions_1.default)(environment),
          contexts: contexts_1.default,
          SourceMapOutput: sourceMapOutput,
          SourceMapBuilder: sourceMapBuilder,
          ParseTree: parseTree,
          ImportManager: importManager,
          render,
          parse,
          LessError: less_error_1.default,
          transformTree: transform_tree_1.default,
          utils,
          PluginManager: plugin_manager_1.default,
          logger: logger_1.default,
        };
        var ctor = function (t) {
          return function () {
            var obj = Object.create(t.prototype);
            t.apply(obj, Array.prototype.slice.call(arguments, 0));
            return obj;
          };
        };
        var t;
        var api = Object.create(initial);
        for (var n in initial.tree) {
          t = initial.tree[n];
          if (typeof t === "function") {
            api[n.toLowerCase()] = ctor(t);
          } else {
            api[n] = Object.create(null);
            for (var o in t) {
              api[n][o.toLowerCase()] = ctor(t[o]);
            }
          }
        }
        initial.parse = initial.parse.bind(api);
        initial.render = initial.render.bind(api);
        return api;
      }
      exports["default"] = default_1;
    },
    4971: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var anonymousFunc = /(<anonymous>|Function):(\d+):(\d+)/;
      var LessError = function (e, fileContentMap, currentFilename) {
        Error.call(this);
        var filename = e.filename || currentFilename;
        this.message = e.message;
        this.stack = e.stack;
        if (fileContentMap && filename) {
          var input = fileContentMap.contents[filename];
          var loc = utils.getLocation(e.index, input);
          var line = loc.line;
          var col = loc.column;
          var callLine = e.call && utils.getLocation(e.call, input).line;
          var lines = input ? input.split("\n") : "";
          this.type = e.type || "Syntax";
          this.filename = filename;
          this.index = e.index;
          this.line = typeof line === "number" ? line + 1 : null;
          this.column = col;
          if (!this.line && this.stack) {
            var found = this.stack.match(anonymousFunc);
            var func = new Function("a", "throw new Error()");
            var lineAdjust = 0;
            try {
              func();
            } catch (e) {
              var match = e.stack.match(anonymousFunc);
              lineAdjust = 1 - parseInt(match[2]);
            }
            if (found) {
              if (found[2]) {
                this.line = parseInt(found[2]) + lineAdjust;
              }
              if (found[3]) {
                this.column = parseInt(found[3]);
              }
            }
          }
          this.callLine = callLine + 1;
          this.callExtract = lines[callLine];
          this.extract = [
            lines[this.line - 2],
            lines[this.line - 1],
            lines[this.line],
          ];
        }
      };
      if (typeof Object.create === "undefined") {
        var F = function () {};
        F.prototype = Error.prototype;
        LessError.prototype = new F();
      } else {
        LessError.prototype = Object.create(Error.prototype);
      }
      LessError.prototype.constructor = LessError;
      LessError.prototype.toString = function (options) {
        var _a;
        options = options || {};
        var isWarning = ((_a = this.type) !== null && _a !== void 0 ? _a : "")
          .toLowerCase()
          .includes("warning");
        var type = isWarning ? this.type : "".concat(this.type, "Error");
        var color = isWarning ? "yellow" : "red";
        var message = "";
        var extract = this.extract || [];
        var error = [];
        var stylize = function (str) {
          return str;
        };
        if (options.stylize) {
          var type_1 = typeof options.stylize;
          if (type_1 !== "function") {
            throw Error(
              "options.stylize should be a function, got a ".concat(
                type_1,
                "!",
              ),
            );
          }
          stylize = options.stylize;
        }
        if (this.line !== null) {
          if (!isWarning && typeof extract[0] === "string") {
            error.push(
              stylize("".concat(this.line - 1, " ").concat(extract[0]), "grey"),
            );
          }
          if (typeof extract[1] === "string") {
            var errorTxt = "".concat(this.line, " ");
            if (extract[1]) {
              errorTxt +=
                extract[1].slice(0, this.column) +
                stylize(
                  stylize(
                    stylize(extract[1].substr(this.column, 1), "bold") +
                      extract[1].slice(this.column + 1),
                    "red",
                  ),
                  "inverse",
                );
            }
            error.push(errorTxt);
          }
          if (!isWarning && typeof extract[2] === "string") {
            error.push(
              stylize("".concat(this.line + 1, " ").concat(extract[2]), "grey"),
            );
          }
          error = "".concat(error.join("\n") + stylize("", "reset"), "\n");
        }
        message += stylize("".concat(type, ": ").concat(this.message), color);
        if (this.filename) {
          message += stylize(" in ", color) + this.filename;
        }
        if (this.line) {
          message += stylize(
            " on line "
              .concat(this.line, ", column ")
              .concat(this.column + 1, ":"),
            "grey",
          );
        }
        message += "\n".concat(error);
        if (this.callLine) {
          message += "".concat(
            stylize("from ", color) + (this.filename || ""),
            "/n",
          );
          message += ""
            .concat(stylize(this.callLine, "grey"), " ")
            .concat(this.callExtract, "/n");
        }
        return message;
      };
      exports["default"] = LessError;
    },
    1625: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports["default"] = {
        error: function (msg) {
          this._fireEvent("error", msg);
        },
        warn: function (msg) {
          this._fireEvent("warn", msg);
        },
        info: function (msg) {
          this._fireEvent("info", msg);
        },
        debug: function (msg) {
          this._fireEvent("debug", msg);
        },
        addListener: function (listener) {
          this._listeners.push(listener);
        },
        removeListener: function (listener) {
          for (var i = 0; i < this._listeners.length; i++) {
            if (this._listeners[i] === listener) {
              this._listeners.splice(i, 1);
              return;
            }
          }
        },
        _fireEvent: function (type, msg) {
          for (var i = 0; i < this._listeners.length; i++) {
            var logFunction = this._listeners[i][type];
            if (logFunction) {
              logFunction(msg);
            }
          }
        },
        _listeners: [],
      };
    },
    7967: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var transform_tree_1 = tslib_1.__importDefault(__nccwpck_require__(8054));
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      function default_1(SourceMapBuilder) {
        var ParseTree = (function () {
          function ParseTree(root, imports) {
            this.root = root;
            this.imports = imports;
          }
          ParseTree.prototype.toCSS = function (options) {
            var evaldRoot;
            var result = {};
            var sourceMapBuilder;
            try {
              evaldRoot = (0, transform_tree_1.default)(this.root, options);
            } catch (e) {
              throw new less_error_1.default(e, this.imports);
            }
            try {
              var compress = Boolean(options.compress);
              if (compress) {
                logger_1.default.warn(
                  "The compress option has been deprecated. " +
                    "We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.",
                );
              }
              var toCSSOptions = {
                compress,
                dumpLineNumbers: options.dumpLineNumbers,
                strictUnits: Boolean(options.strictUnits),
                numPrecision: 8,
              };
              if (options.sourceMap) {
                sourceMapBuilder = new SourceMapBuilder(options.sourceMap);
                result.css = sourceMapBuilder.toCSS(
                  evaldRoot,
                  toCSSOptions,
                  this.imports,
                );
              } else {
                result.css = evaldRoot.toCSS(toCSSOptions);
              }
            } catch (e) {
              throw new less_error_1.default(e, this.imports);
            }
            if (options.pluginManager) {
              var postProcessors = options.pluginManager.getPostProcessors();
              for (var i = 0; i < postProcessors.length; i++) {
                result.css = postProcessors[i].process(result.css, {
                  sourceMap: sourceMapBuilder,
                  options,
                  imports: this.imports,
                });
              }
            }
            if (options.sourceMap) {
              result.map = sourceMapBuilder.getExternalSourceMap();
            }
            result.imports = [];
            for (var file in this.imports.files) {
              if (
                Object.prototype.hasOwnProperty.call(
                  this.imports.files,
                  file,
                ) &&
                file !== this.imports.rootFilename
              ) {
                result.imports.push(file);
              }
            }
            return result;
          };
          return ParseTree;
        })();
        return ParseTree;
      }
      exports["default"] = default_1;
    },
    2286: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var parser_1 = tslib_1.__importDefault(__nccwpck_require__(7613));
      var plugin_manager_1 = tslib_1.__importDefault(__nccwpck_require__(620));
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      function default_1(environment, ParseTree, ImportManager) {
        var parse = function (input, options, callback) {
          if (typeof options === "function") {
            callback = options;
            options = utils.copyOptions(this.options, {});
          } else {
            options = utils.copyOptions(this.options, options || {});
          }
          if (!callback) {
            var self_1 = this;
            return new Promise(function (resolve, reject) {
              parse.call(self_1, input, options, function (err, output) {
                if (err) {
                  reject(err);
                } else {
                  resolve(output);
                }
              });
            });
          } else {
            var context_1;
            var rootFileInfo = void 0;
            var pluginManager_1 = new plugin_manager_1.default(
              this,
              !options.reUsePluginManager,
            );
            options.pluginManager = pluginManager_1;
            context_1 = new contexts_1.default.Parse(options);
            if (options.rootFileInfo) {
              rootFileInfo = options.rootFileInfo;
            } else {
              var filename = options.filename || "input";
              var entryPath = filename.replace(/[^/\\]*$/, "");
              rootFileInfo = {
                filename,
                rewriteUrls: context_1.rewriteUrls,
                rootpath: context_1.rootpath || "",
                currentDirectory: entryPath,
                entryPath,
                rootFilename: filename,
              };
              if (
                rootFileInfo.rootpath &&
                rootFileInfo.rootpath.slice(-1) !== "/"
              ) {
                rootFileInfo.rootpath += "/";
              }
            }
            var imports_1 = new ImportManager(this, context_1, rootFileInfo);
            this.importManager = imports_1;
            if (options.plugins) {
              options.plugins.forEach(function (plugin) {
                var evalResult, contents;
                if (plugin.fileContent) {
                  contents = plugin.fileContent.replace(/^\uFEFF/, "");
                  evalResult = pluginManager_1.Loader.evalPlugin(
                    contents,
                    context_1,
                    imports_1,
                    plugin.options,
                    plugin.filename,
                  );
                  if (evalResult instanceof less_error_1.default) {
                    return callback(evalResult);
                  }
                } else {
                  pluginManager_1.addPlugin(plugin);
                }
              });
            }
            new parser_1.default(context_1, imports_1, rootFileInfo).parse(
              input,
              function (e, root) {
                if (e) {
                  return callback(e);
                }
                callback(null, root, imports_1, options);
              },
              options,
            );
          }
        };
        return parse;
      }
      exports["default"] = default_1;
    },
    9255: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function default_1(input, fail) {
        var len = input.length;
        var level = 0;
        var parenLevel = 0;
        var lastOpening;
        var lastOpeningParen;
        var lastMultiComment;
        var lastMultiCommentEndBrace;
        var chunks = [];
        var emitFrom = 0;
        var chunkerCurrentIndex;
        var currentChunkStartIndex;
        var cc;
        var cc2;
        var matched;
        function emitChunk(force) {
          var len = chunkerCurrentIndex - emitFrom;
          if ((len < 512 && !force) || !len) {
            return;
          }
          chunks.push(input.slice(emitFrom, chunkerCurrentIndex + 1));
          emitFrom = chunkerCurrentIndex + 1;
        }
        for (
          chunkerCurrentIndex = 0;
          chunkerCurrentIndex < len;
          chunkerCurrentIndex++
        ) {
          cc = input.charCodeAt(chunkerCurrentIndex);
          if ((cc >= 97 && cc <= 122) || cc < 34) {
            continue;
          }
          switch (cc) {
            case 40:
              parenLevel++;
              lastOpeningParen = chunkerCurrentIndex;
              continue;
            case 41:
              if (--parenLevel < 0) {
                return fail("missing opening `(`", chunkerCurrentIndex);
              }
              continue;
            case 59:
              if (!parenLevel) {
                emitChunk();
              }
              continue;
            case 123:
              level++;
              lastOpening = chunkerCurrentIndex;
              continue;
            case 125:
              if (--level < 0) {
                return fail("missing opening `{`", chunkerCurrentIndex);
              }
              if (!level && !parenLevel) {
                emitChunk();
              }
              continue;
            case 92:
              if (chunkerCurrentIndex < len - 1) {
                chunkerCurrentIndex++;
                continue;
              }
              return fail("unescaped `\\`", chunkerCurrentIndex);
            case 34:
            case 39:
            case 96:
              matched = 0;
              currentChunkStartIndex = chunkerCurrentIndex;
              for (
                chunkerCurrentIndex = chunkerCurrentIndex + 1;
                chunkerCurrentIndex < len;
                chunkerCurrentIndex++
              ) {
                cc2 = input.charCodeAt(chunkerCurrentIndex);
                if (cc2 > 96) {
                  continue;
                }
                if (cc2 == cc) {
                  matched = 1;
                  break;
                }
                if (cc2 == 92) {
                  if (chunkerCurrentIndex == len - 1) {
                    return fail("unescaped `\\`", chunkerCurrentIndex);
                  }
                  chunkerCurrentIndex++;
                }
              }
              if (matched) {
                continue;
              }
              return fail(
                "unmatched `".concat(String.fromCharCode(cc), "`"),
                currentChunkStartIndex,
              );
            case 47:
              if (parenLevel || chunkerCurrentIndex == len - 1) {
                continue;
              }
              cc2 = input.charCodeAt(chunkerCurrentIndex + 1);
              if (cc2 == 47) {
                for (
                  chunkerCurrentIndex = chunkerCurrentIndex + 2;
                  chunkerCurrentIndex < len;
                  chunkerCurrentIndex++
                ) {
                  cc2 = input.charCodeAt(chunkerCurrentIndex);
                  if (cc2 <= 13 && (cc2 == 10 || cc2 == 13)) {
                    break;
                  }
                }
              } else if (cc2 == 42) {
                lastMultiComment = currentChunkStartIndex = chunkerCurrentIndex;
                for (
                  chunkerCurrentIndex = chunkerCurrentIndex + 2;
                  chunkerCurrentIndex < len - 1;
                  chunkerCurrentIndex++
                ) {
                  cc2 = input.charCodeAt(chunkerCurrentIndex);
                  if (cc2 == 125) {
                    lastMultiCommentEndBrace = chunkerCurrentIndex;
                  }
                  if (cc2 != 42) {
                    continue;
                  }
                  if (input.charCodeAt(chunkerCurrentIndex + 1) == 47) {
                    break;
                  }
                }
                if (chunkerCurrentIndex == len - 1) {
                  return fail("missing closing `*/`", currentChunkStartIndex);
                }
                chunkerCurrentIndex++;
              }
              continue;
            case 42:
              if (
                chunkerCurrentIndex < len - 1 &&
                input.charCodeAt(chunkerCurrentIndex + 1) == 47
              ) {
                return fail("unmatched `/*`", chunkerCurrentIndex);
              }
              continue;
          }
        }
        if (level !== 0) {
          if (
            lastMultiComment > lastOpening &&
            lastMultiCommentEndBrace > lastMultiComment
          ) {
            return fail("missing closing `}` or `*/`", lastOpening);
          } else {
            return fail("missing closing `}`", lastOpening);
          }
        } else if (parenLevel !== 0) {
          return fail("missing closing `)`", lastOpeningParen);
        }
        emitChunk(true);
        return chunks;
      }
      exports["default"] = default_1;
    },
    7367: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var chunker_1 = tslib_1.__importDefault(__nccwpck_require__(9255));
      exports["default"] = function () {
        var input;
        var j;
        var saveStack = [];
        var furthest;
        var furthestPossibleErrorMessage;
        var chunks;
        var current;
        var currentPos;
        var parserInput = {};
        var CHARCODE_SPACE = 32;
        var CHARCODE_TAB = 9;
        var CHARCODE_LF = 10;
        var CHARCODE_CR = 13;
        var CHARCODE_PLUS = 43;
        var CHARCODE_COMMA = 44;
        var CHARCODE_FORWARD_SLASH = 47;
        var CHARCODE_9 = 57;
        function skipWhitespace(length) {
          var oldi = parserInput.i;
          var oldj = j;
          var curr = parserInput.i - currentPos;
          var endIndex = parserInput.i + current.length - curr;
          var mem = (parserInput.i += length);
          var inp = input;
          var c;
          var nextChar;
          var comment;
          for (; parserInput.i < endIndex; parserInput.i++) {
            c = inp.charCodeAt(parserInput.i);
            if (parserInput.autoCommentAbsorb && c === CHARCODE_FORWARD_SLASH) {
              nextChar = inp.charAt(parserInput.i + 1);
              if (nextChar === "/") {
                comment = { index: parserInput.i, isLineComment: true };
                var nextNewLine = inp.indexOf("\n", parserInput.i + 2);
                if (nextNewLine < 0) {
                  nextNewLine = endIndex;
                }
                parserInput.i = nextNewLine;
                comment.text = inp.substr(
                  comment.index,
                  parserInput.i - comment.index,
                );
                parserInput.commentStore.push(comment);
                continue;
              } else if (nextChar === "*") {
                var nextStarSlash = inp.indexOf("*/", parserInput.i + 2);
                if (nextStarSlash >= 0) {
                  comment = {
                    index: parserInput.i,
                    text: inp.substr(
                      parserInput.i,
                      nextStarSlash + 2 - parserInput.i,
                    ),
                    isLineComment: false,
                  };
                  parserInput.i += comment.text.length - 1;
                  parserInput.commentStore.push(comment);
                  continue;
                }
              }
              break;
            }
            if (
              c !== CHARCODE_SPACE &&
              c !== CHARCODE_LF &&
              c !== CHARCODE_TAB &&
              c !== CHARCODE_CR
            ) {
              break;
            }
          }
          current = current.slice(length + parserInput.i - mem + curr);
          currentPos = parserInput.i;
          if (!current.length) {
            if (j < chunks.length - 1) {
              current = chunks[++j];
              skipWhitespace(0);
              return true;
            }
            parserInput.finished = true;
          }
          return oldi !== parserInput.i || oldj !== j;
        }
        parserInput.save = function () {
          currentPos = parserInput.i;
          saveStack.push({ current, i: parserInput.i, j });
        };
        parserInput.restore = function (possibleErrorMessage) {
          if (
            parserInput.i > furthest ||
            (parserInput.i === furthest &&
              possibleErrorMessage &&
              !furthestPossibleErrorMessage)
          ) {
            furthest = parserInput.i;
            furthestPossibleErrorMessage = possibleErrorMessage;
          }
          var state = saveStack.pop();
          current = state.current;
          currentPos = parserInput.i = state.i;
          j = state.j;
        };
        parserInput.forget = function () {
          saveStack.pop();
        };
        parserInput.isWhitespace = function (offset) {
          var pos = parserInput.i + (offset || 0);
          var code = input.charCodeAt(pos);
          return (
            code === CHARCODE_SPACE ||
            code === CHARCODE_CR ||
            code === CHARCODE_TAB ||
            code === CHARCODE_LF
          );
        };
        parserInput.$re = function (tok) {
          if (parserInput.i > currentPos) {
            current = current.slice(parserInput.i - currentPos);
            currentPos = parserInput.i;
          }
          var m = tok.exec(current);
          if (!m) {
            return null;
          }
          skipWhitespace(m[0].length);
          if (typeof m === "string") {
            return m;
          }
          return m.length === 1 ? m[0] : m;
        };
        parserInput.$char = function (tok) {
          if (input.charAt(parserInput.i) !== tok) {
            return null;
          }
          skipWhitespace(1);
          return tok;
        };
        parserInput.$peekChar = function (tok) {
          if (input.charAt(parserInput.i) !== tok) {
            return null;
          }
          return tok;
        };
        parserInput.$str = function (tok) {
          var tokLength = tok.length;
          for (var i = 0; i < tokLength; i++) {
            if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
              return null;
            }
          }
          skipWhitespace(tokLength);
          return tok;
        };
        parserInput.$quoted = function (loc) {
          var pos = loc || parserInput.i;
          var startChar = input.charAt(pos);
          if (startChar !== "'" && startChar !== '"') {
            return;
          }
          var length = input.length;
          var currentPosition = pos;
          for (var i = 1; i + currentPosition < length; i++) {
            var nextChar = input.charAt(i + currentPosition);
            switch (nextChar) {
              case "\\":
                i++;
                continue;
              case "\r":
              case "\n":
                break;
              case startChar: {
                var str = input.substr(currentPosition, i + 1);
                if (!loc && loc !== 0) {
                  skipWhitespace(i + 1);
                  return str;
                }
                return [startChar, str];
              }
              default:
            }
          }
          return null;
        };
        parserInput.$parseUntil = function (tok) {
          var quote = "";
          var returnVal = null;
          var inComment = false;
          var blockDepth = 0;
          var blockStack = [];
          var parseGroups = [];
          var length = input.length;
          var startPos = parserInput.i;
          var lastPos = parserInput.i;
          var i = parserInput.i;
          var loop = true;
          var testChar;
          if (typeof tok === "string") {
            testChar = function (char) {
              return char === tok;
            };
          } else {
            testChar = function (char) {
              return tok.test(char);
            };
          }
          do {
            var nextChar = input.charAt(i);
            if (blockDepth === 0 && testChar(nextChar)) {
              returnVal = input.substr(lastPos, i - lastPos);
              if (returnVal) {
                parseGroups.push(returnVal);
              } else {
                parseGroups.push(" ");
              }
              returnVal = parseGroups;
              skipWhitespace(i - startPos);
              loop = false;
            } else {
              if (inComment) {
                if (nextChar === "*" && input.charAt(i + 1) === "/") {
                  i++;
                  blockDepth--;
                  inComment = false;
                }
                i++;
                continue;
              }
              switch (nextChar) {
                case "\\":
                  i++;
                  nextChar = input.charAt(i);
                  parseGroups.push(input.substr(lastPos, i - lastPos + 1));
                  lastPos = i + 1;
                  break;
                case "/":
                  if (input.charAt(i + 1) === "*") {
                    i++;
                    inComment = true;
                    blockDepth++;
                  }
                  break;
                case "'":
                case '"':
                  quote = parserInput.$quoted(i);
                  if (quote) {
                    parseGroups.push(input.substr(lastPos, i - lastPos), quote);
                    i += quote[1].length - 1;
                    lastPos = i + 1;
                  } else {
                    skipWhitespace(i - startPos);
                    returnVal = nextChar;
                    loop = false;
                  }
                  break;
                case "{":
                  blockStack.push("}");
                  blockDepth++;
                  break;
                case "(":
                  blockStack.push(")");
                  blockDepth++;
                  break;
                case "[":
                  blockStack.push("]");
                  blockDepth++;
                  break;
                case "}":
                case ")":
                case "]": {
                  var expected = blockStack.pop();
                  if (nextChar === expected) {
                    blockDepth--;
                  } else {
                    skipWhitespace(i - startPos);
                    returnVal = expected;
                    loop = false;
                  }
                }
              }
              i++;
              if (i > length) {
                loop = false;
              }
            }
          } while (loop);
          return returnVal ? returnVal : null;
        };
        parserInput.autoCommentAbsorb = true;
        parserInput.commentStore = [];
        parserInput.finished = false;
        parserInput.peek = function (tok) {
          if (typeof tok === "string") {
            for (var i = 0; i < tok.length; i++) {
              if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
                return false;
              }
            }
            return true;
          } else {
            return tok.test(current);
          }
        };
        parserInput.peekChar = function (tok) {
          return input.charAt(parserInput.i) === tok;
        };
        parserInput.currentChar = function () {
          return input.charAt(parserInput.i);
        };
        parserInput.prevChar = function () {
          return input.charAt(parserInput.i - 1);
        };
        parserInput.getInput = function () {
          return input;
        };
        parserInput.peekNotNumeric = function () {
          var c = input.charCodeAt(parserInput.i);
          return (
            c > CHARCODE_9 ||
            c < CHARCODE_PLUS ||
            c === CHARCODE_FORWARD_SLASH ||
            c === CHARCODE_COMMA
          );
        };
        parserInput.start = function (str, chunkInput, failFunction) {
          input = str;
          parserInput.i = j = currentPos = furthest = 0;
          if (chunkInput) {
            chunks = (0, chunker_1.default)(str, failFunction);
          } else {
            chunks = [str];
          }
          current = chunks[0];
          skipWhitespace(0);
        };
        parserInput.end = function () {
          var message;
          var isFinished = parserInput.i >= input.length;
          if (parserInput.i < furthest) {
            message = furthestPossibleErrorMessage;
            parserInput.i = furthest;
          }
          return {
            isFinished,
            furthest: parserInput.i,
            furthestPossibleErrorMessage: message,
            furthestReachedEnd: parserInput.i >= input.length - 1,
            furthestChar: input[parserInput.i],
          };
        };
        return parserInput;
      };
    },
    7613: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      var visitors_1 = tslib_1.__importDefault(__nccwpck_require__(3185));
      var parser_input_1 = tslib_1.__importDefault(__nccwpck_require__(7367));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var function_registry_1 = tslib_1.__importDefault(
        __nccwpck_require__(3247),
      );
      var atrule_syntax_1 = __nccwpck_require__(3875);
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var Parser = function Parser(context, imports, fileInfo, currentIndex) {
        currentIndex = currentIndex || 0;
        var parsers;
        var parserInput = (0, parser_input_1.default)();
        function error(msg, type) {
          throw new less_error_1.default(
            {
              index: parserInput.i,
              filename: fileInfo.filename,
              type: type || "Syntax",
              message: msg,
            },
            imports,
          );
        }
        function warn(msg, index, type) {
          if (!context.quiet) {
            logger_1.default.warn(
              new less_error_1.default(
                {
                  index:
                    index !== null && index !== void 0 ? index : parserInput.i,
                  filename: fileInfo.filename,
                  type: type
                    ? "".concat(type.toUpperCase(), " WARNING")
                    : "WARNING",
                  message: msg,
                },
                imports,
              ).toString(),
            );
          }
        }
        function expect(arg, msg) {
          var result =
            arg instanceof Function ? arg.call(parsers) : parserInput.$re(arg);
          if (result) {
            return result;
          }
          error(
            msg ||
              (typeof arg === "string"
                ? "expected '"
                    .concat(arg, "' got '")
                    .concat(parserInput.currentChar(), "'")
                : "unexpected token"),
          );
        }
        function expectChar(arg, msg) {
          if (parserInput.$char(arg)) {
            return arg;
          }
          error(
            msg ||
              "expected '"
                .concat(arg, "' got '")
                .concat(parserInput.currentChar(), "'"),
          );
        }
        function getDebugInfo(index) {
          var filename = fileInfo.filename;
          return {
            lineNumber:
              utils.getLocation(index, parserInput.getInput()).line + 1,
            fileName: filename,
          };
        }
        function parseNode(str, parseList, callback) {
          var result;
          var returnNodes = [];
          var parser = parserInput;
          try {
            parser.start(str, false, function fail(msg, index) {
              callback({ message: msg, index: index + currentIndex });
            });
            for (var x = 0, p = void 0; (p = parseList[x]); x++) {
              result = parsers[p]();
              returnNodes.push(result || null);
            }
            var endInfo = parser.end();
            if (endInfo.isFinished) {
              callback(null, returnNodes);
            } else {
              callback(true, null);
            }
          } catch (e) {
            throw new less_error_1.default(
              { index: e.index + currentIndex, message: e.message },
              imports,
              fileInfo.filename,
            );
          }
        }
        return {
          parserInput,
          imports,
          fileInfo,
          parseNode,
          parse: function (str, callback, additionalData) {
            var root;
            var err = null;
            var globalVars;
            var modifyVars;
            var ignored;
            var preText = "";
            if (additionalData && additionalData.disablePluginRule) {
              parsers.plugin = function () {
                var dir = parserInput.$re(/^@plugin?\s+/);
                if (dir) {
                  error(
                    "@plugin statements are not allowed when disablePluginRule is set to true",
                  );
                }
              };
            }
            globalVars =
              additionalData && additionalData.globalVars
                ? "".concat(
                    Parser.serializeVars(additionalData.globalVars),
                    "\n",
                  )
                : "";
            modifyVars =
              additionalData && additionalData.modifyVars
                ? "\n".concat(Parser.serializeVars(additionalData.modifyVars))
                : "";
            if (context.pluginManager) {
              var preProcessors = context.pluginManager.getPreProcessors();
              for (var i = 0; i < preProcessors.length; i++) {
                str = preProcessors[i].process(str, {
                  context,
                  imports,
                  fileInfo,
                });
              }
            }
            if (globalVars || (additionalData && additionalData.banner)) {
              preText =
                (additionalData && additionalData.banner
                  ? additionalData.banner
                  : "") + globalVars;
              ignored = imports.contentsIgnoredChars;
              ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0;
              ignored[fileInfo.filename] += preText.length;
            }
            str = str.replace(/\r\n?/g, "\n");
            str = preText + str.replace(/^\uFEFF/, "") + modifyVars;
            imports.contents[fileInfo.filename] = str;
            try {
              parserInput.start(
                str,
                context.chunkInput,
                function fail(msg, index) {
                  throw new less_error_1.default(
                    {
                      index,
                      type: "Parse",
                      message: msg,
                      filename: fileInfo.filename,
                    },
                    imports,
                  );
                },
              );
              tree_1.default.Node.prototype.parse = this;
              root = new tree_1.default.Ruleset(null, this.parsers.primary());
              tree_1.default.Node.prototype.rootNode = root;
              root.root = true;
              root.firstRoot = true;
              root.functionRegistry = function_registry_1.default.inherit();
            } catch (e) {
              return callback(
                new less_error_1.default(e, imports, fileInfo.filename),
              );
            }
            var endInfo = parserInput.end();
            if (!endInfo.isFinished) {
              var message = endInfo.furthestPossibleErrorMessage;
              if (!message) {
                message = "Unrecognised input";
                if (endInfo.furthestChar === "}") {
                  message += ". Possibly missing opening '{'";
                } else if (endInfo.furthestChar === ")") {
                  message += ". Possibly missing opening '('";
                } else if (endInfo.furthestReachedEnd) {
                  message += ". Possibly missing something";
                }
              }
              err = new less_error_1.default(
                {
                  type: "Parse",
                  message,
                  index: endInfo.furthest,
                  filename: fileInfo.filename,
                },
                imports,
              );
            }
            var finish = function (e) {
              e = err || e || imports.error;
              if (e) {
                if (!(e instanceof less_error_1.default)) {
                  e = new less_error_1.default(e, imports, fileInfo.filename);
                }
                return callback(e);
              } else {
                return callback(null, root);
              }
            };
            if (context.processImports !== false) {
              new visitors_1.default.ImportVisitor(imports, finish).run(root);
            } else {
              return finish();
            }
          },
          parsers: (parsers = {
            primary: function () {
              var mixin = this.mixin;
              var root = [];
              var node;
              while (true) {
                while (true) {
                  node = this.comment();
                  if (!node) {
                    break;
                  }
                  root.push(node);
                }
                if (parserInput.finished) {
                  break;
                }
                if (parserInput.peek("}")) {
                  break;
                }
                node = this.extendRule();
                if (node) {
                  root = root.concat(node);
                  continue;
                }
                node =
                  mixin.definition() ||
                  this.declaration() ||
                  mixin.call(false, false) ||
                  this.ruleset() ||
                  this.variableCall() ||
                  this.entities.call() ||
                  this.atrule();
                if (node) {
                  root.push(node);
                } else {
                  var foundSemiColon = false;
                  while (parserInput.$char(";")) {
                    foundSemiColon = true;
                  }
                  if (!foundSemiColon) {
                    break;
                  }
                }
              }
              return root;
            },
            comment: function () {
              if (parserInput.commentStore.length) {
                var comment = parserInput.commentStore.shift();
                return new tree_1.default.Comment(
                  comment.text,
                  comment.isLineComment,
                  comment.index + currentIndex,
                  fileInfo,
                );
              }
            },
            entities: {
              mixinLookup: function () {
                return parsers.mixin.call(true, true);
              },
              quoted: function (forceEscaped) {
                var str;
                var index = parserInput.i;
                var isEscaped = false;
                parserInput.save();
                if (parserInput.$char("~")) {
                  isEscaped = true;
                } else if (forceEscaped) {
                  parserInput.restore();
                  return;
                }
                str = parserInput.$quoted();
                if (!str) {
                  parserInput.restore();
                  return;
                }
                parserInput.forget();
                return new tree_1.default.Quoted(
                  str.charAt(0),
                  str.substr(1, str.length - 2),
                  isEscaped,
                  index + currentIndex,
                  fileInfo,
                );
              },
              keyword: function () {
                var k =
                  parserInput.$char("%") ||
                  parserInput.$re(
                    /^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/,
                  );
                if (k) {
                  return (
                    tree_1.default.Color.fromKeyword(k) ||
                    new tree_1.default.Keyword(k)
                  );
                }
              },
              call: function () {
                var name;
                var args;
                var func;
                var index = parserInput.i;
                if (parserInput.peek(/^url\(/i)) {
                  return;
                }
                parserInput.save();
                name = parserInput.$re(/^([\w-]+|%|~|progid:[\w.]+)\(/);
                if (!name) {
                  parserInput.forget();
                  return;
                }
                name = name[1];
                func = this.customFuncCall(name);
                if (func) {
                  args = func.parse();
                  if (args && func.stop) {
                    parserInput.forget();
                    return args;
                  }
                }
                args = this.arguments(args);
                if (!parserInput.$char(")")) {
                  parserInput.restore(
                    "Could not parse call arguments or missing ')'",
                  );
                  return;
                }
                parserInput.forget();
                return new tree_1.default.Call(
                  name,
                  args,
                  index + currentIndex,
                  fileInfo,
                );
              },
              declarationCall: function () {
                var validCall;
                var args;
                var index = parserInput.i;
                parserInput.save();
                validCall = parserInput.$re(/^[\w]+\(/);
                if (!validCall) {
                  parserInput.forget();
                  return;
                }
                validCall = validCall.substring(0, validCall.length - 1);
                var rule = this.ruleProperty();
                var value;
                if (rule) {
                  value = this.value();
                }
                if (rule && value) {
                  args = [
                    new tree_1.default.Declaration(
                      rule,
                      value,
                      null,
                      null,
                      parserInput.i + currentIndex,
                      fileInfo,
                      true,
                    ),
                  ];
                }
                if (!parserInput.$char(")")) {
                  parserInput.restore(
                    "Could not parse call arguments or missing ')'",
                  );
                  return;
                }
                parserInput.forget();
                return new tree_1.default.Call(
                  validCall,
                  args,
                  index + currentIndex,
                  fileInfo,
                );
              },
              customFuncCall: function (name) {
                return {
                  alpha: f(parsers.ieAlpha, true),
                  boolean: f(condition),
                  if: f(condition),
                }[name.toLowerCase()];
                function f(parse, stop) {
                  return { parse, stop };
                }
                function condition() {
                  return [expect(parsers.condition, "expected condition")];
                }
              },
              arguments: function (prevArgs) {
                var argsComma = prevArgs || [];
                var argsSemiColon = [];
                var isSemiColonSeparated;
                var value;
                parserInput.save();
                while (true) {
                  if (prevArgs) {
                    prevArgs = false;
                  } else {
                    value =
                      parsers.detachedRuleset() ||
                      this.assignment() ||
                      parsers.expression();
                    if (!value) {
                      break;
                    }
                    if (value.value && value.value.length == 1) {
                      value = value.value[0];
                    }
                    argsComma.push(value);
                  }
                  if (parserInput.$char(",")) {
                    continue;
                  }
                  if (parserInput.$char(";") || isSemiColonSeparated) {
                    isSemiColonSeparated = true;
                    value =
                      argsComma.length < 1
                        ? argsComma[0]
                        : new tree_1.default.Value(argsComma);
                    argsSemiColon.push(value);
                    argsComma = [];
                  }
                }
                parserInput.forget();
                return isSemiColonSeparated ? argsSemiColon : argsComma;
              },
              literal: function () {
                return (
                  this.dimension() ||
                  this.color() ||
                  this.quoted() ||
                  this.unicodeDescriptor()
                );
              },
              assignment: function () {
                var key;
                var value;
                parserInput.save();
                key = parserInput.$re(/^\w+(?=\s?=)/i);
                if (!key) {
                  parserInput.restore();
                  return;
                }
                if (!parserInput.$char("=")) {
                  parserInput.restore();
                  return;
                }
                value = parsers.entity();
                if (value) {
                  parserInput.forget();
                  return new tree_1.default.Assignment(key, value);
                } else {
                  parserInput.restore();
                }
              },
              url: function () {
                var value;
                var index = parserInput.i;
                parserInput.autoCommentAbsorb = false;
                if (!parserInput.$str("url(")) {
                  parserInput.autoCommentAbsorb = true;
                  return;
                }
                value =
                  this.quoted() ||
                  this.variable() ||
                  this.property() ||
                  parserInput.$re(/^(?:(?:\\[()'"])|[^()'"])+/) ||
                  "";
                parserInput.autoCommentAbsorb = true;
                expectChar(")");
                return new tree_1.default.URL(
                  value.value !== undefined ||
                  value instanceof tree_1.default.Variable ||
                  value instanceof tree_1.default.Property
                    ? value
                    : new tree_1.default.Anonymous(value, index),
                  index + currentIndex,
                  fileInfo,
                );
              },
              variable: function () {
                var ch;
                var name;
                var index = parserInput.i;
                parserInput.save();
                if (
                  parserInput.currentChar() === "@" &&
                  (name = parserInput.$re(/^@@?[\w-]+/))
                ) {
                  ch = parserInput.currentChar();
                  if (
                    ch === "(" ||
                    (ch === "[" && !parserInput.prevChar().match(/^\s/))
                  ) {
                    var result = parsers.variableCall(name);
                    if (result) {
                      parserInput.forget();
                      return result;
                    }
                  }
                  parserInput.forget();
                  return new tree_1.default.Variable(
                    name,
                    index + currentIndex,
                    fileInfo,
                  );
                }
                parserInput.restore();
              },
              variableCurly: function () {
                var curly;
                var index = parserInput.i;
                if (
                  parserInput.currentChar() === "@" &&
                  (curly = parserInput.$re(/^@\{([\w-]+)\}/))
                ) {
                  return new tree_1.default.Variable(
                    "@".concat(curly[1]),
                    index + currentIndex,
                    fileInfo,
                  );
                }
              },
              property: function () {
                var name;
                var index = parserInput.i;
                if (
                  parserInput.currentChar() === "$" &&
                  (name = parserInput.$re(/^\$[\w-]+/))
                ) {
                  return new tree_1.default.Property(
                    name,
                    index + currentIndex,
                    fileInfo,
                  );
                }
              },
              propertyCurly: function () {
                var curly;
                var index = parserInput.i;
                if (
                  parserInput.currentChar() === "$" &&
                  (curly = parserInput.$re(/^\$\{([\w-]+)\}/))
                ) {
                  return new tree_1.default.Property(
                    "$".concat(curly[1]),
                    index + currentIndex,
                    fileInfo,
                  );
                }
              },
              color: function () {
                var rgb;
                parserInput.save();
                if (
                  parserInput.currentChar() === "#" &&
                  (rgb = parserInput.$re(
                    /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#[])?/,
                  ))
                ) {
                  if (!rgb[2]) {
                    parserInput.forget();
                    return new tree_1.default.Color(rgb[1], undefined, rgb[0]);
                  }
                }
                parserInput.restore();
              },
              colorKeyword: function () {
                parserInput.save();
                var autoCommentAbsorb = parserInput.autoCommentAbsorb;
                parserInput.autoCommentAbsorb = false;
                var k = parserInput.$re(/^[_A-Za-z-][_A-Za-z0-9-]+/);
                parserInput.autoCommentAbsorb = autoCommentAbsorb;
                if (!k) {
                  parserInput.forget();
                  return;
                }
                parserInput.restore();
                var color = tree_1.default.Color.fromKeyword(k);
                if (color) {
                  parserInput.$str(k);
                  return color;
                }
              },
              dimension: function () {
                if (parserInput.peekNotNumeric()) {
                  return;
                }
                var value = parserInput.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i);
                if (value) {
                  return new tree_1.default.Dimension(value[1], value[2]);
                }
              },
              unicodeDescriptor: function () {
                var ud;
                ud = parserInput.$re(/^U\+[0-9a-fA-F?]+(-[0-9a-fA-F?]+)?/);
                if (ud) {
                  return new tree_1.default.UnicodeDescriptor(ud[0]);
                }
              },
              javascript: function () {
                var js;
                var index = parserInput.i;
                parserInput.save();
                var escape = parserInput.$char("~");
                var jsQuote = parserInput.$char("`");
                if (!jsQuote) {
                  parserInput.restore();
                  return;
                }
                js = parserInput.$re(/^[^`]*`/);
                if (js) {
                  parserInput.forget();
                  return new tree_1.default.JavaScript(
                    js.substr(0, js.length - 1),
                    Boolean(escape),
                    index + currentIndex,
                    fileInfo,
                  );
                }
                parserInput.restore("invalid javascript definition");
              },
            },
            variable: function () {
              var name;
              if (
                parserInput.currentChar() === "@" &&
                (name = parserInput.$re(/^(@[\w-]+)\s*:/))
              ) {
                return name[1];
              }
            },
            variableCall: function (parsedName) {
              var lookups;
              var i = parserInput.i;
              var inValue = !!parsedName;
              var name = parsedName;
              parserInput.save();
              if (
                name ||
                (parserInput.currentChar() === "@" &&
                  (name = parserInput.$re(/^(@[\w-]+)(\(\s*\))?/)))
              ) {
                lookups = this.mixin.ruleLookups();
                if (
                  !lookups &&
                  ((inValue && parserInput.$str("()") !== "()") ||
                    name[2] !== "()")
                ) {
                  parserInput.restore(
                    "Missing '[...]' lookup in variable call",
                  );
                  return;
                }
                if (!inValue) {
                  name = name[1];
                }
                var call = new tree_1.default.VariableCall(name, i, fileInfo);
                if (!inValue && parsers.end()) {
                  parserInput.forget();
                  return call;
                } else {
                  parserInput.forget();
                  return new tree_1.default.NamespaceValue(
                    call,
                    lookups,
                    i,
                    fileInfo,
                  );
                }
              }
              parserInput.restore();
            },
            extend: function (isRule) {
              var elements;
              var e;
              var index = parserInput.i;
              var option;
              var extendList;
              var extend;
              if (!parserInput.$str(isRule ? "&:extend(" : ":extend(")) {
                return;
              }
              do {
                option = null;
                elements = null;
                var first = true;
                while (!(option = parserInput.$re(/^(!?all)(?=\s*(\)|,))/))) {
                  e = this.element();
                  if (!e) {
                    break;
                  }
                  if (!first && e.combinator.value) {
                    warn(
                      "Targeting complex selectors can have unexpected behavior, and this behavior may change in the future.",
                      index,
                    );
                  }
                  first = false;
                  if (elements) {
                    elements.push(e);
                  } else {
                    elements = [e];
                  }
                }
                option = option && option[1];
                if (!elements) {
                  error("Missing target selector for :extend().");
                }
                extend = new tree_1.default.Extend(
                  new tree_1.default.Selector(elements),
                  option,
                  index + currentIndex,
                  fileInfo,
                );
                if (extendList) {
                  extendList.push(extend);
                } else {
                  extendList = [extend];
                }
              } while (parserInput.$char(","));
              expect(/^\)/);
              if (isRule) {
                expect(/^;/);
              }
              return extendList;
            },
            extendRule: function () {
              return this.extend(true);
            },
            mixin: {
              call: function (inValue, getLookup) {
                var s = parserInput.currentChar();
                var important = false;
                var lookups;
                var index = parserInput.i;
                var elements;
                var args;
                var hasParens;
                var parensIndex;
                var parensWS = false;
                if (s !== "." && s !== "#") {
                  return;
                }
                parserInput.save();
                elements = this.elements();
                if (elements) {
                  parensIndex = parserInput.i;
                  if (parserInput.$char("(")) {
                    parensWS = parserInput.isWhitespace(-2);
                    args = this.args(true).args;
                    expectChar(")");
                    hasParens = true;
                    if (parensWS) {
                      warn(
                        "Whitespace between a mixin name and parentheses for a mixin call is deprecated",
                        parensIndex,
                        "DEPRECATED",
                      );
                    }
                  }
                  if (getLookup !== false) {
                    lookups = this.ruleLookups();
                  }
                  if (getLookup === true && !lookups) {
                    parserInput.restore();
                    return;
                  }
                  if (inValue && !lookups && !hasParens) {
                    parserInput.restore();
                    return;
                  }
                  if (!inValue && parsers.important()) {
                    important = true;
                  }
                  if (inValue || parsers.end()) {
                    parserInput.forget();
                    var mixin = new tree_1.default.mixin.Call(
                      elements,
                      args,
                      index + currentIndex,
                      fileInfo,
                      !lookups && important,
                    );
                    if (lookups) {
                      return new tree_1.default.NamespaceValue(mixin, lookups);
                    } else {
                      if (!hasParens) {
                        warn(
                          "Calling a mixin without parentheses is deprecated",
                          parensIndex,
                          "DEPRECATED",
                        );
                      }
                      return mixin;
                    }
                  }
                }
                parserInput.restore();
              },
              elements: function () {
                var elements;
                var e;
                var c;
                var elem;
                var elemIndex;
                var re =
                  /^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/;
                while (true) {
                  elemIndex = parserInput.i;
                  e = parserInput.$re(re);
                  if (!e) {
                    break;
                  }
                  elem = new tree_1.default.Element(
                    c,
                    e,
                    false,
                    elemIndex + currentIndex,
                    fileInfo,
                  );
                  if (elements) {
                    elements.push(elem);
                  } else {
                    elements = [elem];
                  }
                  c = parserInput.$char(">");
                }
                return elements;
              },
              args: function (isCall) {
                var entities = parsers.entities;
                var returner = { args: null, variadic: false };
                var expressions = [];
                var argsSemiColon = [];
                var argsComma = [];
                var isSemiColonSeparated;
                var expressionContainsNamed;
                var name;
                var nameLoop;
                var value;
                var arg;
                var expand;
                var hasSep = true;
                parserInput.save();
                while (true) {
                  if (isCall) {
                    arg = parsers.detachedRuleset() || parsers.expression();
                  } else {
                    parserInput.commentStore.length = 0;
                    if (parserInput.$str("...")) {
                      returner.variadic = true;
                      if (parserInput.$char(";") && !isSemiColonSeparated) {
                        isSemiColonSeparated = true;
                      }
                      (isSemiColonSeparated ? argsSemiColon : argsComma).push({
                        variadic: true,
                      });
                      break;
                    }
                    arg =
                      entities.variable() ||
                      entities.property() ||
                      entities.literal() ||
                      entities.keyword() ||
                      this.call(true);
                  }
                  if (!arg || !hasSep) {
                    break;
                  }
                  nameLoop = null;
                  if (arg.throwAwayComments) {
                    arg.throwAwayComments();
                  }
                  value = arg;
                  var val = null;
                  if (isCall) {
                    if (arg.value && arg.value.length == 1) {
                      val = arg.value[0];
                    }
                  } else {
                    val = arg;
                  }
                  if (
                    val &&
                    (val instanceof tree_1.default.Variable ||
                      val instanceof tree_1.default.Property)
                  ) {
                    if (parserInput.$char(":")) {
                      if (expressions.length > 0) {
                        if (isSemiColonSeparated) {
                          error("Cannot mix ; and , as delimiter types");
                        }
                        expressionContainsNamed = true;
                      }
                      value = parsers.detachedRuleset() || parsers.expression();
                      if (!value) {
                        if (isCall) {
                          error(
                            "could not understand value for named argument",
                          );
                        } else {
                          parserInput.restore();
                          returner.args = [];
                          return returner;
                        }
                      }
                      nameLoop = name = val.name;
                    } else if (parserInput.$str("...")) {
                      if (!isCall) {
                        returner.variadic = true;
                        if (parserInput.$char(";") && !isSemiColonSeparated) {
                          isSemiColonSeparated = true;
                        }
                        (isSemiColonSeparated ? argsSemiColon : argsComma).push(
                          { name: arg.name, variadic: true },
                        );
                        break;
                      } else {
                        expand = true;
                      }
                    } else if (!isCall) {
                      name = nameLoop = val.name;
                      value = null;
                    }
                  }
                  if (value) {
                    expressions.push(value);
                  }
                  argsComma.push({ name: nameLoop, value, expand });
                  if (parserInput.$char(",")) {
                    hasSep = true;
                    continue;
                  }
                  hasSep = parserInput.$char(";") === ";";
                  if (hasSep || isSemiColonSeparated) {
                    if (expressionContainsNamed) {
                      error("Cannot mix ; and , as delimiter types");
                    }
                    isSemiColonSeparated = true;
                    if (expressions.length > 1) {
                      value = new tree_1.default.Value(expressions);
                    }
                    argsSemiColon.push({ name, value, expand });
                    name = null;
                    expressions = [];
                    expressionContainsNamed = false;
                  }
                }
                parserInput.forget();
                returner.args = isSemiColonSeparated
                  ? argsSemiColon
                  : argsComma;
                return returner;
              },
              definition: function () {
                var name;
                var params = [];
                var match;
                var ruleset;
                var cond;
                var variadic = false;
                if (
                  (parserInput.currentChar() !== "." &&
                    parserInput.currentChar() !== "#") ||
                  parserInput.peek(/^[^{]*\}/)
                ) {
                  return;
                }
                parserInput.save();
                match = parserInput.$re(
                  /^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(/,
                );
                if (match) {
                  name = match[1];
                  var argInfo = this.args(false);
                  params = argInfo.args;
                  variadic = argInfo.variadic;
                  if (!parserInput.$char(")")) {
                    parserInput.restore("Missing closing ')'");
                    return;
                  }
                  parserInput.commentStore.length = 0;
                  if (parserInput.$str("when")) {
                    cond = expect(parsers.conditions, "expected condition");
                  }
                  ruleset = parsers.block();
                  if (ruleset) {
                    parserInput.forget();
                    return new tree_1.default.mixin.Definition(
                      name,
                      params,
                      ruleset,
                      cond,
                      variadic,
                    );
                  } else {
                    parserInput.restore();
                  }
                } else {
                  parserInput.restore();
                }
              },
              ruleLookups: function () {
                var rule;
                var lookups = [];
                if (parserInput.currentChar() !== "[") {
                  return;
                }
                while (true) {
                  parserInput.save();
                  rule = this.lookupValue();
                  if (!rule && rule !== "") {
                    parserInput.restore();
                    break;
                  }
                  lookups.push(rule);
                  parserInput.forget();
                }
                if (lookups.length > 0) {
                  return lookups;
                }
              },
              lookupValue: function () {
                parserInput.save();
                if (!parserInput.$char("[")) {
                  parserInput.restore();
                  return;
                }
                var name = parserInput.$re(/^(?:[@$]{0,2})[_a-zA-Z0-9-]*/);
                if (!parserInput.$char("]")) {
                  parserInput.restore();
                  return;
                }
                if (name || name === "") {
                  parserInput.forget();
                  return name;
                }
                parserInput.restore();
              },
            },
            entity: function () {
              var entities = this.entities;
              return (
                this.comment() ||
                entities.literal() ||
                entities.variable() ||
                entities.url() ||
                entities.property() ||
                entities.call() ||
                entities.keyword() ||
                this.mixin.call(true) ||
                entities.javascript()
              );
            },
            end: function () {
              return parserInput.$char(";") || parserInput.peek("}");
            },
            ieAlpha: function () {
              var value;
              if (!parserInput.$re(/^opacity=/i)) {
                return;
              }
              value = parserInput.$re(/^\d+/);
              if (!value) {
                value = expect(
                  parsers.entities.variable,
                  "Could not parse alpha",
                );
                value = "@{".concat(value.name.slice(1), "}");
              }
              expectChar(")");
              return new tree_1.default.Quoted(
                "",
                "alpha(opacity=".concat(value, ")"),
              );
            },
            element: function () {
              var e;
              var c;
              var v;
              var index = parserInput.i;
              c = this.combinator();
              e =
                parserInput.$re(/^(?:\d+\.\d+|\d+)%/) ||
                parserInput.$re(
                  /^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/,
                ) ||
                parserInput.$char("*") ||
                parserInput.$char("&") ||
                this.attribute() ||
                parserInput.$re(/^\([^&()@]+\)/) ||
                parserInput.$re(/^[.#:](?=@)/) ||
                this.entities.variableCurly();
              if (!e) {
                parserInput.save();
                if (parserInput.$char("(")) {
                  if ((v = this.selector(false))) {
                    var selectors = [];
                    while (parserInput.$char(",")) {
                      selectors.push(v);
                      selectors.push(new anonymous_1.default(","));
                      v = this.selector(false);
                    }
                    selectors.push(v);
                    if (parserInput.$char(")")) {
                      if (selectors.length > 1) {
                        e = new tree_1.default.Paren(
                          new selector_1.default(selectors),
                        );
                      } else {
                        e = new tree_1.default.Paren(v);
                      }
                      parserInput.forget();
                    } else {
                      parserInput.restore("Missing closing ')'");
                    }
                  } else {
                    parserInput.restore("Missing closing ')'");
                  }
                } else {
                  parserInput.forget();
                }
              }
              if (e) {
                return new tree_1.default.Element(
                  c,
                  e,
                  e instanceof tree_1.default.Variable,
                  index + currentIndex,
                  fileInfo,
                );
              }
            },
            combinator: function () {
              var c = parserInput.currentChar();
              if (c === "/") {
                parserInput.save();
                var slashedCombinator = parserInput.$re(/^\/[a-z]+\//i);
                if (slashedCombinator) {
                  parserInput.forget();
                  return new tree_1.default.Combinator(slashedCombinator);
                }
                parserInput.restore();
              }
              if (
                c === ">" ||
                c === "+" ||
                c === "~" ||
                c === "|" ||
                c === "^"
              ) {
                parserInput.i++;
                if (c === "^" && parserInput.currentChar() === "^") {
                  c = "^^";
                  parserInput.i++;
                }
                while (parserInput.isWhitespace()) {
                  parserInput.i++;
                }
                return new tree_1.default.Combinator(c);
              } else if (parserInput.isWhitespace(-1)) {
                return new tree_1.default.Combinator(" ");
              } else {
                return new tree_1.default.Combinator(null);
              }
            },
            selector: function (isLess) {
              var index = parserInput.i;
              var elements;
              var extendList;
              var c;
              var e;
              var allExtends;
              var when;
              var condition;
              isLess = isLess !== false;
              while (
                (isLess && (extendList = this.extend())) ||
                (isLess && (when = parserInput.$str("when"))) ||
                (e = this.element())
              ) {
                if (when) {
                  condition = expect(this.conditions, "expected condition");
                } else if (condition) {
                  error("CSS guard can only be used at the end of selector");
                } else if (extendList) {
                  if (allExtends) {
                    allExtends = allExtends.concat(extendList);
                  } else {
                    allExtends = extendList;
                  }
                } else {
                  if (allExtends) {
                    error("Extend can only be used at the end of selector");
                  }
                  c = parserInput.currentChar();
                  if (Array.isArray(e)) {
                    e.forEach(function (ele) {
                      return elements.push(ele);
                    });
                  }
                  if (elements) {
                    elements.push(e);
                  } else {
                    elements = [e];
                  }
                  e = null;
                }
                if (
                  c === "{" ||
                  c === "}" ||
                  c === ";" ||
                  c === "," ||
                  c === ")"
                ) {
                  break;
                }
              }
              if (elements) {
                return new tree_1.default.Selector(
                  elements,
                  allExtends,
                  condition,
                  index + currentIndex,
                  fileInfo,
                );
              }
              if (allExtends) {
                error(
                  "Extend must be used to extend a selector, it cannot be used on its own",
                );
              }
            },
            selectors: function () {
              var s;
              var selectors;
              while (true) {
                s = this.selector();
                if (!s) {
                  break;
                }
                if (selectors) {
                  selectors.push(s);
                } else {
                  selectors = [s];
                }
                parserInput.commentStore.length = 0;
                if (s.condition && selectors.length > 1) {
                  error(
                    "Guards are only currently allowed on a single selector.",
                  );
                }
                if (!parserInput.$char(",")) {
                  break;
                }
                if (s.condition) {
                  error(
                    "Guards are only currently allowed on a single selector.",
                  );
                }
                parserInput.commentStore.length = 0;
              }
              return selectors;
            },
            attribute: function () {
              if (!parserInput.$char("[")) {
                return;
              }
              var entities = this.entities;
              var key;
              var val;
              var op;
              var cif;
              if (!(key = entities.variableCurly())) {
                key = expect(/^(?:[_A-Za-z0-9-*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/);
              }
              op = parserInput.$re(/^[|~*$^]?=/);
              if (op) {
                val =
                  entities.quoted() ||
                  parserInput.$re(/^[0-9]+%/) ||
                  parserInput.$re(/^[\w-]+/) ||
                  entities.variableCurly();
                if (val) {
                  cif = parserInput.$re(/^[iIsS]/);
                }
              }
              expectChar("]");
              return new tree_1.default.Attribute(key, op, val, cif);
            },
            block: function () {
              var content;
              if (
                parserInput.$char("{") &&
                (content = this.primary()) &&
                parserInput.$char("}")
              ) {
                return content;
              }
            },
            blockRuleset: function () {
              var block = this.block();
              if (block) {
                block = new tree_1.default.Ruleset(null, block);
              }
              return block;
            },
            detachedRuleset: function () {
              var argInfo;
              var params;
              var variadic;
              parserInput.save();
              if (parserInput.$re(/^[.#]\(/)) {
                argInfo = this.mixin.args(false);
                params = argInfo.args;
                variadic = argInfo.variadic;
                if (!parserInput.$char(")")) {
                  parserInput.restore();
                  return;
                }
              }
              var blockRuleset = this.blockRuleset();
              if (blockRuleset) {
                parserInput.forget();
                if (params) {
                  return new tree_1.default.mixin.Definition(
                    null,
                    params,
                    blockRuleset,
                    null,
                    variadic,
                  );
                }
                return new tree_1.default.DetachedRuleset(blockRuleset);
              }
              parserInput.restore();
            },
            ruleset: function () {
              var selectors;
              var rules;
              var debugInfo;
              parserInput.save();
              if (context.dumpLineNumbers) {
                debugInfo = getDebugInfo(parserInput.i);
              }
              selectors = this.selectors();
              if (selectors && (rules = this.block())) {
                parserInput.forget();
                var ruleset = new tree_1.default.Ruleset(
                  selectors,
                  rules,
                  context.strictImports,
                );
                if (context.dumpLineNumbers) {
                  ruleset.debugInfo = debugInfo;
                }
                return ruleset;
              } else {
                parserInput.restore();
              }
            },
            declaration: function () {
              var name;
              var value;
              var index = parserInput.i;
              var hasDR;
              var c = parserInput.currentChar();
              var important;
              var merge;
              var isVariable;
              if (c === "." || c === "#" || c === "&" || c === ":") {
                return;
              }
              parserInput.save();
              name = this.variable() || this.ruleProperty();
              if (name) {
                isVariable = typeof name === "string";
                if (isVariable) {
                  value = this.detachedRuleset();
                  if (value) {
                    hasDR = true;
                  }
                }
                parserInput.commentStore.length = 0;
                if (!value) {
                  merge = !isVariable && name.length > 1 && name.pop().value;
                  if (name[0].value && name[0].value.slice(0, 2) === "--") {
                    if (parserInput.$char(";")) {
                      value = new anonymous_1.default("");
                    } else {
                      value = this.permissiveValue(/[;}]/, true);
                    }
                  } else {
                    value = this.anonymousValue();
                  }
                  if (value) {
                    parserInput.forget();
                    return new tree_1.default.Declaration(
                      name,
                      value,
                      false,
                      merge,
                      index + currentIndex,
                      fileInfo,
                    );
                  }
                  if (!value) {
                    value = this.value();
                  }
                  if (value) {
                    important = this.important();
                  } else if (isVariable) {
                    value = this.permissiveValue();
                  }
                }
                if (value && (this.end() || hasDR)) {
                  parserInput.forget();
                  return new tree_1.default.Declaration(
                    name,
                    value,
                    important,
                    merge,
                    index + currentIndex,
                    fileInfo,
                  );
                } else {
                  parserInput.restore();
                }
              } else {
                parserInput.restore();
              }
            },
            anonymousValue: function () {
              var index = parserInput.i;
              var match = parserInput.$re(/^([^.#@$+/'"*`(;{}-]*);/);
              if (match) {
                return new tree_1.default.Anonymous(
                  match[1],
                  index + currentIndex,
                );
              }
            },
            permissiveValue: function (untilTokens) {
              var i;
              var e;
              var done;
              var value;
              var tok = untilTokens || ";";
              var index = parserInput.i;
              var result = [];
              function testCurrentChar() {
                var char = parserInput.currentChar();
                if (typeof tok === "string") {
                  return char === tok;
                } else {
                  return tok.test(char);
                }
              }
              if (testCurrentChar()) {
                return;
              }
              value = [];
              do {
                e = this.comment();
                if (e) {
                  value.push(e);
                  continue;
                }
                e = this.entity();
                if (e) {
                  value.push(e);
                }
                if (parserInput.peek(",")) {
                  value.push(new tree_1.default.Anonymous(",", parserInput.i));
                  parserInput.$char(",");
                }
              } while (e);
              done = testCurrentChar();
              if (value.length > 0) {
                value = new tree_1.default.Expression(value);
                if (done) {
                  return value;
                } else {
                  result.push(value);
                }
                if (parserInput.prevChar() === " ") {
                  result.push(new tree_1.default.Anonymous(" ", index));
                }
              }
              parserInput.save();
              value = parserInput.$parseUntil(tok);
              if (value) {
                if (typeof value === "string") {
                  error("Expected '".concat(value, "'"), "Parse");
                }
                if (value.length === 1 && value[0] === " ") {
                  parserInput.forget();
                  return new tree_1.default.Anonymous("", index);
                }
                var item = void 0;
                for (i = 0; i < value.length; i++) {
                  item = value[i];
                  if (Array.isArray(item)) {
                    result.push(
                      new tree_1.default.Quoted(
                        item[0],
                        item[1],
                        true,
                        index,
                        fileInfo,
                      ),
                    );
                  } else {
                    if (i === value.length - 1) {
                      item = item.trim();
                    }
                    var quote = new tree_1.default.Quoted(
                      "'",
                      item,
                      true,
                      index,
                      fileInfo,
                    );
                    var variableRegex = /@([\w-]+)/g;
                    var propRegex = /\$([\w-]+)/g;
                    if (variableRegex.test(item)) {
                      warn(
                        "@[ident] in unknown values will not be evaluated as variables in the future. Use @{[ident]}",
                        index,
                        "DEPRECATED",
                      );
                    }
                    if (propRegex.test(item)) {
                      warn(
                        "$[ident] in unknown values will not be evaluated as property references in the future. Use ${[ident]}",
                        index,
                        "DEPRECATED",
                      );
                    }
                    quote.variableRegex = /@([\w-]+)|@{([\w-]+)}/g;
                    quote.propRegex = /\$([\w-]+)|\${([\w-]+)}/g;
                    result.push(quote);
                  }
                }
                parserInput.forget();
                return new tree_1.default.Expression(result, true);
              }
              parserInput.restore();
            },
            import: function () {
              var path;
              var features;
              var index = parserInput.i;
              var dir = parserInput.$re(/^@import\s+/);
              if (dir) {
                var options = (dir ? this.importOptions() : null) || {};
                if ((path = this.entities.quoted() || this.entities.url())) {
                  features = this.mediaFeatures({});
                  if (!parserInput.$char(";")) {
                    parserInput.i = index;
                    error(
                      "missing semi-colon or unrecognised media features on import",
                    );
                  }
                  features = features && new tree_1.default.Value(features);
                  return new tree_1.default.Import(
                    path,
                    features,
                    options,
                    index + currentIndex,
                    fileInfo,
                  );
                } else {
                  parserInput.i = index;
                  error("malformed import statement");
                }
              }
            },
            importOptions: function () {
              var o;
              var options = {};
              var optionName;
              var value;
              if (!parserInput.$char("(")) {
                return null;
              }
              do {
                o = this.importOption();
                if (o) {
                  optionName = o;
                  value = true;
                  switch (optionName) {
                    case "css":
                      optionName = "less";
                      value = false;
                      break;
                    case "once":
                      optionName = "multiple";
                      value = false;
                      break;
                  }
                  options[optionName] = value;
                  if (!parserInput.$char(",")) {
                    break;
                  }
                }
              } while (o);
              expectChar(")");
              return options;
            },
            importOption: function () {
              var opt = parserInput.$re(
                /^(less|css|multiple|once|inline|reference|optional)/,
              );
              if (opt) {
                return opt[1];
              }
            },
            mediaFeature: function (syntaxOptions) {
              var entities = this.entities;
              var nodes = [];
              var e;
              var p;
              var rangeP;
              parserInput.save();
              do {
                e =
                  entities.declarationCall.bind(this)() ||
                  entities.keyword() ||
                  entities.variable() ||
                  entities.mixinLookup();
                if (e) {
                  nodes.push(e);
                } else if (parserInput.$char("(")) {
                  p = this.property();
                  parserInput.save();
                  if (
                    !p &&
                    syntaxOptions.queryInParens &&
                    parserInput.$re(/^[0-9a-z-]*\s*([<>]=|<=|>=|[<>]|=)/)
                  ) {
                    parserInput.restore();
                    p = this.condition();
                    parserInput.save();
                    rangeP = this.atomicCondition(null, p.rvalue);
                    if (!rangeP) {
                      parserInput.restore();
                    }
                  } else {
                    parserInput.restore();
                    e = this.value();
                  }
                  if (parserInput.$char(")")) {
                    if (p && !e) {
                      nodes.push(
                        new tree_1.default.Paren(
                          new tree_1.default.QueryInParens(
                            p.op,
                            p.lvalue,
                            p.rvalue,
                            rangeP ? rangeP.op : null,
                            rangeP ? rangeP.rvalue : null,
                            p._index,
                          ),
                        ),
                      );
                      e = p;
                    } else if (p && e) {
                      nodes.push(
                        new tree_1.default.Paren(
                          new tree_1.default.Declaration(
                            p,
                            e,
                            null,
                            null,
                            parserInput.i + currentIndex,
                            fileInfo,
                            true,
                          ),
                        ),
                      );
                    } else if (e) {
                      nodes.push(new tree_1.default.Paren(e));
                    } else {
                      error("badly formed media feature definition");
                    }
                  } else {
                    error("Missing closing ')'", "Parse");
                  }
                }
              } while (e);
              parserInput.forget();
              if (nodes.length > 0) {
                return new tree_1.default.Expression(nodes);
              }
            },
            mediaFeatures: function (syntaxOptions) {
              var entities = this.entities;
              var features = [];
              var e;
              do {
                e = this.mediaFeature(syntaxOptions);
                if (e) {
                  features.push(e);
                  if (!parserInput.$char(",")) {
                    break;
                  }
                } else {
                  e = entities.variable() || entities.mixinLookup();
                  if (e) {
                    features.push(e);
                    if (!parserInput.$char(",")) {
                      break;
                    }
                  }
                }
              } while (e);
              return features.length > 0 ? features : null;
            },
            prepareAndGetNestableAtRule: function (
              treeType,
              index,
              debugInfo,
              syntaxOptions,
            ) {
              var features = this.mediaFeatures(syntaxOptions);
              var rules = this.block();
              if (!rules) {
                error(
                  "media definitions require block statements after any features",
                );
              }
              parserInput.forget();
              var atRule = new treeType(
                rules,
                features,
                index + currentIndex,
                fileInfo,
              );
              if (context.dumpLineNumbers) {
                atRule.debugInfo = debugInfo;
              }
              return atRule;
            },
            nestableAtRule: function () {
              var debugInfo;
              var index = parserInput.i;
              if (context.dumpLineNumbers) {
                debugInfo = getDebugInfo(index);
              }
              parserInput.save();
              if (parserInput.$peekChar("@")) {
                if (parserInput.$str("@media")) {
                  return this.prepareAndGetNestableAtRule(
                    tree_1.default.Media,
                    index,
                    debugInfo,
                    atrule_syntax_1.MediaSyntaxOptions,
                  );
                }
                if (parserInput.$str("@container")) {
                  return this.prepareAndGetNestableAtRule(
                    tree_1.default.Container,
                    index,
                    debugInfo,
                    atrule_syntax_1.ContainerSyntaxOptions,
                  );
                }
              }
              parserInput.restore();
            },
            plugin: function () {
              var path;
              var args;
              var options;
              var index = parserInput.i;
              var dir = parserInput.$re(/^@plugin\s+/);
              if (dir) {
                args = this.pluginArgs();
                if (args) {
                  options = { pluginArgs: args, isPlugin: true };
                } else {
                  options = { isPlugin: true };
                }
                if ((path = this.entities.quoted() || this.entities.url())) {
                  if (!parserInput.$char(";")) {
                    parserInput.i = index;
                    error("missing semi-colon on @plugin");
                  }
                  return new tree_1.default.Import(
                    path,
                    null,
                    options,
                    index + currentIndex,
                    fileInfo,
                  );
                } else {
                  parserInput.i = index;
                  error("malformed @plugin statement");
                }
              }
            },
            pluginArgs: function () {
              parserInput.save();
              if (!parserInput.$char("(")) {
                parserInput.restore();
                return null;
              }
              var args = parserInput.$re(/^\s*([^);]+)\)\s*/);
              if (args[1]) {
                parserInput.forget();
                return args[1].trim();
              } else {
                parserInput.restore();
                return null;
              }
            },
            atrule: function () {
              var index = parserInput.i;
              var name;
              var value;
              var rules;
              var nonVendorSpecificName;
              var hasIdentifier;
              var hasExpression;
              var hasUnknown;
              var hasBlock = true;
              var isRooted = true;
              if (parserInput.currentChar() !== "@") {
                return;
              }
              value =
                this["import"]() || this.plugin() || this.nestableAtRule();
              if (value) {
                return value;
              }
              parserInput.save();
              name = parserInput.$re(/^@[a-z-]+/);
              if (!name) {
                return;
              }
              nonVendorSpecificName = name;
              if (name.charAt(1) == "-" && name.indexOf("-", 2) > 0) {
                nonVendorSpecificName = "@".concat(
                  name.slice(name.indexOf("-", 2) + 1),
                );
              }
              switch (nonVendorSpecificName) {
                case "@charset":
                  hasIdentifier = true;
                  hasBlock = false;
                  break;
                case "@namespace":
                  hasExpression = true;
                  hasBlock = false;
                  break;
                case "@keyframes":
                case "@counter-style":
                  hasIdentifier = true;
                  break;
                case "@document":
                case "@supports":
                  hasUnknown = true;
                  isRooted = false;
                  break;
                case "@starting-style":
                  isRooted = false;
                  break;
                default:
                  hasUnknown = true;
                  break;
              }
              parserInput.commentStore.length = 0;
              if (hasIdentifier) {
                value = this.entity();
                if (!value) {
                  error("expected ".concat(name, " identifier"));
                }
              } else if (hasExpression) {
                value = this.expression();
                if (!value) {
                  error("expected ".concat(name, " expression"));
                }
              } else if (hasUnknown) {
                value = this.permissiveValue(/^[{;]/);
                hasBlock = parserInput.currentChar() === "{";
                if (!value) {
                  if (!hasBlock && parserInput.currentChar() !== ";") {
                    error(
                      "".concat(
                        name,
                        " rule is missing block or ending semi-colon",
                      ),
                    );
                  }
                } else if (!value.value) {
                  value = null;
                }
              }
              if (hasBlock) {
                rules = this.blockRuleset();
              }
              if (rules || (!hasBlock && value && parserInput.$char(";"))) {
                parserInput.forget();
                return new tree_1.default.AtRule(
                  name,
                  value,
                  rules,
                  index + currentIndex,
                  fileInfo,
                  context.dumpLineNumbers ? getDebugInfo(index) : null,
                  isRooted,
                );
              }
              parserInput.restore("at-rule options not recognised");
            },
            value: function () {
              var e;
              var expressions = [];
              var index = parserInput.i;
              do {
                e = this.expression();
                if (e) {
                  expressions.push(e);
                  if (!parserInput.$char(",")) {
                    break;
                  }
                }
              } while (e);
              if (expressions.length > 0) {
                return new tree_1.default.Value(
                  expressions,
                  index + currentIndex,
                );
              }
            },
            important: function () {
              if (parserInput.currentChar() === "!") {
                return parserInput.$re(/^! *important/);
              }
            },
            sub: function () {
              var a;
              var e;
              parserInput.save();
              if (parserInput.$char("(")) {
                a = this.addition();
                if (a && parserInput.$char(")")) {
                  parserInput.forget();
                  e = new tree_1.default.Expression([a]);
                  e.parens = true;
                  return e;
                }
                parserInput.restore("Expected ')'");
                return;
              }
              parserInput.restore();
            },
            multiplication: function () {
              var m;
              var a;
              var op;
              var operation;
              var isSpaced;
              m = this.operand();
              if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                  if (parserInput.peek(/^\/[*/]/)) {
                    break;
                  }
                  parserInput.save();
                  op = parserInput.$char("/") || parserInput.$char("*");
                  if (!op) {
                    var index = parserInput.i;
                    op = parserInput.$str("./");
                    if (op) {
                      warn("./ operator is deprecated", index, "DEPRECATED");
                    }
                  }
                  if (!op) {
                    parserInput.forget();
                    break;
                  }
                  a = this.operand();
                  if (!a) {
                    parserInput.restore();
                    break;
                  }
                  parserInput.forget();
                  m.parensInOp = true;
                  a.parensInOp = true;
                  operation = new tree_1.default.Operation(
                    op,
                    [operation || m, a],
                    isSpaced,
                  );
                  isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
              }
            },
            addition: function () {
              var m;
              var a;
              var op;
              var operation;
              var isSpaced;
              m = this.multiplication();
              if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                  op =
                    parserInput.$re(/^[-+]\s+/) ||
                    (!isSpaced &&
                      (parserInput.$char("+") || parserInput.$char("-")));
                  if (!op) {
                    break;
                  }
                  a = this.multiplication();
                  if (!a) {
                    break;
                  }
                  m.parensInOp = true;
                  a.parensInOp = true;
                  operation = new tree_1.default.Operation(
                    op,
                    [operation || m, a],
                    isSpaced,
                  );
                  isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
              }
            },
            conditions: function () {
              var a;
              var b;
              var index = parserInput.i;
              var condition;
              a = this.condition(true);
              if (a) {
                while (true) {
                  if (
                    !parserInput.peek(/^,\s*(not\s*)?\(/) ||
                    !parserInput.$char(",")
                  ) {
                    break;
                  }
                  b = this.condition(true);
                  if (!b) {
                    break;
                  }
                  condition = new tree_1.default.Condition(
                    "or",
                    condition || a,
                    b,
                    index + currentIndex,
                  );
                }
                return condition || a;
              }
            },
            condition: function (needsParens) {
              var result;
              var logical;
              var next;
              function or() {
                return parserInput.$str("or");
              }
              result = this.conditionAnd(needsParens);
              if (!result) {
                return;
              }
              logical = or();
              if (logical) {
                next = this.condition(needsParens);
                if (next) {
                  result = new tree_1.default.Condition(logical, result, next);
                } else {
                  return;
                }
              }
              return result;
            },
            conditionAnd: function (needsParens) {
              var result;
              var logical;
              var next;
              var self = this;
              function insideCondition() {
                var cond =
                  self.negatedCondition(needsParens) ||
                  self.parenthesisCondition(needsParens);
                if (!cond && !needsParens) {
                  return self.atomicCondition(needsParens);
                }
                return cond;
              }
              function and() {
                return parserInput.$str("and");
              }
              result = insideCondition();
              if (!result) {
                return;
              }
              logical = and();
              if (logical) {
                next = this.conditionAnd(needsParens);
                if (next) {
                  result = new tree_1.default.Condition(logical, result, next);
                } else {
                  return;
                }
              }
              return result;
            },
            negatedCondition: function (needsParens) {
              if (parserInput.$str("not")) {
                var result = this.parenthesisCondition(needsParens);
                if (result) {
                  result.negate = !result.negate;
                }
                return result;
              }
            },
            parenthesisCondition: function (needsParens) {
              function tryConditionFollowedByParenthesis(me) {
                var body;
                parserInput.save();
                body = me.condition(needsParens);
                if (!body) {
                  parserInput.restore();
                  return;
                }
                if (!parserInput.$char(")")) {
                  parserInput.restore();
                  return;
                }
                parserInput.forget();
                return body;
              }
              var body;
              parserInput.save();
              if (!parserInput.$str("(")) {
                parserInput.restore();
                return;
              }
              body = tryConditionFollowedByParenthesis(this);
              if (body) {
                parserInput.forget();
                return body;
              }
              body = this.atomicCondition(needsParens);
              if (!body) {
                parserInput.restore();
                return;
              }
              if (!parserInput.$char(")")) {
                parserInput.restore(
                  "expected ')' got '".concat(parserInput.currentChar(), "'"),
                );
                return;
              }
              parserInput.forget();
              return body;
            },
            atomicCondition: function (needsParens, preparsedCond) {
              var entities = this.entities;
              var index = parserInput.i;
              var a;
              var b;
              var c;
              var op;
              var cond = function () {
                return (
                  this.addition() ||
                  entities.keyword() ||
                  entities.quoted() ||
                  entities.mixinLookup()
                );
              }.bind(this);
              if (preparsedCond) {
                a = preparsedCond;
              } else {
                a = cond();
              }
              if (a) {
                if (parserInput.$char(">")) {
                  if (parserInput.$char("=")) {
                    op = ">=";
                  } else {
                    op = ">";
                  }
                } else if (parserInput.$char("<")) {
                  if (parserInput.$char("=")) {
                    op = "<=";
                  } else {
                    op = "<";
                  }
                } else if (parserInput.$char("=")) {
                  if (parserInput.$char(">")) {
                    op = "=>";
                  } else if (parserInput.$char("<")) {
                    op = "=<";
                  } else {
                    op = "=";
                  }
                }
                if (op) {
                  b = cond();
                  if (b) {
                    c = new tree_1.default.Condition(
                      op,
                      a,
                      b,
                      index + currentIndex,
                      false,
                    );
                  } else {
                    error("expected expression");
                  }
                } else if (!preparsedCond) {
                  c = new tree_1.default.Condition(
                    "=",
                    a,
                    new tree_1.default.Keyword("true"),
                    index + currentIndex,
                    false,
                  );
                }
                return c;
              }
            },
            operand: function () {
              var entities = this.entities;
              var negate;
              if (parserInput.peek(/^-[@$(]/)) {
                negate = parserInput.$char("-");
              }
              var o =
                this.sub() ||
                entities.dimension() ||
                entities.color() ||
                entities.variable() ||
                entities.property() ||
                entities.call() ||
                entities.quoted(true) ||
                entities.colorKeyword() ||
                entities.mixinLookup();
              if (negate) {
                o.parensInOp = true;
                o = new tree_1.default.Negative(o);
              }
              return o;
            },
            expression: function () {
              var entities = [];
              var e;
              var delim;
              var index = parserInput.i;
              do {
                e = this.comment();
                if (e && !e.isLineComment) {
                  entities.push(e);
                  continue;
                }
                e = this.addition() || this.entity();
                if (e instanceof tree_1.default.Comment) {
                  e = null;
                }
                if (e) {
                  entities.push(e);
                  if (!parserInput.peek(/^\/[/*]/)) {
                    delim = parserInput.$char("/");
                    if (delim) {
                      entities.push(
                        new tree_1.default.Anonymous(
                          delim,
                          index + currentIndex,
                        ),
                      );
                    }
                  }
                }
              } while (e);
              if (entities.length > 0) {
                return new tree_1.default.Expression(entities);
              }
            },
            property: function () {
              var name = parserInput.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/);
              if (name) {
                return name[1];
              }
            },
            ruleProperty: function () {
              var name = [];
              var index = [];
              var s;
              var k;
              parserInput.save();
              var simpleProperty = parserInput.$re(/^([_a-zA-Z0-9-]+)\s*:/);
              if (simpleProperty) {
                name = [new tree_1.default.Keyword(simpleProperty[1])];
                parserInput.forget();
                return name;
              }
              function match(re) {
                var i = parserInput.i;
                var chunk = parserInput.$re(re);
                if (chunk) {
                  index.push(i);
                  return name.push(chunk[1]);
                }
              }
              match(/^(\*?)/);
              while (true) {
                if (!match(/^((?:[\w-]+)|(?:[@$]\{[\w-]+\}))/)) {
                  break;
                }
              }
              if (name.length > 1 && match(/^((?:\+_|\+)?)\s*:/)) {
                parserInput.forget();
                if (name[0] === "") {
                  name.shift();
                  index.shift();
                }
                for (k = 0; k < name.length; k++) {
                  s = name[k];
                  name[k] =
                    s.charAt(0) !== "@" && s.charAt(0) !== "$"
                      ? new tree_1.default.Keyword(s)
                      : s.charAt(0) === "@"
                        ? new tree_1.default.Variable(
                            "@".concat(s.slice(2, -1)),
                            index[k] + currentIndex,
                            fileInfo,
                          )
                        : new tree_1.default.Property(
                            "$".concat(s.slice(2, -1)),
                            index[k] + currentIndex,
                            fileInfo,
                          );
                }
                return name;
              }
              parserInput.restore();
            },
          }),
        };
      };
      Parser.serializeVars = function (vars) {
        var s = "";
        for (var name_1 in vars) {
          if (Object.hasOwnProperty.call(vars, name_1)) {
            var value = vars[name_1];
            s += ""
              .concat((name_1[0] === "@" ? "" : "@") + name_1, ": ")
              .concat(value)
              .concat(String(value).slice(-1) === ";" ? "" : ";");
          }
        }
        return s;
      };
      exports["default"] = Parser;
    },
    620: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var PluginManager = (function () {
        function PluginManager(less) {
          this.less = less;
          this.visitors = [];
          this.preProcessors = [];
          this.postProcessors = [];
          this.installedPlugins = [];
          this.fileManagers = [];
          this.iterator = -1;
          this.pluginCache = {};
          this.Loader = new less.PluginLoader(less);
        }
        PluginManager.prototype.addPlugins = function (plugins) {
          if (plugins) {
            for (var i = 0; i < plugins.length; i++) {
              this.addPlugin(plugins[i]);
            }
          }
        };
        PluginManager.prototype.addPlugin = function (
          plugin,
          filename,
          functionRegistry,
        ) {
          this.installedPlugins.push(plugin);
          if (filename) {
            this.pluginCache[filename] = plugin;
          }
          if (plugin.install) {
            plugin.install(
              this.less,
              this,
              functionRegistry || this.less.functions.functionRegistry,
            );
          }
        };
        PluginManager.prototype.get = function (filename) {
          return this.pluginCache[filename];
        };
        PluginManager.prototype.addVisitor = function (visitor) {
          this.visitors.push(visitor);
        };
        PluginManager.prototype.addPreProcessor = function (
          preProcessor,
          priority,
        ) {
          var indexToInsertAt;
          for (
            indexToInsertAt = 0;
            indexToInsertAt < this.preProcessors.length;
            indexToInsertAt++
          ) {
            if (this.preProcessors[indexToInsertAt].priority >= priority) {
              break;
            }
          }
          this.preProcessors.splice(indexToInsertAt, 0, {
            preProcessor,
            priority,
          });
        };
        PluginManager.prototype.addPostProcessor = function (
          postProcessor,
          priority,
        ) {
          var indexToInsertAt;
          for (
            indexToInsertAt = 0;
            indexToInsertAt < this.postProcessors.length;
            indexToInsertAt++
          ) {
            if (this.postProcessors[indexToInsertAt].priority >= priority) {
              break;
            }
          }
          this.postProcessors.splice(indexToInsertAt, 0, {
            postProcessor,
            priority,
          });
        };
        PluginManager.prototype.addFileManager = function (manager) {
          this.fileManagers.push(manager);
        };
        PluginManager.prototype.getPreProcessors = function () {
          var preProcessors = [];
          for (var i = 0; i < this.preProcessors.length; i++) {
            preProcessors.push(this.preProcessors[i].preProcessor);
          }
          return preProcessors;
        };
        PluginManager.prototype.getPostProcessors = function () {
          var postProcessors = [];
          for (var i = 0; i < this.postProcessors.length; i++) {
            postProcessors.push(this.postProcessors[i].postProcessor);
          }
          return postProcessors;
        };
        PluginManager.prototype.getVisitors = function () {
          return this.visitors;
        };
        PluginManager.prototype.visitor = function () {
          var self = this;
          return {
            first: function () {
              self.iterator = -1;
              return self.visitors[self.iterator];
            },
            get: function () {
              self.iterator += 1;
              return self.visitors[self.iterator];
            },
          };
        };
        PluginManager.prototype.getFileManagers = function () {
          return this.fileManagers;
        };
        return PluginManager;
      })();
      var pm;
      var PluginManagerFactory = function (less, newFactory) {
        if (newFactory || !pm) {
          pm = new PluginManager(less);
        }
        return pm;
      };
      exports["default"] = PluginManagerFactory;
    },
    1881: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      function default_1(environment, ParseTree) {
        var render = function (input, options, callback) {
          if (typeof options === "function") {
            callback = options;
            options = utils.copyOptions(this.options, {});
          } else {
            options = utils.copyOptions(this.options, options || {});
          }
          if (!callback) {
            var self_1 = this;
            return new Promise(function (resolve, reject) {
              render.call(self_1, input, options, function (err, output) {
                if (err) {
                  reject(err);
                } else {
                  resolve(output);
                }
              });
            });
          } else {
            this.parse(input, options, function (err, root, imports, options) {
              if (err) {
                return callback(err);
              }
              var result;
              try {
                var parseTree = new ParseTree(root, imports);
                result = parseTree.toCSS(options);
              } catch (err) {
                return callback(err);
              }
              callback(null, result);
            });
          }
        };
        return render;
      }
      exports["default"] = default_1;
    },
    2785: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function default_1(SourceMapOutput, environment) {
        var SourceMapBuilder = (function () {
          function SourceMapBuilder(options) {
            this.options = options;
          }
          SourceMapBuilder.prototype.toCSS = function (
            rootNode,
            options,
            imports,
          ) {
            var sourceMapOutput = new SourceMapOutput({
              contentsIgnoredCharsMap: imports.contentsIgnoredChars,
              rootNode,
              contentsMap: imports.contents,
              sourceMapFilename: this.options.sourceMapFilename,
              sourceMapURL: this.options.sourceMapURL,
              outputFilename: this.options.sourceMapOutputFilename,
              sourceMapBasepath: this.options.sourceMapBasepath,
              sourceMapRootpath: this.options.sourceMapRootpath,
              outputSourceFiles: this.options.outputSourceFiles,
              sourceMapGenerator: this.options.sourceMapGenerator,
              sourceMapFileInline: this.options.sourceMapFileInline,
              disableSourcemapAnnotation:
                this.options.disableSourcemapAnnotation,
            });
            var css = sourceMapOutput.toCSS(options);
            this.sourceMap = sourceMapOutput.sourceMap;
            this.sourceMapURL = sourceMapOutput.sourceMapURL;
            if (this.options.sourceMapInputFilename) {
              this.sourceMapInputFilename = sourceMapOutput.normalizeFilename(
                this.options.sourceMapInputFilename,
              );
            }
            if (
              this.options.sourceMapBasepath !== undefined &&
              this.sourceMapURL !== undefined
            ) {
              this.sourceMapURL = sourceMapOutput.removeBasepath(
                this.sourceMapURL,
              );
            }
            return css + this.getCSSAppendage();
          };
          SourceMapBuilder.prototype.getCSSAppendage = function () {
            var sourceMapURL = this.sourceMapURL;
            if (this.options.sourceMapFileInline) {
              if (this.sourceMap === undefined) {
                return "";
              }
              sourceMapURL = "data:application/json;base64,".concat(
                environment.encodeBase64(this.sourceMap),
              );
            }
            if (this.options.disableSourcemapAnnotation) {
              return "";
            }
            if (sourceMapURL) {
              return "/*# sourceMappingURL=".concat(sourceMapURL, " */");
            }
            return "";
          };
          SourceMapBuilder.prototype.getExternalSourceMap = function () {
            return this.sourceMap;
          };
          SourceMapBuilder.prototype.setExternalSourceMap = function (
            sourceMap,
          ) {
            this.sourceMap = sourceMap;
          };
          SourceMapBuilder.prototype.isInline = function () {
            return this.options.sourceMapFileInline;
          };
          SourceMapBuilder.prototype.getSourceMapURL = function () {
            return this.sourceMapURL;
          };
          SourceMapBuilder.prototype.getOutputFilename = function () {
            return this.options.sourceMapOutputFilename;
          };
          SourceMapBuilder.prototype.getInputFilename = function () {
            return this.sourceMapInputFilename;
          };
          return SourceMapBuilder;
        })();
        return SourceMapBuilder;
      }
      exports["default"] = default_1;
    },
    8421: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function default_1(environment) {
        var SourceMapOutput = (function () {
          function SourceMapOutput(options) {
            this._css = [];
            this._rootNode = options.rootNode;
            this._contentsMap = options.contentsMap;
            this._contentsIgnoredCharsMap = options.contentsIgnoredCharsMap;
            if (options.sourceMapFilename) {
              this._sourceMapFilename = options.sourceMapFilename.replace(
                /\\/g,
                "/",
              );
            }
            this._outputFilename = options.outputFilename;
            this.sourceMapURL = options.sourceMapURL;
            if (options.sourceMapBasepath) {
              this._sourceMapBasepath = options.sourceMapBasepath.replace(
                /\\/g,
                "/",
              );
            }
            if (options.sourceMapRootpath) {
              this._sourceMapRootpath = options.sourceMapRootpath.replace(
                /\\/g,
                "/",
              );
              if (
                this._sourceMapRootpath.charAt(
                  this._sourceMapRootpath.length - 1,
                ) !== "/"
              ) {
                this._sourceMapRootpath += "/";
              }
            } else {
              this._sourceMapRootpath = "";
            }
            this._outputSourceFiles = options.outputSourceFiles;
            this._sourceMapGeneratorConstructor =
              environment.getSourceMapGenerator();
            this._lineNumber = 0;
            this._column = 0;
          }
          SourceMapOutput.prototype.removeBasepath = function (path) {
            if (
              this._sourceMapBasepath &&
              path.indexOf(this._sourceMapBasepath) === 0
            ) {
              path = path.substring(this._sourceMapBasepath.length);
              if (path.charAt(0) === "\\" || path.charAt(0) === "/") {
                path = path.substring(1);
              }
            }
            return path;
          };
          SourceMapOutput.prototype.normalizeFilename = function (filename) {
            filename = filename.replace(/\\/g, "/");
            filename = this.removeBasepath(filename);
            return (this._sourceMapRootpath || "") + filename;
          };
          SourceMapOutput.prototype.add = function (
            chunk,
            fileInfo,
            index,
            mapLines,
          ) {
            if (!chunk) {
              return;
            }
            var lines, sourceLines, columns, sourceColumns, i;
            if (fileInfo && fileInfo.filename) {
              var inputSource = this._contentsMap[fileInfo.filename];
              if (this._contentsIgnoredCharsMap[fileInfo.filename]) {
                index -= this._contentsIgnoredCharsMap[fileInfo.filename];
                if (index < 0) {
                  index = 0;
                }
                inputSource = inputSource.slice(
                  this._contentsIgnoredCharsMap[fileInfo.filename],
                );
              }
              if (inputSource === undefined) {
                this._css.push(chunk);
                return;
              }
              inputSource = inputSource.substring(0, index);
              sourceLines = inputSource.split("\n");
              sourceColumns = sourceLines[sourceLines.length - 1];
            }
            lines = chunk.split("\n");
            columns = lines[lines.length - 1];
            if (fileInfo && fileInfo.filename) {
              if (!mapLines) {
                this._sourceMapGenerator.addMapping({
                  generated: {
                    line: this._lineNumber + 1,
                    column: this._column,
                  },
                  original: {
                    line: sourceLines.length,
                    column: sourceColumns.length,
                  },
                  source: this.normalizeFilename(fileInfo.filename),
                });
              } else {
                for (i = 0; i < lines.length; i++) {
                  this._sourceMapGenerator.addMapping({
                    generated: {
                      line: this._lineNumber + i + 1,
                      column: i === 0 ? this._column : 0,
                    },
                    original: {
                      line: sourceLines.length + i,
                      column: i === 0 ? sourceColumns.length : 0,
                    },
                    source: this.normalizeFilename(fileInfo.filename),
                  });
                }
              }
            }
            if (lines.length === 1) {
              this._column += columns.length;
            } else {
              this._lineNumber += lines.length - 1;
              this._column = columns.length;
            }
            this._css.push(chunk);
          };
          SourceMapOutput.prototype.isEmpty = function () {
            return this._css.length === 0;
          };
          SourceMapOutput.prototype.toCSS = function (context) {
            this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({
              file: this._outputFilename,
              sourceRoot: null,
            });
            if (this._outputSourceFiles) {
              for (var filename in this._contentsMap) {
                if (this._contentsMap.hasOwnProperty(filename)) {
                  var source = this._contentsMap[filename];
                  if (this._contentsIgnoredCharsMap[filename]) {
                    source = source.slice(
                      this._contentsIgnoredCharsMap[filename],
                    );
                  }
                  this._sourceMapGenerator.setSourceContent(
                    this.normalizeFilename(filename),
                    source,
                  );
                }
              }
            }
            this._rootNode.genCSS(context, this);
            if (this._css.length > 0) {
              var sourceMapURL = void 0;
              var sourceMapContent = JSON.stringify(
                this._sourceMapGenerator.toJSON(),
              );
              if (this.sourceMapURL) {
                sourceMapURL = this.sourceMapURL;
              } else if (this._sourceMapFilename) {
                sourceMapURL = this._sourceMapFilename;
              }
              this.sourceMapURL = sourceMapURL;
              this.sourceMap = sourceMapContent;
            }
            return this._css.join("");
          };
          return SourceMapOutput;
        })();
        return SourceMapOutput;
      }
      exports["default"] = default_1;
    },
    8054: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var visitors_1 = tslib_1.__importDefault(__nccwpck_require__(3185));
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      function default_1(root, options) {
        options = options || {};
        var evaldRoot;
        var variables = options.variables;
        var evalEnv = new contexts_1.default.Eval(options);
        if (typeof variables === "object" && !Array.isArray(variables)) {
          variables = Object.keys(variables).map(function (k) {
            var value = variables[k];
            if (!(value instanceof tree_1.default.Value)) {
              if (!(value instanceof tree_1.default.Expression)) {
                value = new tree_1.default.Expression([value]);
              }
              value = new tree_1.default.Value([value]);
            }
            return new tree_1.default.Declaration(
              "@".concat(k),
              value,
              false,
              null,
              0,
            );
          });
          evalEnv.frames = [new tree_1.default.Ruleset(null, variables)];
        }
        var visitors = [
          new visitors_1.default.JoinSelectorVisitor(),
          new visitors_1.default.MarkVisibleSelectorsVisitor(true),
          new visitors_1.default.ExtendVisitor(),
          new visitors_1.default.ToCSSVisitor({
            compress: Boolean(options.compress),
          }),
        ];
        var preEvalVisitors = [];
        var v;
        var visitorIterator;
        if (options.pluginManager) {
          visitorIterator = options.pluginManager.visitor();
          for (var i = 0; i < 2; i++) {
            visitorIterator.first();
            while ((v = visitorIterator.get())) {
              if (v.isPreEvalVisitor) {
                if (i === 0 || preEvalVisitors.indexOf(v) === -1) {
                  preEvalVisitors.push(v);
                  v.run(root);
                }
              } else {
                if (i === 0 || visitors.indexOf(v) === -1) {
                  if (v.isPreVisitor) {
                    visitors.unshift(v);
                  } else {
                    visitors.push(v);
                  }
                }
              }
            }
          }
        }
        evaldRoot = root.eval(evalEnv);
        for (var i = 0; i < visitors.length; i++) {
          visitors[i].run(evaldRoot);
        }
        if (options.pluginManager) {
          visitorIterator.first();
          while ((v = visitorIterator.get())) {
            if (
              visitors.indexOf(v) === -1 &&
              preEvalVisitors.indexOf(v) === -1
            ) {
              v.run(evaldRoot);
            }
          }
        }
        return evaldRoot;
      }
      exports["default"] = default_1;
    },
    5571: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Anonymous = function (
        value,
        index,
        currentFileInfo,
        mapLines,
        rulesetLike,
        visibilityInfo,
      ) {
        this.value = value;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.mapLines = mapLines;
        this.rulesetLike =
          typeof rulesetLike === "undefined" ? false : rulesetLike;
        this.allowRoot = true;
        this.copyVisibilityInfo(visibilityInfo);
      };
      Anonymous.prototype = Object.assign(new node_1.default(), {
        type: "Anonymous",
        eval: function () {
          return new Anonymous(
            this.value,
            this._index,
            this._fileInfo,
            this.mapLines,
            this.rulesetLike,
            this.visibilityInfo(),
          );
        },
        compare: function (other) {
          return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
        },
        isRulesetLike: function () {
          return this.rulesetLike;
        },
        genCSS: function (context, output) {
          this.nodeVisible = Boolean(this.value);
          if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.mapLines);
          }
        },
      });
      exports["default"] = Anonymous;
    },
    2685: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Assignment = function (key, val) {
        this.key = key;
        this.value = val;
      };
      Assignment.prototype = Object.assign(new node_1.default(), {
        type: "Assignment",
        accept: function (visitor) {
          this.value = visitor.visit(this.value);
        },
        eval: function (context) {
          if (this.value.eval) {
            return new Assignment(this.key, this.value.eval(context));
          }
          return this;
        },
        genCSS: function (context, output) {
          output.add("".concat(this.key, "="));
          if (this.value.genCSS) {
            this.value.genCSS(context, output);
          } else {
            output.add(this.value);
          }
        },
      });
      exports["default"] = Assignment;
    },
    3875: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ContainerSyntaxOptions = exports.MediaSyntaxOptions = void 0;
      exports.MediaSyntaxOptions = { queryInParens: true };
      exports.ContainerSyntaxOptions = { queryInParens: true };
    },
    7999: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var nested_at_rule_1 = tslib_1.__importDefault(__nccwpck_require__(8096));
      var AtRule = function (
        name,
        value,
        rules,
        index,
        currentFileInfo,
        debugInfo,
        isRooted,
        visibilityInfo,
      ) {
        var _this = this;
        var i;
        var selectors = new selector_1.default(
          [],
          null,
          null,
          this._index,
          this._fileInfo,
        ).createEmptySelectors();
        this.name = name;
        this.value =
          value instanceof node_1.default
            ? value
            : value
              ? new anonymous_1.default(value)
              : value;
        if (rules) {
          if (Array.isArray(rules)) {
            var allDeclarations = this.declarationsBlock(rules);
            var allRulesetDeclarations_1 = true;
            rules.forEach(function (rule) {
              if (rule.type === "Ruleset" && rule.rules)
                allRulesetDeclarations_1 =
                  allRulesetDeclarations_1 &&
                  _this.declarationsBlock(rule.rules, true);
            });
            if (allDeclarations && !isRooted) {
              this.simpleBlock = true;
              this.declarations = rules;
            } else if (
              allRulesetDeclarations_1 &&
              rules.length === 1 &&
              !isRooted &&
              !value
            ) {
              this.simpleBlock = true;
              this.declarations = rules[0].rules ? rules[0].rules : rules;
            } else {
              this.rules = rules;
            }
          } else {
            var allDeclarations = this.declarationsBlock(rules.rules);
            if (allDeclarations && !isRooted && !value) {
              this.simpleBlock = true;
              this.declarations = rules.rules;
            } else {
              this.rules = [rules];
              this.rules[0].selectors = new selector_1.default(
                [],
                null,
                null,
                index,
                currentFileInfo,
              ).createEmptySelectors();
            }
          }
          if (!this.simpleBlock) {
            for (i = 0; i < this.rules.length; i++) {
              this.rules[i].allowImports = true;
            }
          }
          this.setParent(selectors, this);
          this.setParent(this.rules, this);
        }
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.debugInfo = debugInfo;
        this.isRooted = isRooted || false;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
      };
      AtRule.prototype = Object.assign(
        new node_1.default(),
        tslib_1.__assign(
          tslib_1.__assign({ type: "AtRule" }, nested_at_rule_1.default),
          {
            declarationsBlock: function (rules, mergeable) {
              if (mergeable === void 0) {
                mergeable = false;
              }
              if (!mergeable) {
                return (
                  rules.filter(function (node) {
                    return (
                      (node.type === "Declaration" ||
                        node.type === "Comment") &&
                      !node.merge
                    );
                  }).length === rules.length
                );
              } else {
                return (
                  rules.filter(function (node) {
                    return (
                      node.type === "Declaration" || node.type === "Comment"
                    );
                  }).length === rules.length
                );
              }
            },
            accept: function (visitor) {
              var value = this.value,
                rules = this.rules,
                declarations = this.declarations;
              if (rules) {
                this.rules = visitor.visitArray(rules);
              } else if (declarations) {
                this.declarations = visitor.visitArray(declarations);
              }
              if (value) {
                this.value = visitor.visit(value);
              }
            },
            isRulesetLike: function () {
              return this.rules || !this.isCharset();
            },
            isCharset: function () {
              return "@charset" === this.name;
            },
            genCSS: function (context, output) {
              var value = this.value,
                rules = this.rules || this.declarations;
              output.add(this.name, this.fileInfo(), this.getIndex());
              if (value) {
                output.add(" ");
                value.genCSS(context, output);
              }
              if (this.simpleBlock) {
                this.outputRuleset(context, output, this.declarations);
              } else if (rules) {
                this.outputRuleset(context, output, rules);
              } else {
                output.add(";");
              }
            },
            eval: function (context) {
              var mediaPathBackup,
                mediaBlocksBackup,
                value = this.value,
                rules = this.rules || this.declarations;
              mediaPathBackup = context.mediaPath;
              mediaBlocksBackup = context.mediaBlocks;
              context.mediaPath = [];
              context.mediaBlocks = [];
              if (value) {
                value = value.eval(context);
              }
              if (rules) {
                rules = this.evalRoot(context, rules);
              }
              if (
                Array.isArray(rules) &&
                rules[0].rules &&
                Array.isArray(rules[0].rules) &&
                rules[0].rules.length
              ) {
                var allMergeableDeclarations = this.declarationsBlock(
                  rules[0].rules,
                  true,
                );
                if (allMergeableDeclarations && !this.isRooted && !value) {
                  var mergeRules =
                    context.pluginManager.less.visitors.ToCSSVisitor.prototype
                      ._mergeRules;
                  mergeRules(rules[0].rules);
                  rules = rules[0].rules;
                  rules.forEach(function (rule) {
                    return (rule.merge = false);
                  });
                }
              }
              if (this.simpleBlock && rules) {
                rules[0].functionRegistry =
                  context.frames[0].functionRegistry.inherit();
                rules = rules.map(function (rule) {
                  return rule.eval(context);
                });
              }
              context.mediaPath = mediaPathBackup;
              context.mediaBlocks = mediaBlocksBackup;
              return new AtRule(
                this.name,
                value,
                rules,
                this.getIndex(),
                this.fileInfo(),
                this.debugInfo,
                this.isRooted,
                this.visibilityInfo(),
              );
            },
            evalRoot: function (context, rules) {
              var ampersandCount = 0;
              var noAmpersandCount = 0;
              var noAmpersands = true;
              var allAmpersands = false;
              if (!this.simpleBlock) {
                rules = [rules[0].eval(context)];
              }
              var precedingSelectors = [];
              if (context.frames.length > 0) {
                var _loop_1 = function (index) {
                  var frame = context.frames[index];
                  if (
                    frame.type === "Ruleset" &&
                    frame.rules &&
                    frame.rules.length > 0
                  ) {
                    if (
                      frame &&
                      !frame.root &&
                      frame.selectors &&
                      frame.selectors.length > 0
                    ) {
                      precedingSelectors = precedingSelectors.concat(
                        frame.selectors,
                      );
                    }
                  }
                  if (precedingSelectors.length > 0) {
                    var value_1 = "";
                    var output = {
                      add: function (s) {
                        value_1 += s;
                      },
                    };
                    for (var i = 0; i < precedingSelectors.length; i++) {
                      precedingSelectors[i].genCSS(context, output);
                    }
                    if (/^&+$/.test(value_1.replace(/\s+/g, ""))) {
                      noAmpersands = false;
                      noAmpersandCount++;
                    } else {
                      allAmpersands = false;
                      ampersandCount++;
                    }
                  }
                };
                for (var index = 0; index < context.frames.length; index++) {
                  _loop_1(index);
                }
              }
              var mixedAmpersands =
                ampersandCount > 0 &&
                noAmpersandCount > 0 &&
                !allAmpersands &&
                !noAmpersands;
              if (
                (this.isRooted &&
                  ampersandCount > 0 &&
                  noAmpersandCount === 0 &&
                  !allAmpersands &&
                  noAmpersands) ||
                !mixedAmpersands
              ) {
                rules[0].root = true;
              }
              return rules;
            },
            variable: function (name) {
              if (this.rules) {
                return ruleset_1.default.prototype.variable.call(
                  this.rules[0],
                  name,
                );
              }
            },
            find: function () {
              if (this.rules) {
                return ruleset_1.default.prototype.find.apply(
                  this.rules[0],
                  arguments,
                );
              }
            },
            rulesets: function () {
              if (this.rules) {
                return ruleset_1.default.prototype.rulesets.apply(
                  this.rules[0],
                );
              }
            },
            outputRuleset: function (context, output, rules) {
              var ruleCnt = rules.length;
              var i;
              context.tabLevel = (context.tabLevel | 0) + 1;
              if (context.compress) {
                output.add("{");
                for (i = 0; i < ruleCnt; i++) {
                  rules[i].genCSS(context, output);
                }
                output.add("}");
                context.tabLevel--;
                return;
              }
              var tabSetStr = "\n".concat(Array(context.tabLevel).join("  ")),
                tabRuleStr = "".concat(tabSetStr, "  ");
              if (!ruleCnt) {
                output.add(" {".concat(tabSetStr, "}"));
              } else {
                output.add(" {".concat(tabRuleStr));
                rules[0].genCSS(context, output);
                for (i = 1; i < ruleCnt; i++) {
                  output.add(tabRuleStr);
                  rules[i].genCSS(context, output);
                }
                output.add("".concat(tabSetStr, "}"));
              }
              context.tabLevel--;
            },
          },
        ),
      );
      exports["default"] = AtRule;
    },
    6194: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Attribute = function (key, op, value, cif) {
        this.key = key;
        this.op = op;
        this.value = value;
        this.cif = cif;
      };
      Attribute.prototype = Object.assign(new node_1.default(), {
        type: "Attribute",
        eval: function (context) {
          return new Attribute(
            this.key.eval ? this.key.eval(context) : this.key,
            this.op,
            this.value && this.value.eval
              ? this.value.eval(context)
              : this.value,
            this.cif,
          );
        },
        genCSS: function (context, output) {
          output.add(this.toCSS(context));
        },
        toCSS: function (context) {
          var value = this.key.toCSS ? this.key.toCSS(context) : this.key;
          if (this.op) {
            value += this.op;
            value += this.value.toCSS ? this.value.toCSS(context) : this.value;
          }
          if (this.cif) {
            value = value + " " + this.cif;
          }
          return "[".concat(value, "]");
        },
      });
      exports["default"] = Attribute;
    },
    3256: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var function_caller_1 = tslib_1.__importDefault(
        __nccwpck_require__(8403),
      );
      var Call = function (name, args, index, currentFileInfo) {
        this.name = name;
        this.args = args;
        this.calc = name === "calc";
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Call.prototype = Object.assign(new node_1.default(), {
        type: "Call",
        accept: function (visitor) {
          if (this.args) {
            this.args = visitor.visitArray(this.args);
          }
        },
        eval: function (context) {
          var _this = this;
          var currentMathContext = context.mathOn;
          context.mathOn = !this.calc;
          if (this.calc || context.inCalc) {
            context.enterCalc();
          }
          var exitCalc = function () {
            if (_this.calc || context.inCalc) {
              context.exitCalc();
            }
            context.mathOn = currentMathContext;
          };
          var result;
          var funcCaller = new function_caller_1.default(
            this.name,
            context,
            this.getIndex(),
            this.fileInfo(),
          );
          if (funcCaller.isValid()) {
            try {
              result = funcCaller.call(this.args);
              exitCalc();
            } catch (e) {
              if (e.hasOwnProperty("line") && e.hasOwnProperty("column")) {
                throw e;
              }
              throw {
                type: e.type || "Runtime",
                message: "Error evaluating function `"
                  .concat(this.name, "`")
                  .concat(e.message ? ": ".concat(e.message) : ""),
                index: this.getIndex(),
                filename: this.fileInfo().filename,
                line: e.lineNumber,
                column: e.columnNumber,
              };
            }
          }
          if (result !== null && result !== undefined) {
            if (!(result instanceof node_1.default)) {
              if (!result || result === true) {
                result = new anonymous_1.default(null);
              } else {
                result = new anonymous_1.default(result.toString());
              }
            }
            result._index = this._index;
            result._fileInfo = this._fileInfo;
            return result;
          }
          var args = this.args.map(function (a) {
            return a.eval(context);
          });
          exitCalc();
          return new Call(this.name, args, this.getIndex(), this.fileInfo());
        },
        genCSS: function (context, output) {
          output.add(
            "".concat(this.name, "("),
            this.fileInfo(),
            this.getIndex(),
          );
          for (var i = 0; i < this.args.length; i++) {
            this.args[i].genCSS(context, output);
            if (i + 1 < this.args.length) {
              output.add(", ");
            }
          }
          output.add(")");
        },
      });
      exports["default"] = Call;
    },
    6325: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var colors_1 = tslib_1.__importDefault(__nccwpck_require__(8236));
      var Color = function (rgb, a, originalForm) {
        var self = this;
        if (Array.isArray(rgb)) {
          this.rgb = rgb;
        } else if (rgb.length >= 6) {
          this.rgb = [];
          rgb.match(/.{2}/g).map(function (c, i) {
            if (i < 3) {
              self.rgb.push(parseInt(c, 16));
            } else {
              self.alpha = parseInt(c, 16) / 255;
            }
          });
        } else {
          this.rgb = [];
          rgb.split("").map(function (c, i) {
            if (i < 3) {
              self.rgb.push(parseInt(c + c, 16));
            } else {
              self.alpha = parseInt(c + c, 16) / 255;
            }
          });
        }
        this.alpha = this.alpha || (typeof a === "number" ? a : 1);
        if (typeof originalForm !== "undefined") {
          this.value = originalForm;
        }
      };
      Color.prototype = Object.assign(new node_1.default(), {
        type: "Color",
        luma: function () {
          var r = this.rgb[0] / 255,
            g = this.rgb[1] / 255,
            b = this.rgb[2] / 255;
          r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
          g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
          b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        },
        genCSS: function (context, output) {
          output.add(this.toCSS(context));
        },
        toCSS: function (context, doNotCompress) {
          var compress = context && context.compress && !doNotCompress;
          var color;
          var alpha;
          var colorFunction;
          var args = [];
          alpha = this.fround(context, this.alpha);
          if (this.value) {
            if (this.value.indexOf("rgb") === 0) {
              if (alpha < 1) {
                colorFunction = "rgba";
              }
            } else if (this.value.indexOf("hsl") === 0) {
              if (alpha < 1) {
                colorFunction = "hsla";
              } else {
                colorFunction = "hsl";
              }
            } else {
              return this.value;
            }
          } else {
            if (alpha < 1) {
              colorFunction = "rgba";
            }
          }
          switch (colorFunction) {
            case "rgba":
              args = this.rgb
                .map(function (c) {
                  return clamp(Math.round(c), 255);
                })
                .concat(clamp(alpha, 1));
              break;
            case "hsla":
              args.push(clamp(alpha, 1));
            case "hsl":
              color = this.toHSL();
              args = [
                this.fround(context, color.h),
                "".concat(this.fround(context, color.s * 100), "%"),
                "".concat(this.fround(context, color.l * 100), "%"),
              ].concat(args);
          }
          if (colorFunction) {
            return ""
              .concat(colorFunction, "(")
              .concat(args.join(",".concat(compress ? "" : " ")), ")");
          }
          color = this.toRGB();
          if (compress) {
            var splitcolor = color.split("");
            if (
              splitcolor[1] === splitcolor[2] &&
              splitcolor[3] === splitcolor[4] &&
              splitcolor[5] === splitcolor[6]
            ) {
              color = "#"
                .concat(splitcolor[1])
                .concat(splitcolor[3])
                .concat(splitcolor[5]);
            }
          }
          return color;
        },
        operate: function (context, op, other) {
          var rgb = new Array(3);
          var alpha = this.alpha * (1 - other.alpha) + other.alpha;
          for (var c = 0; c < 3; c++) {
            rgb[c] = this._operate(context, op, this.rgb[c], other.rgb[c]);
          }
          return new Color(rgb, alpha);
        },
        toRGB: function () {
          return toHex(this.rgb);
        },
        toHSL: function () {
          var r = this.rgb[0] / 255,
            g = this.rgb[1] / 255,
            b = this.rgb[2] / 255,
            a = this.alpha;
          var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
          var h;
          var s;
          var l = (max + min) / 2;
          var d = max - min;
          if (max === min) {
            h = s = 0;
          } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return { h: h * 360, s, l, a };
        },
        toHSV: function () {
          var r = this.rgb[0] / 255,
            g = this.rgb[1] / 255,
            b = this.rgb[2] / 255,
            a = this.alpha;
          var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
          var h;
          var s;
          var v = max;
          var d = max - min;
          if (max === 0) {
            s = 0;
          } else {
            s = d / max;
          }
          if (max === min) {
            h = 0;
          } else {
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return { h: h * 360, s, v, a };
        },
        toARGB: function () {
          return toHex([this.alpha * 255].concat(this.rgb));
        },
        compare: function (x) {
          return x.rgb &&
            x.rgb[0] === this.rgb[0] &&
            x.rgb[1] === this.rgb[1] &&
            x.rgb[2] === this.rgb[2] &&
            x.alpha === this.alpha
            ? 0
            : undefined;
        },
      });
      Color.fromKeyword = function (keyword) {
        var c;
        var key = keyword.toLowerCase();
        if (colors_1.default.hasOwnProperty(key)) {
          c = new Color(colors_1.default[key].slice(1));
        } else if (key === "transparent") {
          c = new Color([0, 0, 0], 0);
        }
        if (c) {
          c.value = keyword;
          return c;
        }
      };
      function clamp(v, max) {
        return Math.min(Math.max(v, 0), max);
      }
      function toHex(v) {
        return "#".concat(
          v
            .map(function (c) {
              c = clamp(Math.round(c), 255);
              return (c < 16 ? "0" : "") + c.toString(16);
            })
            .join(""),
        );
      }
      exports["default"] = Color;
    },
    6218: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var _noSpaceCombinators = { "": true, " ": true, "|": true };
      var Combinator = function (value) {
        if (value === " ") {
          this.value = " ";
          this.emptyOrWhitespace = true;
        } else {
          this.value = value ? value.trim() : "";
          this.emptyOrWhitespace = this.value === "";
        }
      };
      Combinator.prototype = Object.assign(new node_1.default(), {
        type: "Combinator",
        genCSS: function (context, output) {
          var spaceOrEmpty =
            context.compress || _noSpaceCombinators[this.value] ? "" : " ";
          output.add(spaceOrEmpty + this.value + spaceOrEmpty);
        },
      });
      exports["default"] = Combinator;
    },
    6435: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var debug_info_1 = tslib_1.__importDefault(__nccwpck_require__(8182));
      var Comment = function (value, isLineComment, index, currentFileInfo) {
        this.value = value;
        this.isLineComment = isLineComment;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
      };
      Comment.prototype = Object.assign(new node_1.default(), {
        type: "Comment",
        genCSS: function (context, output) {
          if (this.debugInfo) {
            output.add(
              (0, debug_info_1.default)(context, this),
              this.fileInfo(),
              this.getIndex(),
            );
          }
          output.add(this.value);
        },
        isSilent: function (context) {
          var isCompressed = context.compress && this.value[2] !== "!";
          return this.isLineComment || isCompressed;
        },
      });
      exports["default"] = Comment;
    },
    5411: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Condition = function (op, l, r, i, negate) {
        this.op = op.trim();
        this.lvalue = l;
        this.rvalue = r;
        this._index = i;
        this.negate = negate;
      };
      Condition.prototype = Object.assign(new node_1.default(), {
        type: "Condition",
        accept: function (visitor) {
          this.lvalue = visitor.visit(this.lvalue);
          this.rvalue = visitor.visit(this.rvalue);
        },
        eval: function (context) {
          var result = (function (op, a, b) {
            switch (op) {
              case "and":
                return a && b;
              case "or":
                return a || b;
              default:
                switch (node_1.default.compare(a, b)) {
                  case -1:
                    return op === "<" || op === "=<" || op === "<=";
                  case 0:
                    return (
                      op === "=" || op === ">=" || op === "=<" || op === "<="
                    );
                  case 1:
                    return op === ">" || op === ">=";
                  default:
                    return false;
                }
            }
          })(this.op, this.lvalue.eval(context), this.rvalue.eval(context));
          return this.negate ? !result : result;
        },
      });
      exports["default"] = Condition;
    },
    793: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var atrule_1 = tslib_1.__importDefault(__nccwpck_require__(7999));
      var nested_at_rule_1 = tslib_1.__importDefault(__nccwpck_require__(8096));
      var Container = function (
        value,
        features,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this._index = index;
        this._fileInfo = currentFileInfo;
        var selectors = new selector_1.default(
          [],
          null,
          null,
          this._index,
          this._fileInfo,
        ).createEmptySelectors();
        this.features = new value_1.default(features);
        this.rules = [new ruleset_1.default(selectors, value)];
        this.rules[0].allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.rules, this);
      };
      Container.prototype = Object.assign(
        new atrule_1.default(),
        tslib_1.__assign(
          tslib_1.__assign({ type: "Container" }, nested_at_rule_1.default),
          {
            genCSS: function (context, output) {
              output.add("@container ", this._fileInfo, this._index);
              this.features.genCSS(context, output);
              this.outputRuleset(context, output, this.rules);
            },
            eval: function (context) {
              if (!context.mediaBlocks) {
                context.mediaBlocks = [];
                context.mediaPath = [];
              }
              var media = new Container(
                null,
                [],
                this._index,
                this._fileInfo,
                this.visibilityInfo(),
              );
              if (this.debugInfo) {
                this.rules[0].debugInfo = this.debugInfo;
                media.debugInfo = this.debugInfo;
              }
              media.features = this.features.eval(context);
              context.mediaPath.push(media);
              context.mediaBlocks.push(media);
              this.rules[0].functionRegistry =
                context.frames[0].functionRegistry.inherit();
              context.frames.unshift(this.rules[0]);
              media.rules = [this.rules[0].eval(context)];
              context.frames.shift();
              context.mediaPath.pop();
              return context.mediaPath.length === 0
                ? media.evalTop(context)
                : media.evalNested(context);
            },
          },
        ),
      );
      exports["default"] = Container;
    },
    8182: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function asComment(ctx) {
        return "/* line "
          .concat(ctx.debugInfo.lineNumber, ", ")
          .concat(ctx.debugInfo.fileName, " */\n");
      }
      function asMediaQuery(ctx) {
        var filenameWithProtocol = ctx.debugInfo.fileName;
        if (!/^[a-z]+:\/\//i.test(filenameWithProtocol)) {
          filenameWithProtocol = "file://".concat(filenameWithProtocol);
        }
        return "@media -sass-debug-info{filename{font-family:"
          .concat(
            filenameWithProtocol.replace(/([.:/\\])/g, function (a) {
              if (a == "\\") {
                a = "/";
              }
              return "\\".concat(a);
            }),
            "}line{font-family:\\00003",
          )
          .concat(ctx.debugInfo.lineNumber, "}}\n");
      }
      function debugInfo(context, ctx, lineSeparator) {
        var result = "";
        if (context.dumpLineNumbers && !context.compress) {
          switch (context.dumpLineNumbers) {
            case "comments":
              result = asComment(ctx);
              break;
            case "mediaquery":
              result = asMediaQuery(ctx);
              break;
            case "all":
              result =
                asComment(ctx) + (lineSeparator || "") + asMediaQuery(ctx);
              break;
          }
        }
        return result;
      }
      exports["default"] = debugInfo;
    },
    5998: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var Constants = tslib_1.__importStar(__nccwpck_require__(3664));
      var MATH = Constants.Math;
      function evalName(context, name) {
        var value = "";
        var i;
        var n = name.length;
        var output = {
          add: function (s) {
            value += s;
          },
        };
        for (i = 0; i < n; i++) {
          name[i].eval(context).genCSS(context, output);
        }
        return value;
      }
      var Declaration = function (
        name,
        value,
        important,
        merge,
        index,
        currentFileInfo,
        inline,
        variable,
      ) {
        this.name = name;
        this.value =
          value instanceof node_1.default
            ? value
            : new value_1.default([
                value ? new anonymous_1.default(value) : null,
              ]);
        this.important = important ? " ".concat(important.trim()) : "";
        this.merge = merge;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.inline = inline || false;
        this.variable =
          variable !== undefined
            ? variable
            : name.charAt && name.charAt(0) === "@";
        this.allowRoot = true;
        this.setParent(this.value, this);
      };
      Declaration.prototype = Object.assign(new node_1.default(), {
        type: "Declaration",
        genCSS: function (context, output) {
          output.add(
            this.name + (context.compress ? ":" : ": "),
            this.fileInfo(),
            this.getIndex(),
          );
          try {
            this.value.genCSS(context, output);
          } catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
          }
          output.add(
            this.important +
              (this.inline || (context.lastRule && context.compress)
                ? ""
                : ";"),
            this._fileInfo,
            this._index,
          );
        },
        eval: function (context) {
          var mathBypass = false,
            prevMath,
            name = this.name,
            evaldValue,
            variable = this.variable;
          if (typeof name !== "string") {
            name =
              name.length === 1 && name[0] instanceof keyword_1.default
                ? name[0].value
                : evalName(context, name);
            variable = false;
          }
          if (name === "font" && context.math === MATH.ALWAYS) {
            mathBypass = true;
            prevMath = context.math;
            context.math = MATH.PARENS_DIVISION;
          }
          try {
            context.importantScope.push({});
            evaldValue = this.value.eval(context);
            if (!this.variable && evaldValue.type === "DetachedRuleset") {
              throw {
                message: "Rulesets cannot be evaluated on a property.",
                index: this.getIndex(),
                filename: this.fileInfo().filename,
              };
            }
            var important = this.important;
            var importantResult = context.importantScope.pop();
            if (!important && importantResult.important) {
              important = importantResult.important;
            }
            return new Declaration(
              name,
              evaldValue,
              important,
              this.merge,
              this.getIndex(),
              this.fileInfo(),
              this.inline,
              variable,
            );
          } catch (e) {
            if (typeof e.index !== "number") {
              e.index = this.getIndex();
              e.filename = this.fileInfo().filename;
            }
            throw e;
          } finally {
            if (mathBypass) {
              context.math = prevMath;
            }
          }
        },
        makeImportant: function () {
          return new Declaration(
            this.name,
            this.value,
            "!important",
            this.merge,
            this.getIndex(),
            this.fileInfo(),
            this.inline,
          );
        },
      });
      exports["default"] = Declaration;
    },
    4393: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var DetachedRuleset = function (ruleset, frames) {
        this.ruleset = ruleset;
        this.frames = frames;
        this.setParent(this.ruleset, this);
      };
      DetachedRuleset.prototype = Object.assign(new node_1.default(), {
        type: "DetachedRuleset",
        evalFirst: true,
        accept: function (visitor) {
          this.ruleset = visitor.visit(this.ruleset);
        },
        eval: function (context) {
          var frames = this.frames || utils.copyArray(context.frames);
          return new DetachedRuleset(this.ruleset, frames);
        },
        callEval: function (context) {
          return this.ruleset.eval(
            this.frames
              ? new contexts_1.default.Eval(
                  context,
                  this.frames.concat(context.frames),
                )
              : context,
          );
        },
      });
      exports["default"] = DetachedRuleset;
    },
    2254: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var unit_conversions_1 = tslib_1.__importDefault(
        __nccwpck_require__(2074),
      );
      var unit_1 = tslib_1.__importDefault(__nccwpck_require__(8618));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var Dimension = function (value, unit) {
        this.value = parseFloat(value);
        if (isNaN(this.value)) {
          throw new Error("Dimension is not a number.");
        }
        this.unit =
          unit && unit instanceof unit_1.default
            ? unit
            : new unit_1.default(unit ? [unit] : undefined);
        this.setParent(this.unit, this);
      };
      Dimension.prototype = Object.assign(new node_1.default(), {
        type: "Dimension",
        accept: function (visitor) {
          this.unit = visitor.visit(this.unit);
        },
        eval: function (context) {
          return this;
        },
        toColor: function () {
          return new color_1.default([this.value, this.value, this.value]);
        },
        genCSS: function (context, output) {
          if (context && context.strictUnits && !this.unit.isSingular()) {
            throw new Error(
              "Multiple units in dimension. Correct the units or use the unit function. Bad unit: ".concat(
                this.unit.toString(),
              ),
            );
          }
          var value = this.fround(context, this.value);
          var strValue = String(value);
          if (value !== 0 && value < 1e-6 && value > -1e-6) {
            strValue = value.toFixed(20).replace(/0+$/, "");
          }
          if (context && context.compress) {
            if (value === 0 && this.unit.isLength()) {
              output.add(strValue);
              return;
            }
            if (value > 0 && value < 1) {
              strValue = strValue.substr(1);
            }
          }
          output.add(strValue);
          this.unit.genCSS(context, output);
        },
        operate: function (context, op, other) {
          var value = this._operate(context, op, this.value, other.value);
          var unit = this.unit.clone();
          if (op === "+" || op === "-") {
            if (unit.numerator.length === 0 && unit.denominator.length === 0) {
              unit = other.unit.clone();
              if (this.unit.backupUnit) {
                unit.backupUnit = this.unit.backupUnit;
              }
            } else if (
              other.unit.numerator.length === 0 &&
              unit.denominator.length === 0
            ) {
            } else {
              other = other.convertTo(this.unit.usedUnits());
              if (
                context.strictUnits &&
                other.unit.toString() !== unit.toString()
              ) {
                throw new Error(
                  "Incompatible units. Change the units or use the unit function. " +
                    "Bad units: '"
                      .concat(unit.toString(), "' and '")
                      .concat(other.unit.toString(), "'."),
                );
              }
              value = this._operate(context, op, this.value, other.value);
            }
          } else if (op === "*") {
            unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
            unit.denominator = unit.denominator
              .concat(other.unit.denominator)
              .sort();
            unit.cancel();
          } else if (op === "/") {
            unit.numerator = unit.numerator
              .concat(other.unit.denominator)
              .sort();
            unit.denominator = unit.denominator
              .concat(other.unit.numerator)
              .sort();
            unit.cancel();
          }
          return new Dimension(value, unit);
        },
        compare: function (other) {
          var a, b;
          if (!(other instanceof Dimension)) {
            return undefined;
          }
          if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
          } else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
              return undefined;
            }
          }
          return node_1.default.numericCompare(a.value, b.value);
        },
        unify: function () {
          return this.convertTo({ length: "px", duration: "s", angle: "rad" });
        },
        convertTo: function (conversions) {
          var value = this.value;
          var unit = this.unit.clone();
          var i;
          var groupName;
          var group;
          var targetUnit;
          var derivedConversions = {};
          var applyUnit;
          if (typeof conversions === "string") {
            for (i in unit_conversions_1.default) {
              if (unit_conversions_1.default[i].hasOwnProperty(conversions)) {
                derivedConversions = {};
                derivedConversions[i] = conversions;
              }
            }
            conversions = derivedConversions;
          }
          applyUnit = function (atomicUnit, denominator) {
            if (group.hasOwnProperty(atomicUnit)) {
              if (denominator) {
                value = value / (group[atomicUnit] / group[targetUnit]);
              } else {
                value = value * (group[atomicUnit] / group[targetUnit]);
              }
              return targetUnit;
            }
            return atomicUnit;
          };
          for (groupName in conversions) {
            if (conversions.hasOwnProperty(groupName)) {
              targetUnit = conversions[groupName];
              group = unit_conversions_1.default[groupName];
              unit.map(applyUnit);
            }
          }
          unit.cancel();
          return new Dimension(value, unit);
        },
      });
      exports["default"] = Dimension;
    },
    7974: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var paren_1 = tslib_1.__importDefault(__nccwpck_require__(9270));
      var combinator_1 = tslib_1.__importDefault(__nccwpck_require__(6218));
      var Element = function (
        combinator,
        value,
        isVariable,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this.combinator =
          combinator instanceof combinator_1.default
            ? combinator
            : new combinator_1.default(combinator);
        if (typeof value === "string") {
          this.value = value.trim();
        } else if (value) {
          this.value = value;
        } else {
          this.value = "";
        }
        this.isVariable = isVariable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.combinator, this);
      };
      Element.prototype = Object.assign(new node_1.default(), {
        type: "Element",
        accept: function (visitor) {
          var value = this.value;
          this.combinator = visitor.visit(this.combinator);
          if (typeof value === "object") {
            this.value = visitor.visit(value);
          }
        },
        eval: function (context) {
          return new Element(
            this.combinator,
            this.value.eval ? this.value.eval(context) : this.value,
            this.isVariable,
            this.getIndex(),
            this.fileInfo(),
            this.visibilityInfo(),
          );
        },
        clone: function () {
          return new Element(
            this.combinator,
            this.value,
            this.isVariable,
            this.getIndex(),
            this.fileInfo(),
            this.visibilityInfo(),
          );
        },
        genCSS: function (context, output) {
          output.add(this.toCSS(context), this.fileInfo(), this.getIndex());
        },
        toCSS: function (context) {
          context = context || {};
          var value = this.value;
          var firstSelector = context.firstSelector;
          if (value instanceof paren_1.default) {
            context.firstSelector = true;
          }
          value = value.toCSS ? value.toCSS(context) : value;
          context.firstSelector = firstSelector;
          if (value === "" && this.combinator.value.charAt(0) === "&") {
            return "";
          } else {
            return this.combinator.toCSS(context) + value;
          }
        },
      });
      exports["default"] = Element;
    },
    966: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var paren_1 = tslib_1.__importDefault(__nccwpck_require__(9270));
      var comment_1 = tslib_1.__importDefault(__nccwpck_require__(6435));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var Expression = function (value, noSpacing) {
        this.value = value;
        this.noSpacing = noSpacing;
        if (!value) {
          throw new Error("Expression requires an array parameter");
        }
      };
      Expression.prototype = Object.assign(new node_1.default(), {
        type: "Expression",
        accept: function (visitor) {
          this.value = visitor.visitArray(this.value);
        },
        eval: function (context) {
          var returnValue;
          var mathOn = context.isMathOn();
          var inParenthesis = this.parens;
          var doubleParen = false;
          if (inParenthesis) {
            context.inParenthesis();
          }
          if (this.value.length > 1) {
            returnValue = new Expression(
              this.value.map(function (e) {
                if (!e.eval) {
                  return e;
                }
                return e.eval(context);
              }),
              this.noSpacing,
            );
          } else if (this.value.length === 1) {
            if (
              this.value[0].parens &&
              !this.value[0].parensInOp &&
              !context.inCalc
            ) {
              doubleParen = true;
            }
            returnValue = this.value[0].eval(context);
          } else {
            returnValue = this;
          }
          if (inParenthesis) {
            context.outOfParenthesis();
          }
          if (
            this.parens &&
            this.parensInOp &&
            !mathOn &&
            !doubleParen &&
            !(returnValue instanceof dimension_1.default)
          ) {
            returnValue = new paren_1.default(returnValue);
          }
          return returnValue;
        },
        genCSS: function (context, output) {
          for (var i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (!this.noSpacing && i + 1 < this.value.length) {
              if (
                (i + 1 < this.value.length &&
                  !(this.value[i + 1] instanceof anonymous_1.default)) ||
                (this.value[i + 1] instanceof anonymous_1.default &&
                  this.value[i + 1].value !== ",")
              ) {
                output.add(" ");
              }
            }
          }
        },
        throwAwayComments: function () {
          this.value = this.value.filter(function (v) {
            return !(v instanceof comment_1.default);
          });
        },
      });
      exports["default"] = Expression;
    },
    4936: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var Extend = function (
        selector,
        option,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this.selector = selector;
        this.option = option;
        this.object_id = Extend.next_id++;
        this.parent_ids = [this.object_id];
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        switch (option) {
          case "!all":
          case "all":
            this.allowBefore = true;
            this.allowAfter = true;
            break;
          default:
            this.allowBefore = false;
            this.allowAfter = false;
            break;
        }
        this.setParent(this.selector, this);
      };
      Extend.prototype = Object.assign(new node_1.default(), {
        type: "Extend",
        accept: function (visitor) {
          this.selector = visitor.visit(this.selector);
        },
        eval: function (context) {
          return new Extend(
            this.selector.eval(context),
            this.option,
            this.getIndex(),
            this.fileInfo(),
            this.visibilityInfo(),
          );
        },
        clone: function (context) {
          return new Extend(
            this.selector,
            this.option,
            this.getIndex(),
            this.fileInfo(),
            this.visibilityInfo(),
          );
        },
        findSelfSelectors: function (selectors) {
          var selfElements = [],
            i,
            selectorElements;
          for (i = 0; i < selectors.length; i++) {
            selectorElements = selectors[i].elements;
            if (
              i > 0 &&
              selectorElements.length &&
              selectorElements[0].combinator.value === ""
            ) {
              selectorElements[0].combinator.value = " ";
            }
            selfElements = selfElements.concat(selectors[i].elements);
          }
          this.selfSelectors = [new selector_1.default(selfElements)];
          this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
        },
      });
      Extend.next_id = 0;
      exports["default"] = Extend;
    },
    805: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var media_1 = tslib_1.__importDefault(__nccwpck_require__(8630));
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(595));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var Import = function (
        path,
        features,
        options,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this.options = options;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.path = path;
        this.features = features;
        this.allowRoot = true;
        if (this.options.less !== undefined || this.options.inline) {
          this.css = !this.options.less || this.options.inline;
        } else {
          var pathValue = this.getPath();
          if (pathValue && /[#.&?]css([?;].*)?$/.test(pathValue)) {
            this.css = true;
          }
        }
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.features, this);
        this.setParent(this.path, this);
      };
      Import.prototype = Object.assign(new node_1.default(), {
        type: "Import",
        accept: function (visitor) {
          if (this.features) {
            this.features = visitor.visit(this.features);
          }
          this.path = visitor.visit(this.path);
          if (!this.options.isPlugin && !this.options.inline && this.root) {
            this.root = visitor.visit(this.root);
          }
        },
        genCSS: function (context, output) {
          if (this.css && this.path._fileInfo.reference === undefined) {
            output.add("@import ", this._fileInfo, this._index);
            this.path.genCSS(context, output);
            if (this.features) {
              output.add(" ");
              this.features.genCSS(context, output);
            }
            output.add(";");
          }
        },
        getPath: function () {
          return this.path instanceof url_1.default
            ? this.path.value.value
            : this.path.value;
        },
        isVariableImport: function () {
          var path = this.path;
          if (path instanceof url_1.default) {
            path = path.value;
          }
          if (path instanceof quoted_1.default) {
            return path.containsVariables();
          }
          return true;
        },
        evalForImport: function (context) {
          var path = this.path;
          if (path instanceof url_1.default) {
            path = path.value;
          }
          return new Import(
            path.eval(context),
            this.features,
            this.options,
            this._index,
            this._fileInfo,
            this.visibilityInfo(),
          );
        },
        evalPath: function (context) {
          var path = this.path.eval(context);
          var fileInfo = this._fileInfo;
          if (!(path instanceof url_1.default)) {
            var pathValue = path.value;
            if (
              fileInfo &&
              pathValue &&
              context.pathRequiresRewrite(pathValue)
            ) {
              path.value = context.rewritePath(pathValue, fileInfo.rootpath);
            } else {
              path.value = context.normalizePath(path.value);
            }
          }
          return path;
        },
        eval: function (context) {
          var result = this.doEval(context);
          if (this.options.reference || this.blocksVisibility()) {
            if (result.length || result.length === 0) {
              result.forEach(function (node) {
                node.addVisibilityBlock();
              });
            } else {
              result.addVisibilityBlock();
            }
          }
          return result;
        },
        doEval: function (context) {
          var ruleset;
          var registry;
          var features = this.features && this.features.eval(context);
          if (this.options.isPlugin) {
            if (this.root && this.root.eval) {
              try {
                this.root.eval(context);
              } catch (e) {
                e.message = "Plugin error during evaluation";
                throw new less_error_1.default(
                  e,
                  this.root.imports,
                  this.root.filename,
                );
              }
            }
            registry = context.frames[0] && context.frames[0].functionRegistry;
            if (registry && this.root && this.root.functions) {
              registry.addMultiple(this.root.functions);
            }
            return [];
          }
          if (this.skip) {
            if (typeof this.skip === "function") {
              this.skip = this.skip();
            }
            if (this.skip) {
              return [];
            }
          }
          if (this.options.inline) {
            var contents = new anonymous_1.default(
              this.root,
              0,
              {
                filename: this.importedFilename,
                reference: this.path._fileInfo && this.path._fileInfo.reference,
              },
              true,
              true,
            );
            return this.features
              ? new media_1.default([contents], this.features.value)
              : [contents];
          } else if (this.css) {
            var newImport = new Import(
              this.evalPath(context),
              features,
              this.options,
              this._index,
            );
            if (!newImport.css && this.error) {
              throw this.error;
            }
            return newImport;
          } else if (this.root) {
            ruleset = new ruleset_1.default(
              null,
              utils.copyArray(this.root.rules),
            );
            ruleset.evalImports(context);
            return this.features
              ? new media_1.default(ruleset.rules, this.features.value)
              : ruleset.rules;
          } else {
            return [];
          }
        },
      });
      exports["default"] = Import;
    },
    5730: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var atrule_1 = tslib_1.__importDefault(__nccwpck_require__(7999));
      var detached_ruleset_1 = tslib_1.__importDefault(
        __nccwpck_require__(4393),
      );
      var operation_1 = tslib_1.__importDefault(__nccwpck_require__(2351));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var unit_1 = tslib_1.__importDefault(__nccwpck_require__(8618));
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var property_1 = tslib_1.__importDefault(__nccwpck_require__(7957));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var element_1 = tslib_1.__importDefault(__nccwpck_require__(7974));
      var attribute_1 = tslib_1.__importDefault(__nccwpck_require__(6194));
      var combinator_1 = tslib_1.__importDefault(__nccwpck_require__(6218));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var call_1 = tslib_1.__importDefault(__nccwpck_require__(3256));
      var url_1 = tslib_1.__importDefault(__nccwpck_require__(595));
      var import_1 = tslib_1.__importDefault(__nccwpck_require__(805));
      var comment_1 = tslib_1.__importDefault(__nccwpck_require__(6435));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var javascript_1 = tslib_1.__importDefault(__nccwpck_require__(8099));
      var assignment_1 = tslib_1.__importDefault(__nccwpck_require__(2685));
      var condition_1 = tslib_1.__importDefault(__nccwpck_require__(5411));
      var query_in_parens_1 = tslib_1.__importDefault(
        __nccwpck_require__(6320),
      );
      var paren_1 = tslib_1.__importDefault(__nccwpck_require__(9270));
      var media_1 = tslib_1.__importDefault(__nccwpck_require__(8630));
      var container_1 = tslib_1.__importDefault(__nccwpck_require__(793));
      var unicode_descriptor_1 = tslib_1.__importDefault(
        __nccwpck_require__(5987),
      );
      var negative_1 = tslib_1.__importDefault(__nccwpck_require__(3363));
      var extend_1 = tslib_1.__importDefault(__nccwpck_require__(4936));
      var variable_call_1 = tslib_1.__importDefault(__nccwpck_require__(1253));
      var namespace_value_1 = tslib_1.__importDefault(
        __nccwpck_require__(4785),
      );
      var mixin_call_1 = tslib_1.__importDefault(__nccwpck_require__(9100));
      var mixin_definition_1 = tslib_1.__importDefault(
        __nccwpck_require__(5549),
      );
      exports["default"] = {
        Node: node_1.default,
        Color: color_1.default,
        AtRule: atrule_1.default,
        DetachedRuleset: detached_ruleset_1.default,
        Operation: operation_1.default,
        Dimension: dimension_1.default,
        Unit: unit_1.default,
        Keyword: keyword_1.default,
        Variable: variable_1.default,
        Property: property_1.default,
        Ruleset: ruleset_1.default,
        Element: element_1.default,
        Attribute: attribute_1.default,
        Combinator: combinator_1.default,
        Selector: selector_1.default,
        Quoted: quoted_1.default,
        Expression: expression_1.default,
        Declaration: declaration_1.default,
        Call: call_1.default,
        URL: url_1.default,
        Import: import_1.default,
        Comment: comment_1.default,
        Anonymous: anonymous_1.default,
        Value: value_1.default,
        JavaScript: javascript_1.default,
        Assignment: assignment_1.default,
        Condition: condition_1.default,
        Paren: paren_1.default,
        Media: media_1.default,
        Container: container_1.default,
        QueryInParens: query_in_parens_1.default,
        UnicodeDescriptor: unicode_descriptor_1.default,
        Negative: negative_1.default,
        Extend: extend_1.default,
        VariableCall: variable_call_1.default,
        NamespaceValue: namespace_value_1.default,
        mixin: {
          Call: mixin_call_1.default,
          Definition: mixin_definition_1.default,
        },
      };
    },
    8099: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var js_eval_node_1 = tslib_1.__importDefault(__nccwpck_require__(1075));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var quoted_1 = tslib_1.__importDefault(__nccwpck_require__(5920));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var JavaScript = function (string, escaped, index, currentFileInfo) {
        this.escaped = escaped;
        this.expression = string;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      JavaScript.prototype = Object.assign(new js_eval_node_1.default(), {
        type: "JavaScript",
        eval: function (context) {
          var result = this.evaluateJavaScript(this.expression, context);
          var type = typeof result;
          if (type === "number" && !isNaN(result)) {
            return new dimension_1.default(result);
          } else if (type === "string") {
            return new quoted_1.default(
              '"'.concat(result, '"'),
              result,
              this.escaped,
              this._index,
            );
          } else if (Array.isArray(result)) {
            return new anonymous_1.default(result.join(", "));
          } else {
            return new anonymous_1.default(result);
          }
        },
      });
      exports["default"] = JavaScript;
    },
    1075: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var JsEvalNode = function () {};
      JsEvalNode.prototype = Object.assign(new node_1.default(), {
        evaluateJavaScript: function (expression, context) {
          var result;
          var that = this;
          var evalContext = {};
          if (!context.javascriptEnabled) {
            throw {
              message:
                "Inline JavaScript is not enabled. Is it set in your options?",
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
          expression = expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return that.jsify(
              new variable_1.default(
                "@".concat(name),
                that.getIndex(),
                that.fileInfo(),
              ).eval(context),
            );
          });
          try {
            expression = new Function("return (".concat(expression, ")"));
          } catch (e) {
            throw {
              message: "JavaScript evaluation error: "
                .concat(e.message, " from `")
                .concat(expression, "`"),
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
          var variables = context.frames[0].variables();
          for (var k in variables) {
            if (variables.hasOwnProperty(k)) {
              evalContext[k.slice(1)] = {
                value: variables[k].value,
                toJS: function () {
                  return this.value.eval(context).toCSS();
                },
              };
            }
          }
          try {
            result = expression.call(evalContext);
          } catch (e) {
            throw {
              message: "JavaScript evaluation error: '"
                .concat(e.name, ": ")
                .concat(e.message.replace(/["]/g, "'"), "'"),
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
          return result;
        },
        jsify: function (obj) {
          if (Array.isArray(obj.value) && obj.value.length > 1) {
            return "[".concat(
              obj.value
                .map(function (v) {
                  return v.toCSS();
                })
                .join(", "),
              "]",
            );
          } else {
            return obj.toCSS();
          }
        },
      });
      exports["default"] = JsEvalNode;
    },
    2113: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Keyword = function (value) {
        this.value = value;
      };
      Keyword.prototype = Object.assign(new node_1.default(), {
        type: "Keyword",
        genCSS: function (context, output) {
          if (this.value === "%") {
            throw { type: "Syntax", message: "Invalid % without number" };
          }
          output.add(this.value);
        },
      });
      Keyword.True = new Keyword("true");
      Keyword.False = new Keyword("false");
      exports["default"] = Keyword;
    },
    8630: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var atrule_1 = tslib_1.__importDefault(__nccwpck_require__(7999));
      var nested_at_rule_1 = tslib_1.__importDefault(__nccwpck_require__(8096));
      var Media = function (
        value,
        features,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this._index = index;
        this._fileInfo = currentFileInfo;
        var selectors = new selector_1.default(
          [],
          null,
          null,
          this._index,
          this._fileInfo,
        ).createEmptySelectors();
        this.features = new value_1.default(features);
        this.rules = [new ruleset_1.default(selectors, value)];
        this.rules[0].allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.rules, this);
      };
      Media.prototype = Object.assign(
        new atrule_1.default(),
        tslib_1.__assign(
          tslib_1.__assign({ type: "Media" }, nested_at_rule_1.default),
          {
            genCSS: function (context, output) {
              output.add("@media ", this._fileInfo, this._index);
              this.features.genCSS(context, output);
              this.outputRuleset(context, output, this.rules);
            },
            eval: function (context) {
              if (!context.mediaBlocks) {
                context.mediaBlocks = [];
                context.mediaPath = [];
              }
              var media = new Media(
                null,
                [],
                this._index,
                this._fileInfo,
                this.visibilityInfo(),
              );
              if (this.debugInfo) {
                this.rules[0].debugInfo = this.debugInfo;
                media.debugInfo = this.debugInfo;
              }
              media.features = this.features.eval(context);
              context.mediaPath.push(media);
              context.mediaBlocks.push(media);
              this.rules[0].functionRegistry =
                context.frames[0].functionRegistry.inherit();
              context.frames.unshift(this.rules[0]);
              media.rules = [this.rules[0].eval(context)];
              context.frames.shift();
              context.mediaPath.pop();
              return context.mediaPath.length === 0
                ? media.evalTop(context)
                : media.evalNested(context);
            },
          },
        ),
      );
      exports["default"] = Media;
    },
    9100: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var mixin_definition_1 = tslib_1.__importDefault(
        __nccwpck_require__(5549),
      );
      var default_1 = tslib_1.__importDefault(__nccwpck_require__(2614));
      var MixinCall = function (
        elements,
        args,
        index,
        currentFileInfo,
        important,
      ) {
        this.selector = new selector_1.default(elements);
        this.arguments = args || [];
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.important = important;
        this.allowRoot = true;
        this.setParent(this.selector, this);
      };
      MixinCall.prototype = Object.assign(new node_1.default(), {
        type: "MixinCall",
        accept: function (visitor) {
          if (this.selector) {
            this.selector = visitor.visit(this.selector);
          }
          if (this.arguments.length) {
            this.arguments = visitor.visitArray(this.arguments);
          }
        },
        eval: function (context) {
          var mixins;
          var mixin;
          var mixinPath;
          var args = [];
          var arg;
          var argValue;
          var rules = [];
          var match = false;
          var i;
          var m;
          var f;
          var isRecursive;
          var isOneFound;
          var candidates = [];
          var candidate;
          var conditionResult = [];
          var defaultResult;
          var defFalseEitherCase = -1;
          var defNone = 0;
          var defTrue = 1;
          var defFalse = 2;
          var count;
          var originalRuleset;
          var noArgumentsFilter;
          this.selector = this.selector.eval(context);
          function calcDefGroup(mixin, mixinPath) {
            var f, p, namespace;
            for (f = 0; f < 2; f++) {
              conditionResult[f] = true;
              default_1.default.value(f);
              for (p = 0; p < mixinPath.length && conditionResult[f]; p++) {
                namespace = mixinPath[p];
                if (namespace.matchCondition) {
                  conditionResult[f] =
                    conditionResult[f] &&
                    namespace.matchCondition(null, context);
                }
              }
              if (mixin.matchCondition) {
                conditionResult[f] =
                  conditionResult[f] && mixin.matchCondition(args, context);
              }
            }
            if (conditionResult[0] || conditionResult[1]) {
              if (conditionResult[0] != conditionResult[1]) {
                return conditionResult[1] ? defTrue : defFalse;
              }
              return defNone;
            }
            return defFalseEitherCase;
          }
          for (i = 0; i < this.arguments.length; i++) {
            arg = this.arguments[i];
            argValue = arg.value.eval(context);
            if (arg.expand && Array.isArray(argValue.value)) {
              argValue = argValue.value;
              for (m = 0; m < argValue.length; m++) {
                args.push({ value: argValue[m] });
              }
            } else {
              args.push({ name: arg.name, value: argValue });
            }
          }
          noArgumentsFilter = function (rule) {
            return rule.matchArgs(null, context);
          };
          for (i = 0; i < context.frames.length; i++) {
            if (
              (mixins = context.frames[i].find(
                this.selector,
                null,
                noArgumentsFilter,
              )).length > 0
            ) {
              isOneFound = true;
              for (m = 0; m < mixins.length; m++) {
                mixin = mixins[m].rule;
                mixinPath = mixins[m].path;
                isRecursive = false;
                for (f = 0; f < context.frames.length; f++) {
                  if (
                    !(mixin instanceof mixin_definition_1.default) &&
                    mixin ===
                      (context.frames[f].originalRuleset || context.frames[f])
                  ) {
                    isRecursive = true;
                    break;
                  }
                }
                if (isRecursive) {
                  continue;
                }
                if (mixin.matchArgs(args, context)) {
                  candidate = { mixin, group: calcDefGroup(mixin, mixinPath) };
                  if (candidate.group !== defFalseEitherCase) {
                    candidates.push(candidate);
                  }
                  match = true;
                }
              }
              default_1.default.reset();
              count = [0, 0, 0];
              for (m = 0; m < candidates.length; m++) {
                count[candidates[m].group]++;
              }
              if (count[defNone] > 0) {
                defaultResult = defFalse;
              } else {
                defaultResult = defTrue;
                if (count[defTrue] + count[defFalse] > 1) {
                  throw {
                    type: "Runtime",
                    message:
                      "Ambiguous use of `default()` found when matching for `".concat(
                        this.format(args),
                        "`",
                      ),
                    index: this.getIndex(),
                    filename: this.fileInfo().filename,
                  };
                }
              }
              for (m = 0; m < candidates.length; m++) {
                candidate = candidates[m].group;
                if (candidate === defNone || candidate === defaultResult) {
                  try {
                    mixin = candidates[m].mixin;
                    if (!(mixin instanceof mixin_definition_1.default)) {
                      originalRuleset = mixin.originalRuleset || mixin;
                      mixin = new mixin_definition_1.default(
                        "",
                        [],
                        mixin.rules,
                        null,
                        false,
                        null,
                        originalRuleset.visibilityInfo(),
                      );
                      mixin.originalRuleset = originalRuleset;
                    }
                    var newRules = mixin.evalCall(
                      context,
                      args,
                      this.important,
                    ).rules;
                    this._setVisibilityToReplacement(newRules);
                    Array.prototype.push.apply(rules, newRules);
                  } catch (e) {
                    throw {
                      message: e.message,
                      index: this.getIndex(),
                      filename: this.fileInfo().filename,
                      stack: e.stack,
                    };
                  }
                }
              }
              if (match) {
                return rules;
              }
            }
          }
          if (isOneFound) {
            throw {
              type: "Runtime",
              message: "No matching definition was found for `".concat(
                this.format(args),
                "`",
              ),
              index: this.getIndex(),
              filename: this.fileInfo().filename,
            };
          } else {
            throw {
              type: "Name",
              message: "".concat(this.selector.toCSS().trim(), " is undefined"),
              index: this.getIndex(),
              filename: this.fileInfo().filename,
            };
          }
        },
        _setVisibilityToReplacement: function (replacement) {
          var i, rule;
          if (this.blocksVisibility()) {
            for (i = 0; i < replacement.length; i++) {
              rule = replacement[i];
              rule.addVisibilityBlock();
            }
          }
        },
        format: function (args) {
          return "".concat(this.selector.toCSS().trim(), "(").concat(
            args
              ? args
                  .map(function (a) {
                    var argValue = "";
                    if (a.name) {
                      argValue += "".concat(a.name, ":");
                    }
                    if (a.value.toCSS) {
                      argValue += a.value.toCSS();
                    } else {
                      argValue += "???";
                    }
                    return argValue;
                  })
                  .join(", ")
              : "",
            ")",
          );
        },
      });
      exports["default"] = MixinCall;
    },
    5549: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var element_1 = tslib_1.__importDefault(__nccwpck_require__(7974));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var detached_ruleset_1 = tslib_1.__importDefault(
        __nccwpck_require__(4393),
      );
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var Definition = function (
        name,
        params,
        rules,
        condition,
        variadic,
        frames,
        visibilityInfo,
      ) {
        this.name = name || "anonymous mixin";
        this.selectors = [
          new selector_1.default([
            new element_1.default(
              null,
              name,
              false,
              this._index,
              this._fileInfo,
            ),
          ]),
        ];
        this.params = params;
        this.condition = condition;
        this.variadic = variadic;
        this.arity = params.length;
        this.rules = rules;
        this._lookups = {};
        var optionalParameters = [];
        this.required = params.reduce(function (count, p) {
          if (!p.name || (p.name && !p.value)) {
            return count + 1;
          } else {
            optionalParameters.push(p.name);
            return count;
          }
        }, 0);
        this.optionalParameters = optionalParameters;
        this.frames = frames;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
      };
      Definition.prototype = Object.assign(new ruleset_1.default(), {
        type: "MixinDefinition",
        evalFirst: true,
        accept: function (visitor) {
          if (this.params && this.params.length) {
            this.params = visitor.visitArray(this.params);
          }
          this.rules = visitor.visitArray(this.rules);
          if (this.condition) {
            this.condition = visitor.visit(this.condition);
          }
        },
        evalParams: function (context, mixinEnv, args, evaldArguments) {
          var frame = new ruleset_1.default(null, null);
          var varargs;
          var arg;
          var params = utils.copyArray(this.params);
          var i;
          var j;
          var val;
          var name;
          var isNamedFound;
          var argIndex;
          var argsLength = 0;
          if (
            mixinEnv.frames &&
            mixinEnv.frames[0] &&
            mixinEnv.frames[0].functionRegistry
          ) {
            frame.functionRegistry =
              mixinEnv.frames[0].functionRegistry.inherit();
          }
          mixinEnv = new contexts_1.default.Eval(
            mixinEnv,
            [frame].concat(mixinEnv.frames),
          );
          if (args) {
            args = utils.copyArray(args);
            argsLength = args.length;
            for (i = 0; i < argsLength; i++) {
              arg = args[i];
              if ((name = arg && arg.name)) {
                isNamedFound = false;
                for (j = 0; j < params.length; j++) {
                  if (!evaldArguments[j] && name === params[j].name) {
                    evaldArguments[j] = arg.value.eval(context);
                    frame.prependRule(
                      new declaration_1.default(name, arg.value.eval(context)),
                    );
                    isNamedFound = true;
                    break;
                  }
                }
                if (isNamedFound) {
                  args.splice(i, 1);
                  i--;
                  continue;
                } else {
                  throw {
                    type: "Runtime",
                    message: "Named argument for "
                      .concat(this.name, " ")
                      .concat(args[i].name, " not found"),
                  };
                }
              }
            }
          }
          argIndex = 0;
          for (i = 0; i < params.length; i++) {
            if (evaldArguments[i]) {
              continue;
            }
            arg = args && args[argIndex];
            if ((name = params[i].name)) {
              if (params[i].variadic) {
                varargs = [];
                for (j = argIndex; j < argsLength; j++) {
                  varargs.push(args[j].value.eval(context));
                }
                frame.prependRule(
                  new declaration_1.default(
                    name,
                    new expression_1.default(varargs).eval(context),
                  ),
                );
              } else {
                val = arg && arg.value;
                if (val) {
                  if (Array.isArray(val)) {
                    val = new detached_ruleset_1.default(
                      new ruleset_1.default("", val),
                    );
                  } else {
                    val = val.eval(context);
                  }
                } else if (params[i].value) {
                  val = params[i].value.eval(mixinEnv);
                  frame.resetCache();
                } else {
                  throw {
                    type: "Runtime",
                    message: "wrong number of arguments for "
                      .concat(this.name, " (")
                      .concat(argsLength, " for ")
                      .concat(this.arity, ")"),
                  };
                }
                frame.prependRule(new declaration_1.default(name, val));
                evaldArguments[i] = val;
              }
            }
            if (params[i].variadic && args) {
              for (j = argIndex; j < argsLength; j++) {
                evaldArguments[j] = args[j].value.eval(context);
              }
            }
            argIndex++;
          }
          return frame;
        },
        makeImportant: function () {
          var rules = !this.rules
            ? this.rules
            : this.rules.map(function (r) {
                if (r.makeImportant) {
                  return r.makeImportant(true);
                } else {
                  return r;
                }
              });
          var result = new Definition(
            this.name,
            this.params,
            rules,
            this.condition,
            this.variadic,
            this.frames,
          );
          return result;
        },
        eval: function (context) {
          return new Definition(
            this.name,
            this.params,
            this.rules,
            this.condition,
            this.variadic,
            this.frames || utils.copyArray(context.frames),
          );
        },
        evalCall: function (context, args, important) {
          var _arguments = [];
          var mixinFrames = this.frames
            ? this.frames.concat(context.frames)
            : context.frames;
          var frame = this.evalParams(
            context,
            new contexts_1.default.Eval(context, mixinFrames),
            args,
            _arguments,
          );
          var rules;
          var ruleset;
          frame.prependRule(
            new declaration_1.default(
              "@arguments",
              new expression_1.default(_arguments).eval(context),
            ),
          );
          rules = utils.copyArray(this.rules);
          ruleset = new ruleset_1.default(null, rules);
          ruleset.originalRuleset = this;
          ruleset = ruleset.eval(
            new contexts_1.default.Eval(
              context,
              [this, frame].concat(mixinFrames),
            ),
          );
          if (important) {
            ruleset = ruleset.makeImportant();
          }
          return ruleset;
        },
        matchCondition: function (args, context) {
          if (
            this.condition &&
            !this.condition.eval(
              new contexts_1.default.Eval(
                context,
                [
                  this.evalParams(
                    context,
                    new contexts_1.default.Eval(
                      context,
                      this.frames
                        ? this.frames.concat(context.frames)
                        : context.frames,
                    ),
                    args,
                    [],
                  ),
                ]
                  .concat(this.frames || [])
                  .concat(context.frames),
              ),
            )
          ) {
            return false;
          }
          return true;
        },
        matchArgs: function (args, context) {
          var allArgsCnt = (args && args.length) || 0;
          var len;
          var optionalParameters = this.optionalParameters;
          var requiredArgsCnt = !args
            ? 0
            : args.reduce(function (count, p) {
                if (optionalParameters.indexOf(p.name) < 0) {
                  return count + 1;
                } else {
                  return count;
                }
              }, 0);
          if (!this.variadic) {
            if (requiredArgsCnt < this.required) {
              return false;
            }
            if (allArgsCnt > this.params.length) {
              return false;
            }
          } else {
            if (requiredArgsCnt < this.required - 1) {
              return false;
            }
          }
          len = Math.min(requiredArgsCnt, this.arity);
          for (var i = 0; i < len; i++) {
            if (!this.params[i].name && !this.params[i].variadic) {
              if (
                args[i].value.eval(context).toCSS() !=
                this.params[i].value.eval(context).toCSS()
              ) {
                return false;
              }
            }
          }
          return true;
        },
      });
      exports["default"] = Definition;
    },
    4785: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var NamespaceValue = function (ruleCall, lookups, index, fileInfo) {
        this.value = ruleCall;
        this.lookups = lookups;
        this._index = index;
        this._fileInfo = fileInfo;
      };
      NamespaceValue.prototype = Object.assign(new node_1.default(), {
        type: "NamespaceValue",
        eval: function (context) {
          var i,
            name,
            rules = this.value.eval(context);
          for (i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];
            if (Array.isArray(rules)) {
              rules = new ruleset_1.default([new selector_1.default()], rules);
            }
            if (name === "") {
              rules = rules.lastDeclaration();
            } else if (name.charAt(0) === "@") {
              if (name.charAt(1) === "@") {
                name = "@".concat(
                  new variable_1.default(name.substr(1)).eval(context).value,
                );
              }
              if (rules.variables) {
                rules = rules.variable(name);
              }
              if (!rules) {
                throw {
                  type: "Name",
                  message: "variable ".concat(name, " not found"),
                  filename: this.fileInfo().filename,
                  index: this.getIndex(),
                };
              }
            } else {
              if (name.substring(0, 2) === "$@") {
                name = "$".concat(
                  new variable_1.default(name.substr(1)).eval(context).value,
                );
              } else {
                name = name.charAt(0) === "$" ? name : "$".concat(name);
              }
              if (rules.properties) {
                rules = rules.property(name);
              }
              if (!rules) {
                throw {
                  type: "Name",
                  message: 'property "'.concat(name.substr(1), '" not found'),
                  filename: this.fileInfo().filename,
                  index: this.getIndex(),
                };
              }
              rules = rules[rules.length - 1];
            }
            if (rules.value) {
              rules = rules.eval(context).value;
            }
            if (rules.ruleset) {
              rules = rules.ruleset.eval(context);
            }
          }
          return rules;
        },
      });
      exports["default"] = NamespaceValue;
    },
    3363: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var operation_1 = tslib_1.__importDefault(__nccwpck_require__(2351));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var Negative = function (node) {
        this.value = node;
      };
      Negative.prototype = Object.assign(new node_1.default(), {
        type: "Negative",
        genCSS: function (context, output) {
          output.add("-");
          this.value.genCSS(context, output);
        },
        eval: function (context) {
          if (context.isMathOn()) {
            return new operation_1.default("*", [
              new dimension_1.default(-1),
              this.value,
            ]).eval(context);
          }
          return new Negative(this.value.eval(context));
        },
      });
      exports["default"] = Negative;
    },
    8096: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var value_1 = tslib_1.__importDefault(__nccwpck_require__(6551));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var expression_1 = tslib_1.__importDefault(__nccwpck_require__(966));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var NestableAtRulePrototype = {
        isRulesetLike: function () {
          return true;
        },
        accept: function (visitor) {
          if (this.features) {
            this.features = visitor.visit(this.features);
          }
          if (this.rules) {
            this.rules = visitor.visitArray(this.rules);
          }
        },
        evalTop: function (context) {
          var result = this;
          if (context.mediaBlocks.length > 1) {
            var selectors = new selector_1.default(
              [],
              null,
              null,
              this.getIndex(),
              this.fileInfo(),
            ).createEmptySelectors();
            result = new ruleset_1.default(selectors, context.mediaBlocks);
            result.multiMedia = true;
            result.copyVisibilityInfo(this.visibilityInfo());
            this.setParent(result, this);
          }
          delete context.mediaBlocks;
          delete context.mediaPath;
          return result;
        },
        evalNested: function (context) {
          var i;
          var value;
          var path = context.mediaPath.concat([this]);
          for (i = 0; i < path.length; i++) {
            if (path[i].type !== this.type) {
              context.mediaBlocks.splice(i, 1);
              return this;
            }
            value =
              path[i].features instanceof value_1.default
                ? path[i].features.value
                : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
          }
          this.features = new value_1.default(
            this.permute(path).map(function (path) {
              path = path.map(function (fragment) {
                return fragment.toCSS
                  ? fragment
                  : new anonymous_1.default(fragment);
              });
              for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new anonymous_1.default("and"));
              }
              return new expression_1.default(path);
            }),
          );
          this.setParent(this.features, this);
          return new ruleset_1.default([], []);
        },
        permute: function (arr) {
          if (arr.length === 0) {
            return [];
          } else if (arr.length === 1) {
            return arr[0];
          } else {
            var result = [];
            var rest = this.permute(arr.slice(1));
            for (var i = 0; i < rest.length; i++) {
              for (var j = 0; j < arr[0].length; j++) {
                result.push([arr[0][j]].concat(rest[i]));
              }
            }
            return result;
          }
        },
        bubbleSelectors: function (selectors) {
          if (!selectors) {
            return;
          }
          this.rules = [
            new ruleset_1.default(utils.copyArray(selectors), [this.rules[0]]),
          ];
          this.setParent(this.rules, this);
        },
      };
      exports["default"] = NestableAtRulePrototype;
    },
    5208: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var Node = (function () {
        function Node() {
          this.parent = null;
          this.visibilityBlocks = undefined;
          this.nodeVisible = undefined;
          this.rootNode = null;
          this.parsed = null;
        }
        Object.defineProperty(Node.prototype, "currentFileInfo", {
          get: function () {
            return this.fileInfo();
          },
          enumerable: false,
          configurable: true,
        });
        Object.defineProperty(Node.prototype, "index", {
          get: function () {
            return this.getIndex();
          },
          enumerable: false,
          configurable: true,
        });
        Node.prototype.setParent = function (nodes, parent) {
          function set(node) {
            if (node && node instanceof Node) {
              node.parent = parent;
            }
          }
          if (Array.isArray(nodes)) {
            nodes.forEach(set);
          } else {
            set(nodes);
          }
        };
        Node.prototype.getIndex = function () {
          return this._index || (this.parent && this.parent.getIndex()) || 0;
        };
        Node.prototype.fileInfo = function () {
          return (
            this._fileInfo || (this.parent && this.parent.fileInfo()) || {}
          );
        };
        Node.prototype.isRulesetLike = function () {
          return false;
        };
        Node.prototype.toCSS = function (context) {
          var strs = [];
          this.genCSS(context, {
            add: function (chunk, fileInfo, index) {
              strs.push(chunk);
            },
            isEmpty: function () {
              return strs.length === 0;
            },
          });
          return strs.join("");
        };
        Node.prototype.genCSS = function (context, output) {
          output.add(this.value);
        };
        Node.prototype.accept = function (visitor) {
          this.value = visitor.visit(this.value);
        };
        Node.prototype.eval = function () {
          return this;
        };
        Node.prototype._operate = function (context, op, a, b) {
          switch (op) {
            case "+":
              return a + b;
            case "-":
              return a - b;
            case "*":
              return a * b;
            case "/":
              return a / b;
          }
        };
        Node.prototype.fround = function (context, value) {
          var precision = context && context.numPrecision;
          return precision ? Number((value + 2e-16).toFixed(precision)) : value;
        };
        Node.compare = function (a, b) {
          if (a.compare && !(b.type === "Quoted" || b.type === "Anonymous")) {
            return a.compare(b);
          } else if (b.compare) {
            return -b.compare(a);
          } else if (a.type !== b.type) {
            return undefined;
          }
          a = a.value;
          b = b.value;
          if (!Array.isArray(a)) {
            return a === b ? 0 : undefined;
          }
          if (a.length !== b.length) {
            return undefined;
          }
          for (var i = 0; i < a.length; i++) {
            if (Node.compare(a[i], b[i]) !== 0) {
              return undefined;
            }
          }
          return 0;
        };
        Node.numericCompare = function (a, b) {
          return a < b ? -1 : a === b ? 0 : a > b ? 1 : undefined;
        };
        Node.prototype.blocksVisibility = function () {
          if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
          }
          return this.visibilityBlocks !== 0;
        };
        Node.prototype.addVisibilityBlock = function () {
          if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
          }
          this.visibilityBlocks = this.visibilityBlocks + 1;
        };
        Node.prototype.removeVisibilityBlock = function () {
          if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
          }
          this.visibilityBlocks = this.visibilityBlocks - 1;
        };
        Node.prototype.ensureVisibility = function () {
          this.nodeVisible = true;
        };
        Node.prototype.ensureInvisibility = function () {
          this.nodeVisible = false;
        };
        Node.prototype.isVisible = function () {
          return this.nodeVisible;
        };
        Node.prototype.visibilityInfo = function () {
          return {
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible,
          };
        };
        Node.prototype.copyVisibilityInfo = function (info) {
          if (!info) {
            return;
          }
          this.visibilityBlocks = info.visibilityBlocks;
          this.nodeVisible = info.nodeVisible;
        };
        return Node;
      })();
      exports["default"] = Node;
    },
    2351: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var color_1 = tslib_1.__importDefault(__nccwpck_require__(6325));
      var dimension_1 = tslib_1.__importDefault(__nccwpck_require__(2254));
      var Constants = tslib_1.__importStar(__nccwpck_require__(3664));
      var MATH = Constants.Math;
      var Operation = function (op, operands, isSpaced) {
        this.op = op.trim();
        this.operands = operands;
        this.isSpaced = isSpaced;
      };
      Operation.prototype = Object.assign(new node_1.default(), {
        type: "Operation",
        accept: function (visitor) {
          this.operands = visitor.visitArray(this.operands);
        },
        eval: function (context) {
          var a = this.operands[0].eval(context),
            b = this.operands[1].eval(context),
            op;
          if (context.isMathOn(this.op)) {
            op = this.op === "./" ? "/" : this.op;
            if (
              a instanceof dimension_1.default &&
              b instanceof color_1.default
            ) {
              a = a.toColor();
            }
            if (
              b instanceof dimension_1.default &&
              a instanceof color_1.default
            ) {
              b = b.toColor();
            }
            if (!a.operate || !b.operate) {
              if (
                (a instanceof Operation || b instanceof Operation) &&
                a.op === "/" &&
                context.math === MATH.PARENS_DIVISION
              ) {
                return new Operation(this.op, [a, b], this.isSpaced);
              }
              throw {
                type: "Operation",
                message: "Operation on an invalid type",
              };
            }
            return a.operate(context, op, b);
          } else {
            return new Operation(this.op, [a, b], this.isSpaced);
          }
        },
        genCSS: function (context, output) {
          this.operands[0].genCSS(context, output);
          if (this.isSpaced) {
            output.add(" ");
          }
          output.add(this.op);
          if (this.isSpaced) {
            output.add(" ");
          }
          this.operands[1].genCSS(context, output);
        },
      });
      exports["default"] = Operation;
    },
    9270: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Paren = function (node) {
        this.value = node;
      };
      Paren.prototype = Object.assign(new node_1.default(), {
        type: "Paren",
        genCSS: function (context, output) {
          output.add("(");
          this.value.genCSS(context, output);
          output.add(")");
        },
        eval: function (context) {
          return new Paren(this.value.eval(context));
        },
      });
      exports["default"] = Paren;
    },
    7957: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var Property = function (name, index, currentFileInfo) {
        this.name = name;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Property.prototype = Object.assign(new node_1.default(), {
        type: "Property",
        eval: function (context) {
          var property;
          var name = this.name;
          var mergeRules =
            context.pluginManager.less.visitors.ToCSSVisitor.prototype
              ._mergeRules;
          if (this.evaluating) {
            throw {
              type: "Name",
              message: "Recursive property reference for ".concat(name),
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
          this.evaluating = true;
          property = this.find(context.frames, function (frame) {
            var v;
            var vArr = frame.property(name);
            if (vArr) {
              for (var i = 0; i < vArr.length; i++) {
                v = vArr[i];
                vArr[i] = new declaration_1.default(
                  v.name,
                  v.value,
                  v.important,
                  v.merge,
                  v.index,
                  v.currentFileInfo,
                  v.inline,
                  v.variable,
                );
              }
              mergeRules(vArr);
              v = vArr[vArr.length - 1];
              if (v.important) {
                var importantScope =
                  context.importantScope[context.importantScope.length - 1];
                importantScope.important = v.important;
              }
              v = v.value.eval(context);
              return v;
            }
          });
          if (property) {
            this.evaluating = false;
            return property;
          } else {
            throw {
              type: "Name",
              message: "Property '".concat(name, "' is undefined"),
              filename: this.currentFileInfo.filename,
              index: this.index,
            };
          }
        },
        find: function (obj, fun) {
          for (var i = 0, r = void 0; i < obj.length; i++) {
            r = fun.call(obj, obj[i]);
            if (r) {
              return r;
            }
          }
          return null;
        },
      });
      exports["default"] = Property;
    },
    6320: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var copy_anything_1 = __nccwpck_require__(9694);
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var QueryInParens = function (op, l, m, op2, r, i) {
        this.op = op.trim();
        this.lvalue = l;
        this.mvalue = m;
        this.op2 = op2 ? op2.trim() : null;
        this.rvalue = r;
        this._index = i;
        this.mvalues = [];
      };
      QueryInParens.prototype = Object.assign(new node_1.default(), {
        type: "QueryInParens",
        accept: function (visitor) {
          this.lvalue = visitor.visit(this.lvalue);
          this.mvalue = visitor.visit(this.mvalue);
          if (this.rvalue) {
            this.rvalue = visitor.visit(this.rvalue);
          }
        },
        eval: function (context) {
          this.lvalue = this.lvalue.eval(context);
          var variableDeclaration;
          var rule;
          for (var i = 0; (rule = context.frames[i]); i++) {
            if (rule.type === "Ruleset") {
              variableDeclaration = rule.rules.find(function (r) {
                if (r instanceof declaration_1.default && r.variable) {
                  return true;
                }
                return false;
              });
              if (variableDeclaration) {
                break;
              }
            }
          }
          if (!this.mvalueCopy) {
            this.mvalueCopy = (0, copy_anything_1.copy)(this.mvalue);
          }
          if (variableDeclaration) {
            this.mvalue = this.mvalueCopy;
            this.mvalue = this.mvalue.eval(context);
            this.mvalues.push(this.mvalue);
          } else {
            this.mvalue = this.mvalue.eval(context);
          }
          if (this.rvalue) {
            this.rvalue = this.rvalue.eval(context);
          }
          return this;
        },
        genCSS: function (context, output) {
          this.lvalue.genCSS(context, output);
          output.add(" " + this.op + " ");
          if (this.mvalues.length > 0) {
            this.mvalue = this.mvalues.shift();
          }
          this.mvalue.genCSS(context, output);
          if (this.rvalue) {
            output.add(" " + this.op2 + " ");
            this.rvalue.genCSS(context, output);
          }
        },
      });
      exports["default"] = QueryInParens;
    },
    5920: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var property_1 = tslib_1.__importDefault(__nccwpck_require__(7957));
      var Quoted = function (str, content, escaped, index, currentFileInfo) {
        this.escaped = escaped === undefined ? true : escaped;
        this.value = content || "";
        this.quote = str.charAt(0);
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.variableRegex = /@\{([\w-]+)\}/g;
        this.propRegex = /\$\{([\w-]+)\}/g;
        this.allowRoot = escaped;
      };
      Quoted.prototype = Object.assign(new node_1.default(), {
        type: "Quoted",
        genCSS: function (context, output) {
          if (!this.escaped) {
            output.add(this.quote, this.fileInfo(), this.getIndex());
          }
          output.add(this.value);
          if (!this.escaped) {
            output.add(this.quote);
          }
        },
        containsVariables: function () {
          return this.value.match(this.variableRegex);
        },
        eval: function (context) {
          var that = this;
          var value = this.value;
          var variableReplacement = function (_, name1, name2) {
            var v = new variable_1.default(
              "@".concat(name1 !== null && name1 !== void 0 ? name1 : name2),
              that.getIndex(),
              that.fileInfo(),
            ).eval(context, true);
            return v instanceof Quoted ? v.value : v.toCSS();
          };
          var propertyReplacement = function (_, name1, name2) {
            var v = new property_1.default(
              "$".concat(name1 !== null && name1 !== void 0 ? name1 : name2),
              that.getIndex(),
              that.fileInfo(),
            ).eval(context, true);
            return v instanceof Quoted ? v.value : v.toCSS();
          };
          function iterativeReplace(value, regexp, replacementFnc) {
            var evaluatedValue = value;
            do {
              value = evaluatedValue.toString();
              evaluatedValue = value.replace(regexp, replacementFnc);
            } while (value !== evaluatedValue);
            return evaluatedValue;
          }
          value = iterativeReplace(
            value,
            this.variableRegex,
            variableReplacement,
          );
          value = iterativeReplace(value, this.propRegex, propertyReplacement);
          return new Quoted(
            this.quote + value + this.quote,
            value,
            this.escaped,
            this.getIndex(),
            this.fileInfo(),
          );
        },
        compare: function (other) {
          if (other.type === "Quoted" && !this.escaped && !other.escaped) {
            return node_1.default.numericCompare(this.value, other.value);
          } else {
            return other.toCSS && this.toCSS() === other.toCSS()
              ? 0
              : undefined;
          }
        },
      });
      exports["default"] = Quoted;
    },
    7152: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var declaration_1 = tslib_1.__importDefault(__nccwpck_require__(5998));
      var keyword_1 = tslib_1.__importDefault(__nccwpck_require__(2113));
      var comment_1 = tslib_1.__importDefault(__nccwpck_require__(6435));
      var paren_1 = tslib_1.__importDefault(__nccwpck_require__(9270));
      var selector_1 = tslib_1.__importDefault(__nccwpck_require__(7149));
      var element_1 = tslib_1.__importDefault(__nccwpck_require__(7974));
      var anonymous_1 = tslib_1.__importDefault(__nccwpck_require__(5571));
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var function_registry_1 = tslib_1.__importDefault(
        __nccwpck_require__(3247),
      );
      var default_1 = tslib_1.__importDefault(__nccwpck_require__(2614));
      var debug_info_1 = tslib_1.__importDefault(__nccwpck_require__(8182));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var parser_1 = tslib_1.__importDefault(__nccwpck_require__(7613));
      var Ruleset = function (selectors, rules, strictImports, visibilityInfo) {
        this.selectors = selectors;
        this.rules = rules;
        this._lookups = {};
        this._variables = null;
        this._properties = null;
        this.strictImports = strictImports;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(this.selectors, this);
        this.setParent(this.rules, this);
      };
      Ruleset.prototype = Object.assign(new node_1.default(), {
        type: "Ruleset",
        isRuleset: true,
        isRulesetLike: function () {
          return true;
        },
        accept: function (visitor) {
          if (this.paths) {
            this.paths = visitor.visitArray(this.paths, true);
          } else if (this.selectors) {
            this.selectors = visitor.visitArray(this.selectors);
          }
          if (this.rules && this.rules.length) {
            this.rules = visitor.visitArray(this.rules);
          }
        },
        eval: function (context) {
          var selectors;
          var selCnt;
          var selector;
          var i;
          var hasVariable;
          var hasOnePassingSelector = false;
          if (this.selectors && (selCnt = this.selectors.length)) {
            selectors = new Array(selCnt);
            default_1.default.error({
              type: "Syntax",
              message:
                "it is currently only allowed in parametric mixin guards,",
            });
            for (i = 0; i < selCnt; i++) {
              selector = this.selectors[i].eval(context);
              for (var j = 0; j < selector.elements.length; j++) {
                if (selector.elements[j].isVariable) {
                  hasVariable = true;
                  break;
                }
              }
              selectors[i] = selector;
              if (selector.evaldCondition) {
                hasOnePassingSelector = true;
              }
            }
            if (hasVariable) {
              var toParseSelectors = new Array(selCnt);
              for (i = 0; i < selCnt; i++) {
                selector = selectors[i];
                toParseSelectors[i] = selector.toCSS(context);
              }
              var startingIndex = selectors[0].getIndex();
              var selectorFileInfo = selectors[0].fileInfo();
              new parser_1.default(
                context,
                this.parse.importManager,
                selectorFileInfo,
                startingIndex,
              ).parseNode(
                toParseSelectors.join(","),
                ["selectors"],
                function (err, result) {
                  if (result) {
                    selectors = utils.flattenArray(result);
                  }
                },
              );
            }
            default_1.default.reset();
          } else {
            hasOnePassingSelector = true;
          }
          var rules = this.rules ? utils.copyArray(this.rules) : null;
          var ruleset = new Ruleset(
            selectors,
            rules,
            this.strictImports,
            this.visibilityInfo(),
          );
          var rule;
          var subRule;
          ruleset.originalRuleset = this;
          ruleset.root = this.root;
          ruleset.firstRoot = this.firstRoot;
          ruleset.allowImports = this.allowImports;
          if (this.debugInfo) {
            ruleset.debugInfo = this.debugInfo;
          }
          if (!hasOnePassingSelector) {
            rules.length = 0;
          }
          ruleset.functionRegistry = (function (frames) {
            var i = 0;
            var n = frames.length;
            var found;
            for (; i !== n; ++i) {
              found = frames[i].functionRegistry;
              if (found) {
                return found;
              }
            }
            return function_registry_1.default;
          })(context.frames).inherit();
          var ctxFrames = context.frames;
          ctxFrames.unshift(ruleset);
          var ctxSelectors = context.selectors;
          if (!ctxSelectors) {
            context.selectors = ctxSelectors = [];
          }
          ctxSelectors.unshift(this.selectors);
          if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
            ruleset.evalImports(context);
          }
          var rsRules = ruleset.rules;
          for (i = 0; (rule = rsRules[i]); i++) {
            if (rule.evalFirst) {
              rsRules[i] = rule.eval(context);
            }
          }
          var mediaBlockCount =
            (context.mediaBlocks && context.mediaBlocks.length) || 0;
          for (i = 0; (rule = rsRules[i]); i++) {
            if (rule.type === "MixinCall") {
              rules = rule.eval(context).filter(function (r) {
                if (r instanceof declaration_1.default && r.variable) {
                  return !ruleset.variable(r.name);
                }
                return true;
              });
              rsRules.splice.apply(rsRules, [i, 1].concat(rules));
              i += rules.length - 1;
              ruleset.resetCache();
            } else if (rule.type === "VariableCall") {
              rules = rule.eval(context).rules.filter(function (r) {
                if (r instanceof declaration_1.default && r.variable) {
                  return false;
                }
                return true;
              });
              rsRules.splice.apply(rsRules, [i, 1].concat(rules));
              i += rules.length - 1;
              ruleset.resetCache();
            }
          }
          for (i = 0; (rule = rsRules[i]); i++) {
            if (!rule.evalFirst) {
              rsRules[i] = rule = rule.eval ? rule.eval(context) : rule;
            }
          }
          for (i = 0; (rule = rsRules[i]); i++) {
            if (
              rule instanceof Ruleset &&
              rule.selectors &&
              rule.selectors.length === 1
            ) {
              if (
                rule.selectors[0] &&
                rule.selectors[0].isJustParentSelector()
              ) {
                rsRules.splice(i--, 1);
                for (var j = 0; (subRule = rule.rules[j]); j++) {
                  if (subRule instanceof node_1.default) {
                    subRule.copyVisibilityInfo(rule.visibilityInfo());
                    if (
                      !(subRule instanceof declaration_1.default) ||
                      !subRule.variable
                    ) {
                      rsRules.splice(++i, 0, subRule);
                    }
                  }
                }
              }
            }
          }
          ctxFrames.shift();
          ctxSelectors.shift();
          if (context.mediaBlocks) {
            for (i = mediaBlockCount; i < context.mediaBlocks.length; i++) {
              context.mediaBlocks[i].bubbleSelectors(selectors);
            }
          }
          return ruleset;
        },
        evalImports: function (context) {
          var rules = this.rules;
          var i;
          var importRules;
          if (!rules) {
            return;
          }
          for (i = 0; i < rules.length; i++) {
            if (rules[i].type === "Import") {
              importRules = rules[i].eval(context);
              if (
                importRules &&
                (importRules.length || importRules.length === 0)
              ) {
                rules.splice.apply(rules, [i, 1].concat(importRules));
                i += importRules.length - 1;
              } else {
                rules.splice(i, 1, importRules);
              }
              this.resetCache();
            }
          }
        },
        makeImportant: function () {
          var result = new Ruleset(
            this.selectors,
            this.rules.map(function (r) {
              if (r.makeImportant) {
                return r.makeImportant();
              } else {
                return r;
              }
            }),
            this.strictImports,
            this.visibilityInfo(),
          );
          return result;
        },
        matchArgs: function (args) {
          return !args || args.length === 0;
        },
        matchCondition: function (args, context) {
          var lastSelector = this.selectors[this.selectors.length - 1];
          if (!lastSelector.evaldCondition) {
            return false;
          }
          if (
            lastSelector.condition &&
            !lastSelector.condition.eval(
              new contexts_1.default.Eval(context, context.frames),
            )
          ) {
            return false;
          }
          return true;
        },
        resetCache: function () {
          this._rulesets = null;
          this._variables = null;
          this._properties = null;
          this._lookups = {};
        },
        variables: function () {
          if (!this._variables) {
            this._variables = !this.rules
              ? {}
              : this.rules.reduce(function (hash, r) {
                  if (
                    r instanceof declaration_1.default &&
                    r.variable === true
                  ) {
                    hash[r.name] = r;
                  }
                  if (r.type === "Import" && r.root && r.root.variables) {
                    var vars = r.root.variables();
                    for (var name_1 in vars) {
                      if (vars.hasOwnProperty(name_1)) {
                        hash[name_1] = r.root.variable(name_1);
                      }
                    }
                  }
                  return hash;
                }, {});
          }
          return this._variables;
        },
        properties: function () {
          if (!this._properties) {
            this._properties = !this.rules
              ? {}
              : this.rules.reduce(function (hash, r) {
                  if (
                    r instanceof declaration_1.default &&
                    r.variable !== true
                  ) {
                    var name_2 =
                      r.name.length === 1 &&
                      r.name[0] instanceof keyword_1.default
                        ? r.name[0].value
                        : r.name;
                    if (!hash["$".concat(name_2)]) {
                      hash["$".concat(name_2)] = [r];
                    } else {
                      hash["$".concat(name_2)].push(r);
                    }
                  }
                  return hash;
                }, {});
          }
          return this._properties;
        },
        variable: function (name) {
          var decl = this.variables()[name];
          if (decl) {
            return this.parseValue(decl);
          }
        },
        property: function (name) {
          var decl = this.properties()[name];
          if (decl) {
            return this.parseValue(decl);
          }
        },
        lastDeclaration: function () {
          for (var i = this.rules.length; i > 0; i--) {
            var decl = this.rules[i - 1];
            if (decl instanceof declaration_1.default) {
              return this.parseValue(decl);
            }
          }
        },
        parseValue: function (toParse) {
          var self = this;
          function transformDeclaration(decl) {
            if (decl.value instanceof anonymous_1.default && !decl.parsed) {
              if (typeof decl.value.value === "string") {
                new parser_1.default(
                  this.parse.context,
                  this.parse.importManager,
                  decl.fileInfo(),
                  decl.value.getIndex(),
                ).parseNode(
                  decl.value.value,
                  ["value", "important"],
                  function (err, result) {
                    if (err) {
                      decl.parsed = true;
                    }
                    if (result) {
                      decl.value = result[0];
                      decl.important = result[1] || "";
                      decl.parsed = true;
                    }
                  },
                );
              } else {
                decl.parsed = true;
              }
              return decl;
            } else {
              return decl;
            }
          }
          if (!Array.isArray(toParse)) {
            return transformDeclaration.call(self, toParse);
          } else {
            var nodes_1 = [];
            toParse.forEach(function (n) {
              nodes_1.push(transformDeclaration.call(self, n));
            });
            return nodes_1;
          }
        },
        rulesets: function () {
          if (!this.rules) {
            return [];
          }
          var filtRules = [];
          var rules = this.rules;
          var i;
          var rule;
          for (i = 0; (rule = rules[i]); i++) {
            if (rule.isRuleset) {
              filtRules.push(rule);
            }
          }
          return filtRules;
        },
        prependRule: function (rule) {
          var rules = this.rules;
          if (rules) {
            rules.unshift(rule);
          } else {
            this.rules = [rule];
          }
          this.setParent(rule, this);
        },
        find: function (selector, self, filter) {
          self = self || this;
          var rules = [];
          var match;
          var foundMixins;
          var key = selector.toCSS();
          if (key in this._lookups) {
            return this._lookups[key];
          }
          this.rulesets().forEach(function (rule) {
            if (rule !== self) {
              for (var j = 0; j < rule.selectors.length; j++) {
                match = selector.match(rule.selectors[j]);
                if (match) {
                  if (selector.elements.length > match) {
                    if (!filter || filter(rule)) {
                      foundMixins = rule.find(
                        new selector_1.default(selector.elements.slice(match)),
                        self,
                        filter,
                      );
                      for (var i = 0; i < foundMixins.length; ++i) {
                        foundMixins[i].path.push(rule);
                      }
                      Array.prototype.push.apply(rules, foundMixins);
                    }
                  } else {
                    rules.push({ rule, path: [] });
                  }
                  break;
                }
              }
            }
          });
          this._lookups[key] = rules;
          return rules;
        },
        genCSS: function (context, output) {
          var i;
          var j;
          var charsetRuleNodes = [];
          var ruleNodes = [];
          var debugInfo;
          var rule;
          var path;
          context.tabLevel = context.tabLevel || 0;
          if (!this.root) {
            context.tabLevel++;
          }
          var tabRuleStr = context.compress
            ? ""
            : Array(context.tabLevel + 1).join("  ");
          var tabSetStr = context.compress
            ? ""
            : Array(context.tabLevel).join("  ");
          var sep;
          var charsetNodeIndex = 0;
          var importNodeIndex = 0;
          for (i = 0; (rule = this.rules[i]); i++) {
            if (rule instanceof comment_1.default) {
              if (importNodeIndex === i) {
                importNodeIndex++;
              }
              ruleNodes.push(rule);
            } else if (rule.isCharset && rule.isCharset()) {
              ruleNodes.splice(charsetNodeIndex, 0, rule);
              charsetNodeIndex++;
              importNodeIndex++;
            } else if (rule.type === "Import") {
              ruleNodes.splice(importNodeIndex, 0, rule);
              importNodeIndex++;
            } else {
              ruleNodes.push(rule);
            }
          }
          ruleNodes = charsetRuleNodes.concat(ruleNodes);
          if (!this.root) {
            debugInfo = (0, debug_info_1.default)(context, this, tabSetStr);
            if (debugInfo) {
              output.add(debugInfo);
              output.add(tabSetStr);
            }
            var paths = this.paths;
            var pathCnt = paths.length;
            var pathSubCnt = void 0;
            sep = context.compress ? "," : ",\n".concat(tabSetStr);
            for (i = 0; i < pathCnt; i++) {
              path = paths[i];
              if (!(pathSubCnt = path.length)) {
                continue;
              }
              if (i > 0) {
                output.add(sep);
              }
              context.firstSelector = true;
              path[0].genCSS(context, output);
              context.firstSelector = false;
              for (j = 1; j < pathSubCnt; j++) {
                path[j].genCSS(context, output);
              }
            }
            output.add((context.compress ? "{" : " {\n") + tabRuleStr);
          }
          for (i = 0; (rule = ruleNodes[i]); i++) {
            if (i + 1 === ruleNodes.length) {
              context.lastRule = true;
            }
            var currentLastRule = context.lastRule;
            if (rule.isRulesetLike(rule)) {
              context.lastRule = false;
            }
            if (rule.genCSS) {
              rule.genCSS(context, output);
            } else if (rule.value) {
              output.add(rule.value.toString());
            }
            context.lastRule = currentLastRule;
            if (!context.lastRule && rule.isVisible()) {
              output.add(context.compress ? "" : "\n".concat(tabRuleStr));
            } else {
              context.lastRule = false;
            }
          }
          if (!this.root) {
            output.add(context.compress ? "}" : "\n".concat(tabSetStr, "}"));
            context.tabLevel--;
          }
          if (!output.isEmpty() && !context.compress && this.firstRoot) {
            output.add("\n");
          }
        },
        joinSelectors: function (paths, context, selectors) {
          for (var s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
          }
        },
        joinSelector: function (paths, context, selector) {
          function createParenthesis(elementsToPak, originalElement) {
            var replacementParen, j;
            if (elementsToPak.length === 0) {
              replacementParen = new paren_1.default(elementsToPak[0]);
            } else {
              var insideParent = new Array(elementsToPak.length);
              for (j = 0; j < elementsToPak.length; j++) {
                insideParent[j] = new element_1.default(
                  null,
                  elementsToPak[j],
                  originalElement.isVariable,
                  originalElement._index,
                  originalElement._fileInfo,
                );
              }
              replacementParen = new paren_1.default(
                new selector_1.default(insideParent),
              );
            }
            return replacementParen;
          }
          function createSelector(containedElement, originalElement) {
            var element, selector;
            element = new element_1.default(
              null,
              containedElement,
              originalElement.isVariable,
              originalElement._index,
              originalElement._fileInfo,
            );
            selector = new selector_1.default([element]);
            return selector;
          }
          function addReplacementIntoPath(
            beginningPath,
            addPath,
            replacedElement,
            originalSelector,
          ) {
            var newSelectorPath, lastSelector, newJoinedSelector;
            newSelectorPath = [];
            if (beginningPath.length > 0) {
              newSelectorPath = utils.copyArray(beginningPath);
              lastSelector = newSelectorPath.pop();
              newJoinedSelector = originalSelector.createDerived(
                utils.copyArray(lastSelector.elements),
              );
            } else {
              newJoinedSelector = originalSelector.createDerived([]);
            }
            if (addPath.length > 0) {
              var combinator = replacedElement.combinator;
              var parentEl = addPath[0].elements[0];
              if (
                combinator.emptyOrWhitespace &&
                !parentEl.combinator.emptyOrWhitespace
              ) {
                combinator = parentEl.combinator;
              }
              newJoinedSelector.elements.push(
                new element_1.default(
                  combinator,
                  parentEl.value,
                  replacedElement.isVariable,
                  replacedElement._index,
                  replacedElement._fileInfo,
                ),
              );
              newJoinedSelector.elements = newJoinedSelector.elements.concat(
                addPath[0].elements.slice(1),
              );
            }
            if (newJoinedSelector.elements.length !== 0) {
              newSelectorPath.push(newJoinedSelector);
            }
            if (addPath.length > 1) {
              var restOfPath = addPath.slice(1);
              restOfPath = restOfPath.map(function (selector) {
                return selector.createDerived(selector.elements, []);
              });
              newSelectorPath = newSelectorPath.concat(restOfPath);
            }
            return newSelectorPath;
          }
          function addAllReplacementsIntoPath(
            beginningPath,
            addPaths,
            replacedElement,
            originalSelector,
            result,
          ) {
            var j;
            for (j = 0; j < beginningPath.length; j++) {
              var newSelectorPath = addReplacementIntoPath(
                beginningPath[j],
                addPaths,
                replacedElement,
                originalSelector,
              );
              result.push(newSelectorPath);
            }
            return result;
          }
          function mergeElementsOnToSelectors(elements, selectors) {
            var i, sel;
            if (elements.length === 0) {
              return;
            }
            if (selectors.length === 0) {
              selectors.push([new selector_1.default(elements)]);
              return;
            }
            for (i = 0; (sel = selectors[i]); i++) {
              if (sel.length > 0) {
                sel[sel.length - 1] = sel[sel.length - 1].createDerived(
                  sel[sel.length - 1].elements.concat(elements),
                );
              } else {
                sel.push(new selector_1.default(elements));
              }
            }
          }
          function replaceParentSelector(paths, context, inSelector) {
            var i,
              j,
              k,
              currentElements,
              newSelectors,
              selectorsMultiplied,
              sel,
              el,
              hadParentSelector = false,
              length,
              lastSelector;
            function findNestedSelector(element) {
              var maybeSelector;
              if (!(element.value instanceof paren_1.default)) {
                return null;
              }
              maybeSelector = element.value.value;
              if (!(maybeSelector instanceof selector_1.default)) {
                return null;
              }
              return maybeSelector;
            }
            currentElements = [];
            newSelectors = [[]];
            for (i = 0; (el = inSelector.elements[i]); i++) {
              if (el.value !== "&") {
                var nestedSelector = findNestedSelector(el);
                if (nestedSelector !== null) {
                  mergeElementsOnToSelectors(currentElements, newSelectors);
                  var nestedPaths = [];
                  var replaced = void 0;
                  var replacedNewSelectors = [];
                  replaced = replaceParentSelector(
                    nestedPaths,
                    context,
                    nestedSelector,
                  );
                  hadParentSelector = hadParentSelector || replaced;
                  for (k = 0; k < nestedPaths.length; k++) {
                    var replacementSelector = createSelector(
                      createParenthesis(nestedPaths[k], el),
                      el,
                    );
                    addAllReplacementsIntoPath(
                      newSelectors,
                      [replacementSelector],
                      el,
                      inSelector,
                      replacedNewSelectors,
                    );
                  }
                  newSelectors = replacedNewSelectors;
                  currentElements = [];
                } else {
                  currentElements.push(el);
                }
              } else {
                hadParentSelector = true;
                selectorsMultiplied = [];
                mergeElementsOnToSelectors(currentElements, newSelectors);
                for (j = 0; j < newSelectors.length; j++) {
                  sel = newSelectors[j];
                  if (context.length === 0) {
                    if (sel.length > 0) {
                      sel[0].elements.push(
                        new element_1.default(
                          el.combinator,
                          "",
                          el.isVariable,
                          el._index,
                          el._fileInfo,
                        ),
                      );
                    }
                    selectorsMultiplied.push(sel);
                  } else {
                    for (k = 0; k < context.length; k++) {
                      var newSelectorPath = addReplacementIntoPath(
                        sel,
                        context[k],
                        el,
                        inSelector,
                      );
                      selectorsMultiplied.push(newSelectorPath);
                    }
                  }
                }
                newSelectors = selectorsMultiplied;
                currentElements = [];
              }
            }
            mergeElementsOnToSelectors(currentElements, newSelectors);
            for (i = 0; i < newSelectors.length; i++) {
              length = newSelectors[i].length;
              if (length > 0) {
                paths.push(newSelectors[i]);
                lastSelector = newSelectors[i][length - 1];
                newSelectors[i][length - 1] = lastSelector.createDerived(
                  lastSelector.elements,
                  inSelector.extendList,
                );
              }
            }
            return hadParentSelector;
          }
          function deriveSelector(visibilityInfo, deriveFrom) {
            var newSelector = deriveFrom.createDerived(
              deriveFrom.elements,
              deriveFrom.extendList,
              deriveFrom.evaldCondition,
            );
            newSelector.copyVisibilityInfo(visibilityInfo);
            return newSelector;
          }
          var i, newPaths, hadParentSelector;
          newPaths = [];
          hadParentSelector = replaceParentSelector(
            newPaths,
            context,
            selector,
          );
          if (!hadParentSelector) {
            if (context.length > 0) {
              newPaths = [];
              for (i = 0; i < context.length; i++) {
                var concatenated = context[i].map(
                  deriveSelector.bind(this, selector.visibilityInfo()),
                );
                concatenated.push(selector);
                newPaths.push(concatenated);
              }
            } else {
              newPaths = [[selector]];
            }
          }
          for (i = 0; i < newPaths.length; i++) {
            paths.push(newPaths[i]);
          }
        },
      });
      exports["default"] = Ruleset;
    },
    7149: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var element_1 = tslib_1.__importDefault(__nccwpck_require__(7974));
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var parser_1 = tslib_1.__importDefault(__nccwpck_require__(7613));
      var Selector = function (
        elements,
        extendList,
        condition,
        index,
        currentFileInfo,
        visibilityInfo,
      ) {
        this.extendList = extendList;
        this.condition = condition;
        this.evaldCondition = !condition;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.elements = this.getElements(elements);
        this.mixinElements_ = undefined;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.elements, this);
      };
      Selector.prototype = Object.assign(new node_1.default(), {
        type: "Selector",
        accept: function (visitor) {
          if (this.elements) {
            this.elements = visitor.visitArray(this.elements);
          }
          if (this.extendList) {
            this.extendList = visitor.visitArray(this.extendList);
          }
          if (this.condition) {
            this.condition = visitor.visit(this.condition);
          }
        },
        createDerived: function (elements, extendList, evaldCondition) {
          elements = this.getElements(elements);
          var newSelector = new Selector(
            elements,
            extendList || this.extendList,
            null,
            this.getIndex(),
            this.fileInfo(),
            this.visibilityInfo(),
          );
          newSelector.evaldCondition = !utils.isNullOrUndefined(evaldCondition)
            ? evaldCondition
            : this.evaldCondition;
          newSelector.mediaEmpty = this.mediaEmpty;
          return newSelector;
        },
        getElements: function (els) {
          if (!els) {
            return [
              new element_1.default(
                "",
                "&",
                false,
                this._index,
                this._fileInfo,
              ),
            ];
          }
          if (typeof els === "string") {
            new parser_1.default(
              this.parse.context,
              this.parse.importManager,
              this._fileInfo,
              this._index,
            ).parseNode(els, ["selector"], function (err, result) {
              if (err) {
                throw new less_error_1.default(
                  { index: err.index, message: err.message },
                  this.parse.imports,
                  this._fileInfo.filename,
                );
              }
              els = result[0].elements;
            });
          }
          return els;
        },
        createEmptySelectors: function () {
          var el = new element_1.default(
              "",
              "&",
              false,
              this._index,
              this._fileInfo,
            ),
            sels = [
              new Selector([el], null, null, this._index, this._fileInfo),
            ];
          sels[0].mediaEmpty = true;
          return sels;
        },
        match: function (other) {
          var elements = this.elements;
          var len = elements.length;
          var olen;
          var i;
          other = other.mixinElements();
          olen = other.length;
          if (olen === 0 || len < olen) {
            return 0;
          } else {
            for (i = 0; i < olen; i++) {
              if (elements[i].value !== other[i]) {
                return 0;
              }
            }
          }
          return olen;
        },
        mixinElements: function () {
          if (this.mixinElements_) {
            return this.mixinElements_;
          }
          var elements = this.elements
            .map(function (v) {
              return v.combinator.value + (v.value.value || v.value);
            })
            .join("")
            .match(/[,&#*.\w-]([\w-]|(\\.))*/g);
          if (elements) {
            if (elements[0] === "&") {
              elements.shift();
            }
          } else {
            elements = [];
          }
          return (this.mixinElements_ = elements);
        },
        isJustParentSelector: function () {
          return (
            !this.mediaEmpty &&
            this.elements.length === 1 &&
            this.elements[0].value === "&" &&
            (this.elements[0].combinator.value === " " ||
              this.elements[0].combinator.value === "")
          );
        },
        eval: function (context) {
          var evaldCondition = this.condition && this.condition.eval(context);
          var elements = this.elements;
          var extendList = this.extendList;
          elements =
            elements &&
            elements.map(function (e) {
              return e.eval(context);
            });
          extendList =
            extendList &&
            extendList.map(function (extend) {
              return extend.eval(context);
            });
          return this.createDerived(elements, extendList, evaldCondition);
        },
        genCSS: function (context, output) {
          var i, element;
          if (
            (!context || !context.firstSelector) &&
            this.elements[0].combinator.value === ""
          ) {
            output.add(" ", this.fileInfo(), this.getIndex());
          }
          for (i = 0; i < this.elements.length; i++) {
            element = this.elements[i];
            element.genCSS(context, output);
          }
        },
        getIsOutput: function () {
          return this.evaldCondition;
        },
      });
      exports["default"] = Selector;
    },
    5987: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var UnicodeDescriptor = function (value) {
        this.value = value;
      };
      UnicodeDescriptor.prototype = Object.assign(new node_1.default(), {
        type: "UnicodeDescriptor",
      });
      exports["default"] = UnicodeDescriptor;
    },
    8618: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var unit_conversions_1 = tslib_1.__importDefault(
        __nccwpck_require__(2074),
      );
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var Unit = function (numerator, denominator, backupUnit) {
        this.numerator = numerator ? utils.copyArray(numerator).sort() : [];
        this.denominator = denominator
          ? utils.copyArray(denominator).sort()
          : [];
        if (backupUnit) {
          this.backupUnit = backupUnit;
        } else if (numerator && numerator.length) {
          this.backupUnit = numerator[0];
        }
      };
      Unit.prototype = Object.assign(new node_1.default(), {
        type: "Unit",
        clone: function () {
          return new Unit(
            utils.copyArray(this.numerator),
            utils.copyArray(this.denominator),
            this.backupUnit,
          );
        },
        genCSS: function (context, output) {
          var strictUnits = context && context.strictUnits;
          if (this.numerator.length === 1) {
            output.add(this.numerator[0]);
          } else if (!strictUnits && this.backupUnit) {
            output.add(this.backupUnit);
          } else if (!strictUnits && this.denominator.length) {
            output.add(this.denominator[0]);
          }
        },
        toString: function () {
          var i,
            returnStr = this.numerator.join("*");
          for (i = 0; i < this.denominator.length; i++) {
            returnStr += "/".concat(this.denominator[i]);
          }
          return returnStr;
        },
        compare: function (other) {
          return this.is(other.toString()) ? 0 : undefined;
        },
        is: function (unitString) {
          return this.toString().toUpperCase() === unitString.toUpperCase();
        },
        isLength: function () {
          return RegExp(
            "^(px|em|ex|ch|rem|in|cm|mm|pc|pt|ex|vw|vh|vmin|vmax)$",
            "gi",
          ).test(this.toCSS());
        },
        isEmpty: function () {
          return this.numerator.length === 0 && this.denominator.length === 0;
        },
        isSingular: function () {
          return this.numerator.length <= 1 && this.denominator.length === 0;
        },
        map: function (callback) {
          var i;
          for (i = 0; i < this.numerator.length; i++) {
            this.numerator[i] = callback(this.numerator[i], false);
          }
          for (i = 0; i < this.denominator.length; i++) {
            this.denominator[i] = callback(this.denominator[i], true);
          }
        },
        usedUnits: function () {
          var group;
          var result = {};
          var mapUnit;
          var groupName;
          mapUnit = function (atomicUnit) {
            if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
              result[groupName] = atomicUnit;
            }
            return atomicUnit;
          };
          for (groupName in unit_conversions_1.default) {
            if (unit_conversions_1.default.hasOwnProperty(groupName)) {
              group = unit_conversions_1.default[groupName];
              this.map(mapUnit);
            }
          }
          return result;
        },
        cancel: function () {
          var counter = {};
          var atomicUnit;
          var i;
          for (i = 0; i < this.numerator.length; i++) {
            atomicUnit = this.numerator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
          }
          for (i = 0; i < this.denominator.length; i++) {
            atomicUnit = this.denominator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
          }
          this.numerator = [];
          this.denominator = [];
          for (atomicUnit in counter) {
            if (counter.hasOwnProperty(atomicUnit)) {
              var count = counter[atomicUnit];
              if (count > 0) {
                for (i = 0; i < count; i++) {
                  this.numerator.push(atomicUnit);
                }
              } else if (count < 0) {
                for (i = 0; i < -count; i++) {
                  this.denominator.push(atomicUnit);
                }
              }
            }
          }
          this.numerator.sort();
          this.denominator.sort();
        },
      });
      exports["default"] = Unit;
    },
    595: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      function escapePath(path) {
        return path.replace(/[()'"\s]/g, function (match) {
          return "\\".concat(match);
        });
      }
      var URL = function (val, index, currentFileInfo, isEvald) {
        this.value = val;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.isEvald = isEvald;
      };
      URL.prototype = Object.assign(new node_1.default(), {
        type: "Url",
        accept: function (visitor) {
          this.value = visitor.visit(this.value);
        },
        genCSS: function (context, output) {
          output.add("url(");
          this.value.genCSS(context, output);
          output.add(")");
        },
        eval: function (context) {
          var val = this.value.eval(context);
          var rootpath;
          if (!this.isEvald) {
            rootpath = this.fileInfo() && this.fileInfo().rootpath;
            if (
              typeof rootpath === "string" &&
              typeof val.value === "string" &&
              context.pathRequiresRewrite(val.value)
            ) {
              if (!val.quote) {
                rootpath = escapePath(rootpath);
              }
              val.value = context.rewritePath(val.value, rootpath);
            } else {
              val.value = context.normalizePath(val.value);
            }
            if (context.urlArgs) {
              if (!val.value.match(/^\s*data:/)) {
                var delimiter = val.value.indexOf("?") === -1 ? "?" : "&";
                var urlArgs = delimiter + context.urlArgs;
                if (val.value.indexOf("#") !== -1) {
                  val.value = val.value.replace("#", "".concat(urlArgs, "#"));
                } else {
                  val.value += urlArgs;
                }
              }
            }
          }
          return new URL(val, this.getIndex(), this.fileInfo(), true);
        },
      });
      exports["default"] = URL;
    },
    6551: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var Value = function (value) {
        if (!value) {
          throw new Error("Value requires an array argument");
        }
        if (!Array.isArray(value)) {
          this.value = [value];
        } else {
          this.value = value;
        }
      };
      Value.prototype = Object.assign(new node_1.default(), {
        type: "Value",
        accept: function (visitor) {
          if (this.value) {
            this.value = visitor.visitArray(this.value);
          }
        },
        eval: function (context) {
          if (this.value.length === 1) {
            return this.value[0].eval(context);
          } else {
            return new Value(
              this.value.map(function (v) {
                return v.eval(context);
              }),
            );
          }
        },
        genCSS: function (context, output) {
          var i;
          for (i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (i + 1 < this.value.length) {
              output.add(context && context.compress ? "," : ", ");
            }
          }
        },
      });
      exports["default"] = Value;
    },
    1253: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var variable_1 = tslib_1.__importDefault(__nccwpck_require__(3380));
      var ruleset_1 = tslib_1.__importDefault(__nccwpck_require__(7152));
      var detached_ruleset_1 = tslib_1.__importDefault(
        __nccwpck_require__(4393),
      );
      var less_error_1 = tslib_1.__importDefault(__nccwpck_require__(4971));
      var VariableCall = function (variable, index, currentFileInfo) {
        this.variable = variable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
      };
      VariableCall.prototype = Object.assign(new node_1.default(), {
        type: "VariableCall",
        eval: function (context) {
          var rules;
          var detachedRuleset = new variable_1.default(
            this.variable,
            this.getIndex(),
            this.fileInfo(),
          ).eval(context);
          var error = new less_error_1.default({
            message: "Could not evaluate variable call ".concat(this.variable),
          });
          if (!detachedRuleset.ruleset) {
            if (detachedRuleset.rules) {
              rules = detachedRuleset;
            } else if (Array.isArray(detachedRuleset)) {
              rules = new ruleset_1.default("", detachedRuleset);
            } else if (Array.isArray(detachedRuleset.value)) {
              rules = new ruleset_1.default("", detachedRuleset.value);
            } else {
              throw error;
            }
            detachedRuleset = new detached_ruleset_1.default(rules);
          }
          if (detachedRuleset.ruleset) {
            return detachedRuleset.callEval(context);
          }
          throw error;
        },
      });
      exports["default"] = VariableCall;
    },
    3380: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var node_1 = tslib_1.__importDefault(__nccwpck_require__(5208));
      var call_1 = tslib_1.__importDefault(__nccwpck_require__(3256));
      var Variable = function (name, index, currentFileInfo) {
        this.name = name;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Variable.prototype = Object.assign(new node_1.default(), {
        type: "Variable",
        eval: function (context) {
          var variable,
            name = this.name;
          if (name.indexOf("@@") === 0) {
            name = "@".concat(
              new Variable(
                name.slice(1),
                this.getIndex(),
                this.fileInfo(),
              ).eval(context).value,
            );
          }
          if (this.evaluating) {
            throw {
              type: "Name",
              message: "Recursive variable definition for ".concat(name),
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
          this.evaluating = true;
          variable = this.find(context.frames, function (frame) {
            var v = frame.variable(name);
            if (v) {
              if (v.important) {
                var importantScope =
                  context.importantScope[context.importantScope.length - 1];
                importantScope.important = v.important;
              }
              if (context.inCalc) {
                return new call_1.default("_SELF", [v.value]).eval(context);
              } else {
                return v.value.eval(context);
              }
            }
          });
          if (variable) {
            this.evaluating = false;
            return variable;
          } else {
            throw {
              type: "Name",
              message: "variable ".concat(name, " is undefined"),
              filename: this.fileInfo().filename,
              index: this.getIndex(),
            };
          }
        },
        find: function (obj, fun) {
          for (var i = 0, r = void 0; i < obj.length; i++) {
            r = fun.call(obj, obj[i]);
            if (r) {
              return r;
            }
          }
          return null;
        },
      });
      exports["default"] = Variable;
    },
    3876: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.isNullOrUndefined =
        exports.flattenArray =
        exports.merge =
        exports.copyOptions =
        exports.defaults =
        exports.clone =
        exports.copyArray =
        exports.getLocation =
          void 0;
      var tslib_1 = __nccwpck_require__(5477);
      var Constants = tslib_1.__importStar(__nccwpck_require__(3664));
      var copy_anything_1 = __nccwpck_require__(9694);
      function getLocation(index, inputStream) {
        var n = index + 1;
        var line = null;
        var column = -1;
        while (--n >= 0 && inputStream.charAt(n) !== "\n") {
          column++;
        }
        if (typeof index === "number") {
          line = (inputStream.slice(0, index).match(/\n/g) || "").length;
        }
        return { line, column };
      }
      exports.getLocation = getLocation;
      function copyArray(arr) {
        var i;
        var length = arr.length;
        var copy = new Array(length);
        for (i = 0; i < length; i++) {
          copy[i] = arr[i];
        }
        return copy;
      }
      exports.copyArray = copyArray;
      function clone(obj) {
        var cloned = {};
        for (var prop in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            cloned[prop] = obj[prop];
          }
        }
        return cloned;
      }
      exports.clone = clone;
      function defaults(obj1, obj2) {
        var newObj = obj2 || {};
        if (!obj2._defaults) {
          newObj = {};
          var defaults_1 = (0, copy_anything_1.copy)(obj1);
          newObj._defaults = defaults_1;
          var cloned = obj2 ? (0, copy_anything_1.copy)(obj2) : {};
          Object.assign(newObj, defaults_1, cloned);
        }
        return newObj;
      }
      exports.defaults = defaults;
      function copyOptions(obj1, obj2) {
        if (obj2 && obj2._defaults) {
          return obj2;
        }
        var opts = defaults(obj1, obj2);
        if (opts.strictMath) {
          opts.math = Constants.Math.PARENS;
        }
        if (opts.relativeUrls) {
          opts.rewriteUrls = Constants.RewriteUrls.ALL;
        }
        if (typeof opts.math === "string") {
          switch (opts.math.toLowerCase()) {
            case "always":
              opts.math = Constants.Math.ALWAYS;
              break;
            case "parens-division":
              opts.math = Constants.Math.PARENS_DIVISION;
              break;
            case "strict":
            case "parens":
              opts.math = Constants.Math.PARENS;
              break;
            default:
              opts.math = Constants.Math.PARENS;
          }
        }
        if (typeof opts.rewriteUrls === "string") {
          switch (opts.rewriteUrls.toLowerCase()) {
            case "off":
              opts.rewriteUrls = Constants.RewriteUrls.OFF;
              break;
            case "local":
              opts.rewriteUrls = Constants.RewriteUrls.LOCAL;
              break;
            case "all":
              opts.rewriteUrls = Constants.RewriteUrls.ALL;
              break;
          }
        }
        return opts;
      }
      exports.copyOptions = copyOptions;
      function merge(obj1, obj2) {
        for (var prop in obj2) {
          if (Object.prototype.hasOwnProperty.call(obj2, prop)) {
            obj1[prop] = obj2[prop];
          }
        }
        return obj1;
      }
      exports.merge = merge;
      function flattenArray(arr, result) {
        if (result === void 0) {
          result = [];
        }
        for (var i = 0, length_1 = arr.length; i < length_1; i++) {
          var value = arr[i];
          if (Array.isArray(value)) {
            flattenArray(value, result);
          } else {
            if (value !== undefined) {
              result.push(value);
            }
          }
        }
        return result;
      }
      exports.flattenArray = flattenArray;
      function isNullOrUndefined(val) {
        return val === null || val === undefined;
      }
      exports.isNullOrUndefined = isNullOrUndefined;
    },
    4862: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      var visitor_1 = tslib_1.__importDefault(__nccwpck_require__(1807));
      var logger_1 = tslib_1.__importDefault(__nccwpck_require__(1625));
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var ExtendFinderVisitor = (function () {
        function ExtendFinderVisitor() {
          this._visitor = new visitor_1.default(this);
          this.contexts = [];
          this.allExtendsStack = [[]];
        }
        ExtendFinderVisitor.prototype.run = function (root) {
          root = this._visitor.visit(root);
          root.allExtends = this.allExtendsStack[0];
          return root;
        };
        ExtendFinderVisitor.prototype.visitDeclaration = function (
          declNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        ExtendFinderVisitor.prototype.visitMixinDefinition = function (
          mixinDefinitionNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        ExtendFinderVisitor.prototype.visitRuleset = function (
          rulesetNode,
          visitArgs,
        ) {
          if (rulesetNode.root) {
            return;
          }
          var i;
          var j;
          var extend;
          var allSelectorsExtendList = [];
          var extendList;
          var rules = rulesetNode.rules,
            ruleCnt = rules ? rules.length : 0;
          for (i = 0; i < ruleCnt; i++) {
            if (rulesetNode.rules[i] instanceof tree_1.default.Extend) {
              allSelectorsExtendList.push(rules[i]);
              rulesetNode.extendOnEveryPath = true;
            }
          }
          var paths = rulesetNode.paths;
          for (i = 0; i < paths.length; i++) {
            var selectorPath = paths[i],
              selector = selectorPath[selectorPath.length - 1],
              selExtendList = selector.extendList;
            extendList = selExtendList
              ? utils.copyArray(selExtendList).concat(allSelectorsExtendList)
              : allSelectorsExtendList;
            if (extendList) {
              extendList = extendList.map(function (allSelectorsExtend) {
                return allSelectorsExtend.clone();
              });
            }
            for (j = 0; j < extendList.length; j++) {
              this.foundExtends = true;
              extend = extendList[j];
              extend.findSelfSelectors(selectorPath);
              extend.ruleset = rulesetNode;
              if (j === 0) {
                extend.firstExtendOnThisSelectorPath = true;
              }
              this.allExtendsStack[this.allExtendsStack.length - 1].push(
                extend,
              );
            }
          }
          this.contexts.push(rulesetNode.selectors);
        };
        ExtendFinderVisitor.prototype.visitRulesetOut = function (rulesetNode) {
          if (!rulesetNode.root) {
            this.contexts.length = this.contexts.length - 1;
          }
        };
        ExtendFinderVisitor.prototype.visitMedia = function (
          mediaNode,
          visitArgs,
        ) {
          mediaNode.allExtends = [];
          this.allExtendsStack.push(mediaNode.allExtends);
        };
        ExtendFinderVisitor.prototype.visitMediaOut = function (mediaNode) {
          this.allExtendsStack.length = this.allExtendsStack.length - 1;
        };
        ExtendFinderVisitor.prototype.visitAtRule = function (
          atRuleNode,
          visitArgs,
        ) {
          atRuleNode.allExtends = [];
          this.allExtendsStack.push(atRuleNode.allExtends);
        };
        ExtendFinderVisitor.prototype.visitAtRuleOut = function (atRuleNode) {
          this.allExtendsStack.length = this.allExtendsStack.length - 1;
        };
        return ExtendFinderVisitor;
      })();
      var ProcessExtendsVisitor = (function () {
        function ProcessExtendsVisitor() {
          this._visitor = new visitor_1.default(this);
        }
        ProcessExtendsVisitor.prototype.run = function (root) {
          var extendFinder = new ExtendFinderVisitor();
          this.extendIndices = {};
          extendFinder.run(root);
          if (!extendFinder.foundExtends) {
            return root;
          }
          root.allExtends = root.allExtends.concat(
            this.doExtendChaining(root.allExtends, root.allExtends),
          );
          this.allExtendsStack = [root.allExtends];
          var newRoot = this._visitor.visit(root);
          this.checkExtendsForNonMatched(root.allExtends);
          return newRoot;
        };
        ProcessExtendsVisitor.prototype.checkExtendsForNonMatched = function (
          extendList,
        ) {
          var indices = this.extendIndices;
          extendList
            .filter(function (extend) {
              return !extend.hasFoundMatches && extend.parent_ids.length == 1;
            })
            .forEach(function (extend) {
              var selector = "_unknown_";
              try {
                selector = extend.selector.toCSS({});
              } catch (_) {}
              if (!indices["".concat(extend.index, " ").concat(selector)]) {
                indices["".concat(extend.index, " ").concat(selector)] = true;
                logger_1.default.warn(
                  "WARNING: extend '".concat(selector, "' has no matches"),
                );
              }
            });
        };
        ProcessExtendsVisitor.prototype.doExtendChaining = function (
          extendsList,
          extendsListTarget,
          iterationCount,
        ) {
          var extendIndex;
          var targetExtendIndex;
          var matches;
          var extendsToAdd = [];
          var newSelector;
          var extendVisitor = this;
          var selectorPath;
          var extend;
          var targetExtend;
          var newExtend;
          iterationCount = iterationCount || 0;
          for (
            extendIndex = 0;
            extendIndex < extendsList.length;
            extendIndex++
          ) {
            for (
              targetExtendIndex = 0;
              targetExtendIndex < extendsListTarget.length;
              targetExtendIndex++
            ) {
              extend = extendsList[extendIndex];
              targetExtend = extendsListTarget[targetExtendIndex];
              if (extend.parent_ids.indexOf(targetExtend.object_id) >= 0) {
                continue;
              }
              selectorPath = [targetExtend.selfSelectors[0]];
              matches = extendVisitor.findMatch(extend, selectorPath);
              if (matches.length) {
                extend.hasFoundMatches = true;
                extend.selfSelectors.forEach(function (selfSelector) {
                  var info = targetExtend.visibilityInfo();
                  newSelector = extendVisitor.extendSelector(
                    matches,
                    selectorPath,
                    selfSelector,
                    extend.isVisible(),
                  );
                  newExtend = new tree_1.default.Extend(
                    targetExtend.selector,
                    targetExtend.option,
                    0,
                    targetExtend.fileInfo(),
                    info,
                  );
                  newExtend.selfSelectors = newSelector;
                  newSelector[newSelector.length - 1].extendList = [newExtend];
                  extendsToAdd.push(newExtend);
                  newExtend.ruleset = targetExtend.ruleset;
                  newExtend.parent_ids = newExtend.parent_ids.concat(
                    targetExtend.parent_ids,
                    extend.parent_ids,
                  );
                  if (targetExtend.firstExtendOnThisSelectorPath) {
                    newExtend.firstExtendOnThisSelectorPath = true;
                    targetExtend.ruleset.paths.push(newSelector);
                  }
                });
              }
            }
          }
          if (extendsToAdd.length) {
            this.extendChainCount++;
            if (iterationCount > 100) {
              var selectorOne = "{unable to calculate}";
              var selectorTwo = "{unable to calculate}";
              try {
                selectorOne = extendsToAdd[0].selfSelectors[0].toCSS();
                selectorTwo = extendsToAdd[0].selector.toCSS();
              } catch (e) {}
              throw {
                message:
                  "extend circular reference detected. One of the circular extends is currently:"
                    .concat(selectorOne, ":extend(")
                    .concat(selectorTwo, ")"),
              };
            }
            return extendsToAdd.concat(
              extendVisitor.doExtendChaining(
                extendsToAdd,
                extendsListTarget,
                iterationCount + 1,
              ),
            );
          } else {
            return extendsToAdd;
          }
        };
        ProcessExtendsVisitor.prototype.visitDeclaration = function (
          ruleNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        ProcessExtendsVisitor.prototype.visitMixinDefinition = function (
          mixinDefinitionNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        ProcessExtendsVisitor.prototype.visitSelector = function (
          selectorNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        ProcessExtendsVisitor.prototype.visitRuleset = function (
          rulesetNode,
          visitArgs,
        ) {
          if (rulesetNode.root) {
            return;
          }
          var matches;
          var pathIndex;
          var extendIndex;
          var allExtends =
            this.allExtendsStack[this.allExtendsStack.length - 1];
          var selectorsToAdd = [];
          var extendVisitor = this;
          var selectorPath;
          for (
            extendIndex = 0;
            extendIndex < allExtends.length;
            extendIndex++
          ) {
            for (
              pathIndex = 0;
              pathIndex < rulesetNode.paths.length;
              pathIndex++
            ) {
              selectorPath = rulesetNode.paths[pathIndex];
              if (rulesetNode.extendOnEveryPath) {
                continue;
              }
              var extendList = selectorPath[selectorPath.length - 1].extendList;
              if (extendList && extendList.length) {
                continue;
              }
              matches = this.findMatch(allExtends[extendIndex], selectorPath);
              if (matches.length) {
                allExtends[extendIndex].hasFoundMatches = true;
                allExtends[extendIndex].selfSelectors.forEach(
                  function (selfSelector) {
                    var extendedSelectors;
                    extendedSelectors = extendVisitor.extendSelector(
                      matches,
                      selectorPath,
                      selfSelector,
                      allExtends[extendIndex].isVisible(),
                    );
                    selectorsToAdd.push(extendedSelectors);
                  },
                );
              }
            }
          }
          rulesetNode.paths = rulesetNode.paths.concat(selectorsToAdd);
        };
        ProcessExtendsVisitor.prototype.findMatch = function (
          extend,
          haystackSelectorPath,
        ) {
          var haystackSelectorIndex;
          var hackstackSelector;
          var hackstackElementIndex;
          var haystackElement;
          var targetCombinator;
          var i;
          var extendVisitor = this;
          var needleElements = extend.selector.elements;
          var potentialMatches = [];
          var potentialMatch;
          var matches = [];
          for (
            haystackSelectorIndex = 0;
            haystackSelectorIndex < haystackSelectorPath.length;
            haystackSelectorIndex++
          ) {
            hackstackSelector = haystackSelectorPath[haystackSelectorIndex];
            for (
              hackstackElementIndex = 0;
              hackstackElementIndex < hackstackSelector.elements.length;
              hackstackElementIndex++
            ) {
              haystackElement =
                hackstackSelector.elements[hackstackElementIndex];
              if (
                extend.allowBefore ||
                (haystackSelectorIndex === 0 && hackstackElementIndex === 0)
              ) {
                potentialMatches.push({
                  pathIndex: haystackSelectorIndex,
                  index: hackstackElementIndex,
                  matched: 0,
                  initialCombinator: haystackElement.combinator,
                });
              }
              for (i = 0; i < potentialMatches.length; i++) {
                potentialMatch = potentialMatches[i];
                targetCombinator = haystackElement.combinator.value;
                if (targetCombinator === "" && hackstackElementIndex === 0) {
                  targetCombinator = " ";
                }
                if (
                  !extendVisitor.isElementValuesEqual(
                    needleElements[potentialMatch.matched].value,
                    haystackElement.value,
                  ) ||
                  (potentialMatch.matched > 0 &&
                    needleElements[potentialMatch.matched].combinator.value !==
                      targetCombinator)
                ) {
                  potentialMatch = null;
                } else {
                  potentialMatch.matched++;
                }
                if (potentialMatch) {
                  potentialMatch.finished =
                    potentialMatch.matched === needleElements.length;
                  if (
                    potentialMatch.finished &&
                    !extend.allowAfter &&
                    (hackstackElementIndex + 1 <
                      hackstackSelector.elements.length ||
                      haystackSelectorIndex + 1 < haystackSelectorPath.length)
                  ) {
                    potentialMatch = null;
                  }
                }
                if (potentialMatch) {
                  if (potentialMatch.finished) {
                    potentialMatch.length = needleElements.length;
                    potentialMatch.endPathIndex = haystackSelectorIndex;
                    potentialMatch.endPathElementIndex =
                      hackstackElementIndex + 1;
                    potentialMatches.length = 0;
                    matches.push(potentialMatch);
                  }
                } else {
                  potentialMatches.splice(i, 1);
                  i--;
                }
              }
            }
          }
          return matches;
        };
        ProcessExtendsVisitor.prototype.isElementValuesEqual = function (
          elementValue1,
          elementValue2,
        ) {
          if (
            typeof elementValue1 === "string" ||
            typeof elementValue2 === "string"
          ) {
            return elementValue1 === elementValue2;
          }
          if (elementValue1 instanceof tree_1.default.Attribute) {
            if (
              elementValue1.op !== elementValue2.op ||
              elementValue1.key !== elementValue2.key
            ) {
              return false;
            }
            if (!elementValue1.value || !elementValue2.value) {
              if (elementValue1.value || elementValue2.value) {
                return false;
              }
              return true;
            }
            elementValue1 = elementValue1.value.value || elementValue1.value;
            elementValue2 = elementValue2.value.value || elementValue2.value;
            return elementValue1 === elementValue2;
          }
          elementValue1 = elementValue1.value;
          elementValue2 = elementValue2.value;
          if (elementValue1 instanceof tree_1.default.Selector) {
            if (
              !(elementValue2 instanceof tree_1.default.Selector) ||
              elementValue1.elements.length !== elementValue2.elements.length
            ) {
              return false;
            }
            for (var i = 0; i < elementValue1.elements.length; i++) {
              if (
                elementValue1.elements[i].combinator.value !==
                elementValue2.elements[i].combinator.value
              ) {
                if (
                  i !== 0 ||
                  (elementValue1.elements[i].combinator.value || " ") !==
                    (elementValue2.elements[i].combinator.value || " ")
                ) {
                  return false;
                }
              }
              if (
                !this.isElementValuesEqual(
                  elementValue1.elements[i].value,
                  elementValue2.elements[i].value,
                )
              ) {
                return false;
              }
            }
            return true;
          }
          return false;
        };
        ProcessExtendsVisitor.prototype.extendSelector = function (
          matches,
          selectorPath,
          replacementSelector,
          isVisible,
        ) {
          var currentSelectorPathIndex = 0,
            currentSelectorPathElementIndex = 0,
            path = [],
            matchIndex,
            selector,
            firstElement,
            match,
            newElements;
          for (matchIndex = 0; matchIndex < matches.length; matchIndex++) {
            match = matches[matchIndex];
            selector = selectorPath[match.pathIndex];
            firstElement = new tree_1.default.Element(
              match.initialCombinator,
              replacementSelector.elements[0].value,
              replacementSelector.elements[0].isVariable,
              replacementSelector.elements[0].getIndex(),
              replacementSelector.elements[0].fileInfo(),
            );
            if (
              match.pathIndex > currentSelectorPathIndex &&
              currentSelectorPathElementIndex > 0
            ) {
              path[path.length - 1].elements = path[
                path.length - 1
              ].elements.concat(
                selectorPath[currentSelectorPathIndex].elements.slice(
                  currentSelectorPathElementIndex,
                ),
              );
              currentSelectorPathElementIndex = 0;
              currentSelectorPathIndex++;
            }
            newElements = selector.elements
              .slice(currentSelectorPathElementIndex, match.index)
              .concat([firstElement])
              .concat(replacementSelector.elements.slice(1));
            if (
              currentSelectorPathIndex === match.pathIndex &&
              matchIndex > 0
            ) {
              path[path.length - 1].elements =
                path[path.length - 1].elements.concat(newElements);
            } else {
              path = path.concat(
                selectorPath.slice(currentSelectorPathIndex, match.pathIndex),
              );
              path.push(new tree_1.default.Selector(newElements));
            }
            currentSelectorPathIndex = match.endPathIndex;
            currentSelectorPathElementIndex = match.endPathElementIndex;
            if (
              currentSelectorPathElementIndex >=
              selectorPath[currentSelectorPathIndex].elements.length
            ) {
              currentSelectorPathElementIndex = 0;
              currentSelectorPathIndex++;
            }
          }
          if (
            currentSelectorPathIndex < selectorPath.length &&
            currentSelectorPathElementIndex > 0
          ) {
            path[path.length - 1].elements = path[
              path.length - 1
            ].elements.concat(
              selectorPath[currentSelectorPathIndex].elements.slice(
                currentSelectorPathElementIndex,
              ),
            );
            currentSelectorPathIndex++;
          }
          path = path.concat(
            selectorPath.slice(currentSelectorPathIndex, selectorPath.length),
          );
          path = path.map(function (currentValue) {
            var derived = currentValue.createDerived(currentValue.elements);
            if (isVisible) {
              derived.ensureVisibility();
            } else {
              derived.ensureInvisibility();
            }
            return derived;
          });
          return path;
        };
        ProcessExtendsVisitor.prototype.visitMedia = function (
          mediaNode,
          visitArgs,
        ) {
          var newAllExtends = mediaNode.allExtends.concat(
            this.allExtendsStack[this.allExtendsStack.length - 1],
          );
          newAllExtends = newAllExtends.concat(
            this.doExtendChaining(newAllExtends, mediaNode.allExtends),
          );
          this.allExtendsStack.push(newAllExtends);
        };
        ProcessExtendsVisitor.prototype.visitMediaOut = function (mediaNode) {
          var lastIndex = this.allExtendsStack.length - 1;
          this.allExtendsStack.length = lastIndex;
        };
        ProcessExtendsVisitor.prototype.visitAtRule = function (
          atRuleNode,
          visitArgs,
        ) {
          var newAllExtends = atRuleNode.allExtends.concat(
            this.allExtendsStack[this.allExtendsStack.length - 1],
          );
          newAllExtends = newAllExtends.concat(
            this.doExtendChaining(newAllExtends, atRuleNode.allExtends),
          );
          this.allExtendsStack.push(newAllExtends);
        };
        ProcessExtendsVisitor.prototype.visitAtRuleOut = function (atRuleNode) {
          var lastIndex = this.allExtendsStack.length - 1;
          this.allExtendsStack.length = lastIndex;
        };
        return ProcessExtendsVisitor;
      })();
      exports["default"] = ProcessExtendsVisitor;
    },
    1988: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var ImportSequencer = (function () {
        function ImportSequencer(onSequencerEmpty) {
          this.imports = [];
          this.variableImports = [];
          this._onSequencerEmpty = onSequencerEmpty;
          this._currentDepth = 0;
        }
        ImportSequencer.prototype.addImport = function (callback) {
          var importSequencer = this,
            importItem = { callback, args: null, isReady: false };
          this.imports.push(importItem);
          return function () {
            importItem.args = Array.prototype.slice.call(arguments, 0);
            importItem.isReady = true;
            importSequencer.tryRun();
          };
        };
        ImportSequencer.prototype.addVariableImport = function (callback) {
          this.variableImports.push(callback);
        };
        ImportSequencer.prototype.tryRun = function () {
          this._currentDepth++;
          try {
            while (true) {
              while (this.imports.length > 0) {
                var importItem = this.imports[0];
                if (!importItem.isReady) {
                  return;
                }
                this.imports = this.imports.slice(1);
                importItem.callback.apply(null, importItem.args);
              }
              if (this.variableImports.length === 0) {
                break;
              }
              var variableImport = this.variableImports[0];
              this.variableImports = this.variableImports.slice(1);
              variableImport();
            }
          } finally {
            this._currentDepth--;
          }
          if (this._currentDepth === 0 && this._onSequencerEmpty) {
            this._onSequencerEmpty();
          }
        };
        return ImportSequencer;
      })();
      exports["default"] = ImportSequencer;
    },
    6995: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var contexts_1 = tslib_1.__importDefault(__nccwpck_require__(8461));
      var visitor_1 = tslib_1.__importDefault(__nccwpck_require__(1807));
      var import_sequencer_1 = tslib_1.__importDefault(
        __nccwpck_require__(1988),
      );
      var utils = tslib_1.__importStar(__nccwpck_require__(3876));
      var ImportVisitor = function (importer, finish) {
        this._visitor = new visitor_1.default(this);
        this._importer = importer;
        this._finish = finish;
        this.context = new contexts_1.default.Eval();
        this.importCount = 0;
        this.onceFileDetectionMap = {};
        this.recursionDetector = {};
        this._sequencer = new import_sequencer_1.default(
          this._onSequencerEmpty.bind(this),
        );
      };
      ImportVisitor.prototype = {
        isReplacing: false,
        run: function (root) {
          try {
            this._visitor.visit(root);
          } catch (e) {
            this.error = e;
          }
          this.isFinished = true;
          this._sequencer.tryRun();
        },
        _onSequencerEmpty: function () {
          if (!this.isFinished) {
            return;
          }
          this._finish(this.error);
        },
        visitImport: function (importNode, visitArgs) {
          var inlineCSS = importNode.options.inline;
          if (!importNode.css || inlineCSS) {
            var context = new contexts_1.default.Eval(
              this.context,
              utils.copyArray(this.context.frames),
            );
            var importParent = context.frames[0];
            this.importCount++;
            if (importNode.isVariableImport()) {
              this._sequencer.addVariableImport(
                this.processImportNode.bind(
                  this,
                  importNode,
                  context,
                  importParent,
                ),
              );
            } else {
              this.processImportNode(importNode, context, importParent);
            }
          }
          visitArgs.visitDeeper = false;
        },
        processImportNode: function (importNode, context, importParent) {
          var evaldImportNode;
          var inlineCSS = importNode.options.inline;
          try {
            evaldImportNode = importNode.evalForImport(context);
          } catch (e) {
            if (!e.filename) {
              e.index = importNode.getIndex();
              e.filename = importNode.fileInfo().filename;
            }
            importNode.css = true;
            importNode.error = e;
          }
          if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {
            if (evaldImportNode.options.multiple) {
              context.importMultiple = true;
            }
            var tryAppendLessExtension = evaldImportNode.css === undefined;
            for (var i = 0; i < importParent.rules.length; i++) {
              if (importParent.rules[i] === importNode) {
                importParent.rules[i] = evaldImportNode;
                break;
              }
            }
            var onImported = this.onImported.bind(
                this,
                evaldImportNode,
                context,
              ),
              sequencedOnImported = this._sequencer.addImport(onImported);
            this._importer.push(
              evaldImportNode.getPath(),
              tryAppendLessExtension,
              evaldImportNode.fileInfo(),
              evaldImportNode.options,
              sequencedOnImported,
            );
          } else {
            this.importCount--;
            if (this.isFinished) {
              this._sequencer.tryRun();
            }
          }
        },
        onImported: function (
          importNode,
          context,
          e,
          root,
          importedAtRoot,
          fullPath,
        ) {
          if (e) {
            if (!e.filename) {
              e.index = importNode.getIndex();
              e.filename = importNode.fileInfo().filename;
            }
            this.error = e;
          }
          var importVisitor = this,
            inlineCSS = importNode.options.inline,
            isPlugin = importNode.options.isPlugin,
            isOptional = importNode.options.optional,
            duplicateImport =
              importedAtRoot || fullPath in importVisitor.recursionDetector;
          if (!context.importMultiple) {
            if (duplicateImport) {
              importNode.skip = true;
            } else {
              importNode.skip = function () {
                if (fullPath in importVisitor.onceFileDetectionMap) {
                  return true;
                }
                importVisitor.onceFileDetectionMap[fullPath] = true;
                return false;
              };
            }
          }
          if (!fullPath && isOptional) {
            importNode.skip = true;
          }
          if (root) {
            importNode.root = root;
            importNode.importedFilename = fullPath;
            if (
              !inlineCSS &&
              !isPlugin &&
              (context.importMultiple || !duplicateImport)
            ) {
              importVisitor.recursionDetector[fullPath] = true;
              var oldContext = this.context;
              this.context = context;
              try {
                this._visitor.visit(root);
              } catch (e) {
                this.error = e;
              }
              this.context = oldContext;
            }
          }
          importVisitor.importCount--;
          if (importVisitor.isFinished) {
            importVisitor._sequencer.tryRun();
          }
        },
        visitDeclaration: function (declNode, visitArgs) {
          if (declNode.value.type === "DetachedRuleset") {
            this.context.frames.unshift(declNode);
          } else {
            visitArgs.visitDeeper = false;
          }
        },
        visitDeclarationOut: function (declNode) {
          if (declNode.value.type === "DetachedRuleset") {
            this.context.frames.shift();
          }
        },
        visitAtRule: function (atRuleNode, visitArgs) {
          if (atRuleNode.value) {
            this.context.frames.unshift(atRuleNode);
          } else if (
            atRuleNode.declarations &&
            atRuleNode.declarations.length
          ) {
            if (atRuleNode.isRooted) {
              this.context.frames.unshift(atRuleNode);
            } else {
              this.context.frames.unshift(atRuleNode.declarations[0]);
            }
          } else if (atRuleNode.rules && atRuleNode.rules.length) {
            this.context.frames.unshift(atRuleNode);
          }
        },
        visitAtRuleOut: function (atRuleNode) {
          this.context.frames.shift();
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
          this.context.frames.unshift(mixinDefinitionNode);
        },
        visitMixinDefinitionOut: function (mixinDefinitionNode) {
          this.context.frames.shift();
        },
        visitRuleset: function (rulesetNode, visitArgs) {
          this.context.frames.unshift(rulesetNode);
        },
        visitRulesetOut: function (rulesetNode) {
          this.context.frames.shift();
        },
        visitMedia: function (mediaNode, visitArgs) {
          this.context.frames.unshift(mediaNode.rules[0]);
        },
        visitMediaOut: function (mediaNode) {
          this.context.frames.shift();
        },
      };
      exports["default"] = ImportVisitor;
    },
    3185: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var visitor_1 = tslib_1.__importDefault(__nccwpck_require__(1807));
      var import_visitor_1 = tslib_1.__importDefault(__nccwpck_require__(6995));
      var set_tree_visibility_visitor_1 = tslib_1.__importDefault(
        __nccwpck_require__(4416),
      );
      var extend_visitor_1 = tslib_1.__importDefault(__nccwpck_require__(4862));
      var join_selector_visitor_1 = tslib_1.__importDefault(
        __nccwpck_require__(6660),
      );
      var to_css_visitor_1 = tslib_1.__importDefault(__nccwpck_require__(8325));
      exports["default"] = {
        Visitor: visitor_1.default,
        ImportVisitor: import_visitor_1.default,
        MarkVisibleSelectorsVisitor: set_tree_visibility_visitor_1.default,
        ExtendVisitor: extend_visitor_1.default,
        JoinSelectorVisitor: join_selector_visitor_1.default,
        ToCSSVisitor: to_css_visitor_1.default,
      };
    },
    6660: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var visitor_1 = tslib_1.__importDefault(__nccwpck_require__(1807));
      var JoinSelectorVisitor = (function () {
        function JoinSelectorVisitor() {
          this.contexts = [[]];
          this._visitor = new visitor_1.default(this);
        }
        JoinSelectorVisitor.prototype.run = function (root) {
          return this._visitor.visit(root);
        };
        JoinSelectorVisitor.prototype.visitDeclaration = function (
          declNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        JoinSelectorVisitor.prototype.visitMixinDefinition = function (
          mixinDefinitionNode,
          visitArgs,
        ) {
          visitArgs.visitDeeper = false;
        };
        JoinSelectorVisitor.prototype.visitRuleset = function (
          rulesetNode,
          visitArgs,
        ) {
          var context = this.contexts[this.contexts.length - 1];
          var paths = [];
          var selectors;
          this.contexts.push(paths);
          if (!rulesetNode.root) {
            selectors = rulesetNode.selectors;
            if (selectors) {
              selectors = selectors.filter(function (selector) {
                return selector.getIsOutput();
              });
              rulesetNode.selectors = selectors.length
                ? selectors
                : (selectors = null);
              if (selectors) {
                rulesetNode.joinSelectors(paths, context, selectors);
              }
            }
            if (!selectors) {
              rulesetNode.rules = null;
            }
            rulesetNode.paths = paths;
          }
        };
        JoinSelectorVisitor.prototype.visitRulesetOut = function (rulesetNode) {
          this.contexts.length = this.contexts.length - 1;
        };
        JoinSelectorVisitor.prototype.visitMedia = function (
          mediaNode,
          visitArgs,
        ) {
          var context = this.contexts[this.contexts.length - 1];
          mediaNode.rules[0].root =
            context.length === 0 || context[0].multiMedia;
        };
        JoinSelectorVisitor.prototype.visitAtRule = function (
          atRuleNode,
          visitArgs,
        ) {
          var context = this.contexts[this.contexts.length - 1];
          if (atRuleNode.declarations && atRuleNode.declarations.length) {
            atRuleNode.declarations[0].root =
              context.length === 0 || context[0].multiMedia;
          } else if (atRuleNode.rules && atRuleNode.rules.length) {
            atRuleNode.rules[0].root =
              atRuleNode.isRooted || context.length === 0 || null;
          }
        };
        return JoinSelectorVisitor;
      })();
      exports["default"] = JoinSelectorVisitor;
    },
    4416: (__unused_webpack_module, exports) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var SetTreeVisibilityVisitor = (function () {
        function SetTreeVisibilityVisitor(visible) {
          this.visible = visible;
        }
        SetTreeVisibilityVisitor.prototype.run = function (root) {
          this.visit(root);
        };
        SetTreeVisibilityVisitor.prototype.visitArray = function (nodes) {
          if (!nodes) {
            return nodes;
          }
          var cnt = nodes.length;
          var i;
          for (i = 0; i < cnt; i++) {
            this.visit(nodes[i]);
          }
          return nodes;
        };
        SetTreeVisibilityVisitor.prototype.visit = function (node) {
          if (!node) {
            return node;
          }
          if (node.constructor === Array) {
            return this.visitArray(node);
          }
          if (!node.blocksVisibility || node.blocksVisibility()) {
            return node;
          }
          if (this.visible) {
            node.ensureVisibility();
          } else {
            node.ensureInvisibility();
          }
          node.accept(this);
          return node;
        };
        return SetTreeVisibilityVisitor;
      })();
      exports["default"] = SetTreeVisibilityVisitor;
    },
    8325: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      var visitor_1 = tslib_1.__importDefault(__nccwpck_require__(1807));
      var CSSVisitorUtils = (function () {
        function CSSVisitorUtils(context) {
          this._visitor = new visitor_1.default(this);
          this._context = context;
        }
        CSSVisitorUtils.prototype.containsSilentNonBlockedChild = function (
          bodyRules,
        ) {
          var rule;
          if (!bodyRules) {
            return false;
          }
          for (var r = 0; r < bodyRules.length; r++) {
            rule = bodyRules[r];
            if (
              rule.isSilent &&
              rule.isSilent(this._context) &&
              !rule.blocksVisibility()
            ) {
              return true;
            }
          }
          return false;
        };
        CSSVisitorUtils.prototype.keepOnlyVisibleChilds = function (owner) {
          if (owner && owner.rules) {
            owner.rules = owner.rules.filter(function (thing) {
              return thing.isVisible();
            });
          }
        };
        CSSVisitorUtils.prototype.isEmpty = function (owner) {
          return owner && owner.rules ? owner.rules.length === 0 : true;
        };
        CSSVisitorUtils.prototype.hasVisibleSelector = function (rulesetNode) {
          return rulesetNode && rulesetNode.paths
            ? rulesetNode.paths.length > 0
            : false;
        };
        CSSVisitorUtils.prototype.resolveVisibility = function (node) {
          if (!node.blocksVisibility()) {
            if (this.isEmpty(node)) {
              return;
            }
            return node;
          }
          var compiledRulesBody = node.rules[0];
          this.keepOnlyVisibleChilds(compiledRulesBody);
          if (this.isEmpty(compiledRulesBody)) {
            return;
          }
          node.ensureVisibility();
          node.removeVisibilityBlock();
          return node;
        };
        CSSVisitorUtils.prototype.isVisibleRuleset = function (rulesetNode) {
          if (rulesetNode.firstRoot) {
            return true;
          }
          if (this.isEmpty(rulesetNode)) {
            return false;
          }
          if (!rulesetNode.root && !this.hasVisibleSelector(rulesetNode)) {
            return false;
          }
          return true;
        };
        return CSSVisitorUtils;
      })();
      var ToCSSVisitor = function (context) {
        this._visitor = new visitor_1.default(this);
        this._context = context;
        this.utils = new CSSVisitorUtils(context);
      };
      ToCSSVisitor.prototype = {
        isReplacing: true,
        run: function (root) {
          return this._visitor.visit(root);
        },
        visitDeclaration: function (declNode, visitArgs) {
          if (declNode.blocksVisibility() || declNode.variable) {
            return;
          }
          return declNode;
        },
        visitMixinDefinition: function (mixinNode, visitArgs) {
          mixinNode.frames = [];
        },
        visitExtend: function (extendNode, visitArgs) {},
        visitComment: function (commentNode, visitArgs) {
          if (
            commentNode.blocksVisibility() ||
            commentNode.isSilent(this._context)
          ) {
            return;
          }
          return commentNode;
        },
        visitMedia: function (mediaNode, visitArgs) {
          var originalRules = mediaNode.rules[0].rules;
          mediaNode.accept(this._visitor);
          visitArgs.visitDeeper = false;
          return this.utils.resolveVisibility(mediaNode, originalRules);
        },
        visitImport: function (importNode, visitArgs) {
          if (importNode.blocksVisibility()) {
            return;
          }
          return importNode;
        },
        visitAtRule: function (atRuleNode, visitArgs) {
          if (atRuleNode.rules && atRuleNode.rules.length) {
            return this.visitAtRuleWithBody(atRuleNode, visitArgs);
          } else {
            return this.visitAtRuleWithoutBody(atRuleNode, visitArgs);
          }
        },
        visitAnonymous: function (anonymousNode, visitArgs) {
          if (!anonymousNode.blocksVisibility()) {
            anonymousNode.accept(this._visitor);
            return anonymousNode;
          }
        },
        visitAtRuleWithBody: function (atRuleNode, visitArgs) {
          function hasFakeRuleset(atRuleNode) {
            var bodyRules = atRuleNode.rules;
            return (
              bodyRules.length === 1 &&
              (!bodyRules[0].paths || bodyRules[0].paths.length === 0)
            );
          }
          function getBodyRules(atRuleNode) {
            var nodeRules = atRuleNode.rules;
            if (hasFakeRuleset(atRuleNode)) {
              return nodeRules[0].rules;
            }
            return nodeRules;
          }
          var originalRules = getBodyRules(atRuleNode);
          atRuleNode.accept(this._visitor);
          visitArgs.visitDeeper = false;
          if (!this.utils.isEmpty(atRuleNode)) {
            this._mergeRules(atRuleNode.rules[0].rules);
          }
          return this.utils.resolveVisibility(atRuleNode, originalRules);
        },
        visitAtRuleWithoutBody: function (atRuleNode, visitArgs) {
          if (atRuleNode.blocksVisibility()) {
            return;
          }
          if (atRuleNode.name === "@charset") {
            if (this.charset) {
              if (atRuleNode.debugInfo) {
                var comment = new tree_1.default.Comment(
                  "/* ".concat(
                    atRuleNode.toCSS(this._context).replace(/\n/g, ""),
                    " */\n",
                  ),
                );
                comment.debugInfo = atRuleNode.debugInfo;
                return this._visitor.visit(comment);
              }
              return;
            }
            this.charset = true;
          }
          return atRuleNode;
        },
        checkValidNodes: function (rules, isRoot) {
          if (!rules) {
            return;
          }
          for (var i = 0; i < rules.length; i++) {
            var ruleNode = rules[i];
            if (
              isRoot &&
              ruleNode instanceof tree_1.default.Declaration &&
              !ruleNode.variable
            ) {
              throw {
                message:
                  "Properties must be inside selector blocks. They cannot be in the root",
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename,
              };
            }
            if (ruleNode instanceof tree_1.default.Call) {
              throw {
                message: "Function '".concat(
                  ruleNode.name,
                  "' did not return a root node",
                ),
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename,
              };
            }
            if (ruleNode.type && !ruleNode.allowRoot) {
              throw {
                message: "".concat(
                  ruleNode.type,
                  " node returned by a function is not valid here",
                ),
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename,
              };
            }
          }
        },
        visitRuleset: function (rulesetNode, visitArgs) {
          var rule;
          var rulesets = [];
          this.checkValidNodes(rulesetNode.rules, rulesetNode.firstRoot);
          if (!rulesetNode.root) {
            this._compileRulesetPaths(rulesetNode);
            var nodeRules = rulesetNode.rules;
            var nodeRuleCnt = nodeRules ? nodeRules.length : 0;
            for (var i = 0; i < nodeRuleCnt; ) {
              rule = nodeRules[i];
              if (rule && rule.rules) {
                rulesets.push(this._visitor.visit(rule));
                nodeRules.splice(i, 1);
                nodeRuleCnt--;
                continue;
              }
              i++;
            }
            if (nodeRuleCnt > 0) {
              rulesetNode.accept(this._visitor);
            } else {
              rulesetNode.rules = null;
            }
            visitArgs.visitDeeper = false;
          } else {
            rulesetNode.accept(this._visitor);
            visitArgs.visitDeeper = false;
          }
          if (rulesetNode.rules) {
            this._mergeRules(rulesetNode.rules);
            this._removeDuplicateRules(rulesetNode.rules);
          }
          if (this.utils.isVisibleRuleset(rulesetNode)) {
            rulesetNode.ensureVisibility();
            rulesets.splice(0, 0, rulesetNode);
          }
          if (rulesets.length === 1) {
            return rulesets[0];
          }
          return rulesets;
        },
        _compileRulesetPaths: function (rulesetNode) {
          if (rulesetNode.paths) {
            rulesetNode.paths = rulesetNode.paths.filter(function (p) {
              var i;
              if (p[0].elements[0].combinator.value === " ") {
                p[0].elements[0].combinator = new tree_1.default.Combinator("");
              }
              for (i = 0; i < p.length; i++) {
                if (p[i].isVisible() && p[i].getIsOutput()) {
                  return true;
                }
              }
              return false;
            });
          }
        },
        _removeDuplicateRules: function (rules) {
          if (!rules) {
            return;
          }
          var ruleCache = {};
          var ruleList;
          var rule;
          var i;
          for (i = rules.length - 1; i >= 0; i--) {
            rule = rules[i];
            if (rule instanceof tree_1.default.Declaration) {
              if (!ruleCache[rule.name]) {
                ruleCache[rule.name] = rule;
              } else {
                ruleList = ruleCache[rule.name];
                if (ruleList instanceof tree_1.default.Declaration) {
                  ruleList = ruleCache[rule.name] = [
                    ruleCache[rule.name].toCSS(this._context),
                  ];
                }
                var ruleCSS = rule.toCSS(this._context);
                if (ruleList.indexOf(ruleCSS) !== -1) {
                  rules.splice(i, 1);
                } else {
                  ruleList.push(ruleCSS);
                }
              }
            }
          }
        },
        _mergeRules: function (rules) {
          if (!rules) {
            return;
          }
          var groups = {};
          var groupsArr = [];
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            if (rule.merge) {
              var key = rule.name;
              groups[key]
                ? rules.splice(i--, 1)
                : groupsArr.push((groups[key] = []));
              groups[key].push(rule);
            }
          }
          groupsArr.forEach(function (group) {
            if (group.length > 0) {
              var result_1 = group[0];
              var space_1 = [];
              var comma_1 = [new tree_1.default.Expression(space_1)];
              group.forEach(function (rule) {
                if (rule.merge === "+" && space_1.length > 0) {
                  comma_1.push(new tree_1.default.Expression((space_1 = [])));
                }
                space_1.push(rule.value);
                result_1.important = result_1.important || rule.important;
              });
              result_1.value = new tree_1.default.Value(comma_1);
            }
          });
        },
      };
      exports["default"] = ToCSSVisitor;
    },
    1807: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var tslib_1 = __nccwpck_require__(5477);
      var tree_1 = tslib_1.__importDefault(__nccwpck_require__(5730));
      var _visitArgs = { visitDeeper: true };
      var _hasIndexed = false;
      function _noop(node) {
        return node;
      }
      function indexNodeTypes(parent, ticker) {
        var key, child;
        for (key in parent) {
          child = parent[key];
          switch (typeof child) {
            case "function":
              if (child.prototype && child.prototype.type) {
                child.prototype.typeIndex = ticker++;
              }
              break;
            case "object":
              ticker = indexNodeTypes(child, ticker);
              break;
          }
        }
        return ticker;
      }
      var Visitor = (function () {
        function Visitor(implementation) {
          this._implementation = implementation;
          this._visitInCache = {};
          this._visitOutCache = {};
          if (!_hasIndexed) {
            indexNodeTypes(tree_1.default, 1);
            _hasIndexed = true;
          }
        }
        Visitor.prototype.visit = function (node) {
          if (!node) {
            return node;
          }
          var nodeTypeIndex = node.typeIndex;
          if (!nodeTypeIndex) {
            if (node.value && node.value.typeIndex) {
              this.visit(node.value);
            }
            return node;
          }
          var impl = this._implementation;
          var func = this._visitInCache[nodeTypeIndex];
          var funcOut = this._visitOutCache[nodeTypeIndex];
          var visitArgs = _visitArgs;
          var fnName;
          visitArgs.visitDeeper = true;
          if (!func) {
            fnName = "visit".concat(node.type);
            func = impl[fnName] || _noop;
            funcOut = impl["".concat(fnName, "Out")] || _noop;
            this._visitInCache[nodeTypeIndex] = func;
            this._visitOutCache[nodeTypeIndex] = funcOut;
          }
          if (func !== _noop) {
            var newNode = func.call(impl, node, visitArgs);
            if (node && impl.isReplacing) {
              node = newNode;
            }
          }
          if (visitArgs.visitDeeper && node) {
            if (node.length) {
              for (var i = 0, cnt = node.length; i < cnt; i++) {
                if (node[i].accept) {
                  node[i].accept(this);
                }
              }
            } else if (node.accept) {
              node.accept(this);
            }
          }
          if (funcOut != _noop) {
            funcOut.call(impl, node);
          }
          return node;
        };
        Visitor.prototype.visitArray = function (nodes, nonReplacing) {
          if (!nodes) {
            return nodes;
          }
          var cnt = nodes.length;
          var i;
          if (nonReplacing || !this._implementation.isReplacing) {
            for (i = 0; i < cnt; i++) {
              this.visit(nodes[i]);
            }
            return nodes;
          }
          var out = [];
          for (i = 0; i < cnt; i++) {
            var evald = this.visit(nodes[i]);
            if (evald === undefined) {
              continue;
            }
            if (!evald.splice) {
              out.push(evald);
            } else if (evald.length) {
              this.flatten(evald, out);
            }
          }
          return out;
        };
        Visitor.prototype.flatten = function (arr, out) {
          if (!out) {
            out = [];
          }
          var cnt, i, item, nestedCnt, j, nestedItem;
          for (i = 0, cnt = arr.length; i < cnt; i++) {
            item = arr[i];
            if (item === undefined) {
              continue;
            }
            if (!item.splice) {
              out.push(item);
              continue;
            }
            for (j = 0, nestedCnt = item.length; j < nestedCnt; j++) {
              nestedItem = item[j];
              if (nestedItem === undefined) {
                continue;
              }
              if (!nestedItem.splice) {
                out.push(nestedItem);
              } else if (nestedItem.length) {
                this.flatten(nestedItem, out);
              }
            }
          }
          return out;
        };
        return Visitor;
      })();
      exports["default"] = Visitor;
    },
    375: (module, __unused_webpack_exports, __nccwpck_require__) => {
      var path = __nccwpck_require__(6928);
      var fs = __nccwpck_require__(9896);
      function Mime() {
        this.types = Object.create(null);
        this.extensions = Object.create(null);
      }
      Mime.prototype.define = function (map) {
        for (var type in map) {
          var exts = map[type];
          for (var i = 0; i < exts.length; i++) {
            if (process.env.DEBUG_MIME && this.types[exts[i]]) {
              console.warn(
                (this._loading || "define()").replace(/.*\//, ""),
                'changes "' +
                  exts[i] +
                  '" extension type from ' +
                  this.types[exts[i]] +
                  " to " +
                  type,
              );
            }
            this.types[exts[i]] = type;
          }
          if (!this.extensions[type]) {
            this.extensions[type] = exts[0];
          }
        }
      };
      Mime.prototype.load = function (file) {
        this._loading = file;
        var map = {},
          content = fs.readFileSync(file, "ascii"),
          lines = content.split(/[\r\n]+/);
        lines.forEach(function (line) {
          var fields = line.replace(/\s*#.*|^\s*|\s*$/g, "").split(/\s+/);
          map[fields.shift()] = fields;
        });
        this.define(map);
        this._loading = null;
      };
      Mime.prototype.lookup = function (path, fallback) {
        var ext = path.replace(/^.*[\.\/\\]/, "").toLowerCase();
        return this.types[ext] || fallback || this.default_type;
      };
      Mime.prototype.extension = function (mimeType) {
        var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
        return this.extensions[type];
      };
      var mime = new Mime();
      mime.define(__nccwpck_require__(9637));
      mime.default_type = mime.lookup("bin");
      mime.Mime = Mime;
      mime.charsets = {
        lookup: function (mimeType, fallback) {
          return /^text\/|^application\/(javascript|json)/.test(mimeType)
            ? "UTF-8"
            : fallback;
        },
      };
      module.exports = mime;
    },
    3394: (module) => {
      "use strict";
      function parseNodeVersion(version) {
        var match = version.match(
          /^v(\d{1,2})\.(\d{1,2})\.(\d{1,2})(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/,
        );
        if (!match) {
          throw new Error("Unable to parse: " + version);
        }
        var res = {
          major: parseInt(match[1], 10),
          minor: parseInt(match[2], 10),
          patch: parseInt(match[3], 10),
          pre: match[4] || "",
          build: match[5] || "",
        };
        return res;
      }
      module.exports = parseNodeVersion;
    },
    591: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var util = __nccwpck_require__(8715);
      var has = Object.prototype.hasOwnProperty;
      var hasNativeMap = typeof Map !== "undefined";
      function ArraySet() {
        this._array = [];
        this._set = hasNativeMap ? new Map() : Object.create(null);
      }
      ArraySet.fromArray = function ArraySet_fromArray(
        aArray,
        aAllowDuplicates,
      ) {
        var set = new ArraySet();
        for (var i = 0, len = aArray.length; i < len; i++) {
          set.add(aArray[i], aAllowDuplicates);
        }
        return set;
      };
      ArraySet.prototype.size = function ArraySet_size() {
        return hasNativeMap
          ? this._set.size
          : Object.getOwnPropertyNames(this._set).length;
      };
      ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
        var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
        var isDuplicate = hasNativeMap
          ? this.has(aStr)
          : has.call(this._set, sStr);
        var idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
          this._array.push(aStr);
        }
        if (!isDuplicate) {
          if (hasNativeMap) {
            this._set.set(aStr, idx);
          } else {
            this._set[sStr] = idx;
          }
        }
      };
      ArraySet.prototype.has = function ArraySet_has(aStr) {
        if (hasNativeMap) {
          return this._set.has(aStr);
        } else {
          var sStr = util.toSetString(aStr);
          return has.call(this._set, sStr);
        }
      };
      ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
        if (hasNativeMap) {
          var idx = this._set.get(aStr);
          if (idx >= 0) {
            return idx;
          }
        } else {
          var sStr = util.toSetString(aStr);
          if (has.call(this._set, sStr)) {
            return this._set[sStr];
          }
        }
        throw new Error('"' + aStr + '" is not in the set.');
      };
      ArraySet.prototype.at = function ArraySet_at(aIdx) {
        if (aIdx >= 0 && aIdx < this._array.length) {
          return this._array[aIdx];
        }
        throw new Error("No element indexed by " + aIdx);
      };
      ArraySet.prototype.toArray = function ArraySet_toArray() {
        return this._array.slice();
      };
      exports.C = ArraySet;
    },
    244: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var base64 = __nccwpck_require__(8460);
      var VLQ_BASE_SHIFT = 5;
      var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
      var VLQ_BASE_MASK = VLQ_BASE - 1;
      var VLQ_CONTINUATION_BIT = VLQ_BASE;
      function toVLQSigned(aValue) {
        return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
      }
      function fromVLQSigned(aValue) {
        var isNegative = (aValue & 1) === 1;
        var shifted = aValue >> 1;
        return isNegative ? -shifted : shifted;
      }
      exports.encode = function base64VLQ_encode(aValue) {
        var encoded = "";
        var digit;
        var vlq = toVLQSigned(aValue);
        do {
          digit = vlq & VLQ_BASE_MASK;
          vlq >>>= VLQ_BASE_SHIFT;
          if (vlq > 0) {
            digit |= VLQ_CONTINUATION_BIT;
          }
          encoded += base64.encode(digit);
        } while (vlq > 0);
        return encoded;
      };
      exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
        var strLen = aStr.length;
        var result = 0;
        var shift = 0;
        var continuation, digit;
        do {
          if (aIndex >= strLen) {
            throw new Error("Expected more digits in base 64 VLQ value.");
          }
          digit = base64.decode(aStr.charCodeAt(aIndex++));
          if (digit === -1) {
            throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
          }
          continuation = !!(digit & VLQ_CONTINUATION_BIT);
          digit &= VLQ_BASE_MASK;
          result = result + (digit << shift);
          shift += VLQ_BASE_SHIFT;
        } while (continuation);
        aOutParam.value = fromVLQSigned(result);
        aOutParam.rest = aIndex;
      };
    },
    8460: (__unused_webpack_module, exports) => {
      var intToCharMap =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(
          "",
        );
      exports.encode = function (number) {
        if (0 <= number && number < intToCharMap.length) {
          return intToCharMap[number];
        }
        throw new TypeError("Must be between 0 and 63: " + number);
      };
      exports.decode = function (charCode) {
        var bigA = 65;
        var bigZ = 90;
        var littleA = 97;
        var littleZ = 122;
        var zero = 48;
        var nine = 57;
        var plus = 43;
        var slash = 47;
        var littleOffset = 26;
        var numberOffset = 52;
        if (bigA <= charCode && charCode <= bigZ) {
          return charCode - bigA;
        }
        if (littleA <= charCode && charCode <= littleZ) {
          return charCode - littleA + littleOffset;
        }
        if (zero <= charCode && charCode <= nine) {
          return charCode - zero + numberOffset;
        }
        if (charCode == plus) {
          return 62;
        }
        if (charCode == slash) {
          return 63;
        }
        return -1;
      };
    },
    4987: (__unused_webpack_module, exports) => {
      exports.GREATEST_LOWER_BOUND = 1;
      exports.LEAST_UPPER_BOUND = 2;
      function recursiveSearch(
        aLow,
        aHigh,
        aNeedle,
        aHaystack,
        aCompare,
        aBias,
      ) {
        var mid = Math.floor((aHigh - aLow) / 2) + aLow;
        var cmp = aCompare(aNeedle, aHaystack[mid], true);
        if (cmp === 0) {
          return mid;
        } else if (cmp > 0) {
          if (aHigh - mid > 1) {
            return recursiveSearch(
              mid,
              aHigh,
              aNeedle,
              aHaystack,
              aCompare,
              aBias,
            );
          }
          if (aBias == exports.LEAST_UPPER_BOUND) {
            return aHigh < aHaystack.length ? aHigh : -1;
          } else {
            return mid;
          }
        } else {
          if (mid - aLow > 1) {
            return recursiveSearch(
              aLow,
              mid,
              aNeedle,
              aHaystack,
              aCompare,
              aBias,
            );
          }
          if (aBias == exports.LEAST_UPPER_BOUND) {
            return mid;
          } else {
            return aLow < 0 ? -1 : aLow;
          }
        }
      }
      exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
        if (aHaystack.length === 0) {
          return -1;
        }
        var index = recursiveSearch(
          -1,
          aHaystack.length,
          aNeedle,
          aHaystack,
          aCompare,
          aBias || exports.GREATEST_LOWER_BOUND,
        );
        if (index < 0) {
          return -1;
        }
        while (index - 1 >= 0) {
          if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
            break;
          }
          --index;
        }
        return index;
      };
    },
    5526: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var util = __nccwpck_require__(8715);
      function generatedPositionAfter(mappingA, mappingB) {
        var lineA = mappingA.generatedLine;
        var lineB = mappingB.generatedLine;
        var columnA = mappingA.generatedColumn;
        var columnB = mappingB.generatedColumn;
        return (
          lineB > lineA ||
          (lineB == lineA && columnB >= columnA) ||
          util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0
        );
      }
      function MappingList() {
        this._array = [];
        this._sorted = true;
        this._last = { generatedLine: -1, generatedColumn: 0 };
      }
      MappingList.prototype.unsortedForEach = function MappingList_forEach(
        aCallback,
        aThisArg,
      ) {
        this._array.forEach(aCallback, aThisArg);
      };
      MappingList.prototype.add = function MappingList_add(aMapping) {
        if (generatedPositionAfter(this._last, aMapping)) {
          this._last = aMapping;
          this._array.push(aMapping);
        } else {
          this._sorted = false;
          this._array.push(aMapping);
        }
      };
      MappingList.prototype.toArray = function MappingList_toArray() {
        if (!this._sorted) {
          this._array.sort(util.compareByGeneratedPositionsInflated);
          this._sorted = true;
        }
        return this._array;
      };
      exports.P = MappingList;
    },
    4249: (__unused_webpack_module, exports) => {
      function swap(ary, x, y) {
        var temp = ary[x];
        ary[x] = ary[y];
        ary[y] = temp;
      }
      function randomIntInRange(low, high) {
        return Math.round(low + Math.random() * (high - low));
      }
      function doQuickSort(ary, comparator, p, r) {
        if (p < r) {
          var pivotIndex = randomIntInRange(p, r);
          var i = p - 1;
          swap(ary, pivotIndex, r);
          var pivot = ary[r];
          for (var j = p; j < r; j++) {
            if (comparator(ary[j], pivot) <= 0) {
              i += 1;
              swap(ary, i, j);
            }
          }
          swap(ary, i + 1, j);
          var q = i + 1;
          doQuickSort(ary, comparator, p, q - 1);
          doQuickSort(ary, comparator, q + 1, r);
        }
      }
      exports.g = function (ary, comparator) {
        doQuickSort(ary, comparator, 0, ary.length - 1);
      };
    },
    6150: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var __webpack_unused_export__;
      var util = __nccwpck_require__(8715);
      var binarySearch = __nccwpck_require__(4987);
      var ArraySet = __nccwpck_require__(591).C;
      var base64VLQ = __nccwpck_require__(244);
      var quickSort = __nccwpck_require__(4249).g;
      function SourceMapConsumer(aSourceMap, aSourceMapURL) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === "string") {
          sourceMap = util.parseSourceMapInput(aSourceMap);
        }
        return sourceMap.sections != null
          ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
          : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
      }
      SourceMapConsumer.fromSourceMap = function (aSourceMap, aSourceMapURL) {
        return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
      };
      SourceMapConsumer.prototype._version = 3;
      SourceMapConsumer.prototype.__generatedMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, "_generatedMappings", {
        configurable: true,
        enumerable: true,
        get: function () {
          if (!this.__generatedMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__generatedMappings;
        },
      });
      SourceMapConsumer.prototype.__originalMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, "_originalMappings", {
        configurable: true,
        enumerable: true,
        get: function () {
          if (!this.__originalMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__originalMappings;
        },
      });
      SourceMapConsumer.prototype._charIsMappingSeparator =
        function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
          var c = aStr.charAt(index);
          return c === ";" || c === ",";
        };
      SourceMapConsumer.prototype._parseMappings =
        function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
          throw new Error("Subclasses must implement _parseMappings");
        };
      SourceMapConsumer.GENERATED_ORDER = 1;
      SourceMapConsumer.ORIGINAL_ORDER = 2;
      SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
      SourceMapConsumer.LEAST_UPPER_BOUND = 2;
      SourceMapConsumer.prototype.eachMapping =
        function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
          var context = aContext || null;
          var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
          var mappings;
          switch (order) {
            case SourceMapConsumer.GENERATED_ORDER:
              mappings = this._generatedMappings;
              break;
            case SourceMapConsumer.ORIGINAL_ORDER:
              mappings = this._originalMappings;
              break;
            default:
              throw new Error("Unknown order of iteration.");
          }
          var sourceRoot = this.sourceRoot;
          mappings
            .map(function (mapping) {
              var source =
                mapping.source === null
                  ? null
                  : this._sources.at(mapping.source);
              source = util.computeSourceURL(
                sourceRoot,
                source,
                this._sourceMapURL,
              );
              return {
                source,
                generatedLine: mapping.generatedLine,
                generatedColumn: mapping.generatedColumn,
                originalLine: mapping.originalLine,
                originalColumn: mapping.originalColumn,
                name:
                  mapping.name === null ? null : this._names.at(mapping.name),
              };
            }, this)
            .forEach(aCallback, context);
        };
      SourceMapConsumer.prototype.allGeneratedPositionsFor =
        function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
          var line = util.getArg(aArgs, "line");
          var needle = {
            source: util.getArg(aArgs, "source"),
            originalLine: line,
            originalColumn: util.getArg(aArgs, "column", 0),
          };
          needle.source = this._findSourceIndex(needle.source);
          if (needle.source < 0) {
            return [];
          }
          var mappings = [];
          var index = this._findMapping(
            needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            util.compareByOriginalPositions,
            binarySearch.LEAST_UPPER_BOUND,
          );
          if (index >= 0) {
            var mapping = this._originalMappings[index];
            if (aArgs.column === undefined) {
              var originalLine = mapping.originalLine;
              while (mapping && mapping.originalLine === originalLine) {
                mappings.push({
                  line: util.getArg(mapping, "generatedLine", null),
                  column: util.getArg(mapping, "generatedColumn", null),
                  lastColumn: util.getArg(mapping, "lastGeneratedColumn", null),
                });
                mapping = this._originalMappings[++index];
              }
            } else {
              var originalColumn = mapping.originalColumn;
              while (
                mapping &&
                mapping.originalLine === line &&
                mapping.originalColumn == originalColumn
              ) {
                mappings.push({
                  line: util.getArg(mapping, "generatedLine", null),
                  column: util.getArg(mapping, "generatedColumn", null),
                  lastColumn: util.getArg(mapping, "lastGeneratedColumn", null),
                });
                mapping = this._originalMappings[++index];
              }
            }
          }
          return mappings;
        };
      __webpack_unused_export__ = SourceMapConsumer;
      function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === "string") {
          sourceMap = util.parseSourceMapInput(aSourceMap);
        }
        var version = util.getArg(sourceMap, "version");
        var sources = util.getArg(sourceMap, "sources");
        var names = util.getArg(sourceMap, "names", []);
        var sourceRoot = util.getArg(sourceMap, "sourceRoot", null);
        var sourcesContent = util.getArg(sourceMap, "sourcesContent", null);
        var mappings = util.getArg(sourceMap, "mappings");
        var file = util.getArg(sourceMap, "file", null);
        if (version != this._version) {
          throw new Error("Unsupported version: " + version);
        }
        if (sourceRoot) {
          sourceRoot = util.normalize(sourceRoot);
        }
        sources = sources
          .map(String)
          .map(util.normalize)
          .map(function (source) {
            return sourceRoot &&
              util.isAbsolute(sourceRoot) &&
              util.isAbsolute(source)
              ? util.relative(sourceRoot, source)
              : source;
          });
        this._names = ArraySet.fromArray(names.map(String), true);
        this._sources = ArraySet.fromArray(sources, true);
        this._absoluteSources = this._sources.toArray().map(function (s) {
          return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
        });
        this.sourceRoot = sourceRoot;
        this.sourcesContent = sourcesContent;
        this._mappings = mappings;
        this._sourceMapURL = aSourceMapURL;
        this.file = file;
      }
      BasicSourceMapConsumer.prototype = Object.create(
        SourceMapConsumer.prototype,
      );
      BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
      BasicSourceMapConsumer.prototype._findSourceIndex = function (aSource) {
        var relativeSource = aSource;
        if (this.sourceRoot != null) {
          relativeSource = util.relative(this.sourceRoot, relativeSource);
        }
        if (this._sources.has(relativeSource)) {
          return this._sources.indexOf(relativeSource);
        }
        var i;
        for (i = 0; i < this._absoluteSources.length; ++i) {
          if (this._absoluteSources[i] == aSource) {
            return i;
          }
        }
        return -1;
      };
      BasicSourceMapConsumer.fromSourceMap =
        function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
          var smc = Object.create(BasicSourceMapConsumer.prototype);
          var names = (smc._names = ArraySet.fromArray(
            aSourceMap._names.toArray(),
            true,
          ));
          var sources = (smc._sources = ArraySet.fromArray(
            aSourceMap._sources.toArray(),
            true,
          ));
          smc.sourceRoot = aSourceMap._sourceRoot;
          smc.sourcesContent = aSourceMap._generateSourcesContent(
            smc._sources.toArray(),
            smc.sourceRoot,
          );
          smc.file = aSourceMap._file;
          smc._sourceMapURL = aSourceMapURL;
          smc._absoluteSources = smc._sources.toArray().map(function (s) {
            return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
          });
          var generatedMappings = aSourceMap._mappings.toArray().slice();
          var destGeneratedMappings = (smc.__generatedMappings = []);
          var destOriginalMappings = (smc.__originalMappings = []);
          for (var i = 0, length = generatedMappings.length; i < length; i++) {
            var srcMapping = generatedMappings[i];
            var destMapping = new Mapping();
            destMapping.generatedLine = srcMapping.generatedLine;
            destMapping.generatedColumn = srcMapping.generatedColumn;
            if (srcMapping.source) {
              destMapping.source = sources.indexOf(srcMapping.source);
              destMapping.originalLine = srcMapping.originalLine;
              destMapping.originalColumn = srcMapping.originalColumn;
              if (srcMapping.name) {
                destMapping.name = names.indexOf(srcMapping.name);
              }
              destOriginalMappings.push(destMapping);
            }
            destGeneratedMappings.push(destMapping);
          }
          quickSort(smc.__originalMappings, util.compareByOriginalPositions);
          return smc;
        };
      BasicSourceMapConsumer.prototype._version = 3;
      Object.defineProperty(BasicSourceMapConsumer.prototype, "sources", {
        get: function () {
          return this._absoluteSources.slice();
        },
      });
      function Mapping() {
        this.generatedLine = 0;
        this.generatedColumn = 0;
        this.source = null;
        this.originalLine = null;
        this.originalColumn = null;
        this.name = null;
      }
      BasicSourceMapConsumer.prototype._parseMappings =
        function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
          var generatedLine = 1;
          var previousGeneratedColumn = 0;
          var previousOriginalLine = 0;
          var previousOriginalColumn = 0;
          var previousSource = 0;
          var previousName = 0;
          var length = aStr.length;
          var index = 0;
          var cachedSegments = {};
          var temp = {};
          var originalMappings = [];
          var generatedMappings = [];
          var mapping, str, segment, end, value;
          while (index < length) {
            if (aStr.charAt(index) === ";") {
              generatedLine++;
              index++;
              previousGeneratedColumn = 0;
            } else if (aStr.charAt(index) === ",") {
              index++;
            } else {
              mapping = new Mapping();
              mapping.generatedLine = generatedLine;
              for (end = index; end < length; end++) {
                if (this._charIsMappingSeparator(aStr, end)) {
                  break;
                }
              }
              str = aStr.slice(index, end);
              segment = cachedSegments[str];
              if (segment) {
                index += str.length;
              } else {
                segment = [];
                while (index < end) {
                  base64VLQ.decode(aStr, index, temp);
                  value = temp.value;
                  index = temp.rest;
                  segment.push(value);
                }
                if (segment.length === 2) {
                  throw new Error("Found a source, but no line and column");
                }
                if (segment.length === 3) {
                  throw new Error("Found a source and line, but no column");
                }
                cachedSegments[str] = segment;
              }
              mapping.generatedColumn = previousGeneratedColumn + segment[0];
              previousGeneratedColumn = mapping.generatedColumn;
              if (segment.length > 1) {
                mapping.source = previousSource + segment[1];
                previousSource += segment[1];
                mapping.originalLine = previousOriginalLine + segment[2];
                previousOriginalLine = mapping.originalLine;
                mapping.originalLine += 1;
                mapping.originalColumn = previousOriginalColumn + segment[3];
                previousOriginalColumn = mapping.originalColumn;
                if (segment.length > 4) {
                  mapping.name = previousName + segment[4];
                  previousName += segment[4];
                }
              }
              generatedMappings.push(mapping);
              if (typeof mapping.originalLine === "number") {
                originalMappings.push(mapping);
              }
            }
          }
          quickSort(
            generatedMappings,
            util.compareByGeneratedPositionsDeflated,
          );
          this.__generatedMappings = generatedMappings;
          quickSort(originalMappings, util.compareByOriginalPositions);
          this.__originalMappings = originalMappings;
        };
      BasicSourceMapConsumer.prototype._findMapping =
        function SourceMapConsumer_findMapping(
          aNeedle,
          aMappings,
          aLineName,
          aColumnName,
          aComparator,
          aBias,
        ) {
          if (aNeedle[aLineName] <= 0) {
            throw new TypeError(
              "Line must be greater than or equal to 1, got " +
                aNeedle[aLineName],
            );
          }
          if (aNeedle[aColumnName] < 0) {
            throw new TypeError(
              "Column must be greater than or equal to 0, got " +
                aNeedle[aColumnName],
            );
          }
          return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
        };
      BasicSourceMapConsumer.prototype.computeColumnSpans =
        function SourceMapConsumer_computeColumnSpans() {
          for (var index = 0; index < this._generatedMappings.length; ++index) {
            var mapping = this._generatedMappings[index];
            if (index + 1 < this._generatedMappings.length) {
              var nextMapping = this._generatedMappings[index + 1];
              if (mapping.generatedLine === nextMapping.generatedLine) {
                mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
                continue;
              }
            }
            mapping.lastGeneratedColumn = Infinity;
          }
        };
      BasicSourceMapConsumer.prototype.originalPositionFor =
        function SourceMapConsumer_originalPositionFor(aArgs) {
          var needle = {
            generatedLine: util.getArg(aArgs, "line"),
            generatedColumn: util.getArg(aArgs, "column"),
          };
          var index = this._findMapping(
            needle,
            this._generatedMappings,
            "generatedLine",
            "generatedColumn",
            util.compareByGeneratedPositionsDeflated,
            util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND),
          );
          if (index >= 0) {
            var mapping = this._generatedMappings[index];
            if (mapping.generatedLine === needle.generatedLine) {
              var source = util.getArg(mapping, "source", null);
              if (source !== null) {
                source = this._sources.at(source);
                source = util.computeSourceURL(
                  this.sourceRoot,
                  source,
                  this._sourceMapURL,
                );
              }
              var name = util.getArg(mapping, "name", null);
              if (name !== null) {
                name = this._names.at(name);
              }
              return {
                source,
                line: util.getArg(mapping, "originalLine", null),
                column: util.getArg(mapping, "originalColumn", null),
                name,
              };
            }
          }
          return { source: null, line: null, column: null, name: null };
        };
      BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
        function BasicSourceMapConsumer_hasContentsOfAllSources() {
          if (!this.sourcesContent) {
            return false;
          }
          return (
            this.sourcesContent.length >= this._sources.size() &&
            !this.sourcesContent.some(function (sc) {
              return sc == null;
            })
          );
        };
      BasicSourceMapConsumer.prototype.sourceContentFor =
        function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
          if (!this.sourcesContent) {
            return null;
          }
          var index = this._findSourceIndex(aSource);
          if (index >= 0) {
            return this.sourcesContent[index];
          }
          var relativeSource = aSource;
          if (this.sourceRoot != null) {
            relativeSource = util.relative(this.sourceRoot, relativeSource);
          }
          var url;
          if (
            this.sourceRoot != null &&
            (url = util.urlParse(this.sourceRoot))
          ) {
            var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
            if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
              return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
            }
            if (
              (!url.path || url.path == "/") &&
              this._sources.has("/" + relativeSource)
            ) {
              return this.sourcesContent[
                this._sources.indexOf("/" + relativeSource)
              ];
            }
          }
          if (nullOnMissing) {
            return null;
          } else {
            throw new Error(
              '"' + relativeSource + '" is not in the SourceMap.',
            );
          }
        };
      BasicSourceMapConsumer.prototype.generatedPositionFor =
        function SourceMapConsumer_generatedPositionFor(aArgs) {
          var source = util.getArg(aArgs, "source");
          source = this._findSourceIndex(source);
          if (source < 0) {
            return { line: null, column: null, lastColumn: null };
          }
          var needle = {
            source,
            originalLine: util.getArg(aArgs, "line"),
            originalColumn: util.getArg(aArgs, "column"),
          };
          var index = this._findMapping(
            needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            util.compareByOriginalPositions,
            util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND),
          );
          if (index >= 0) {
            var mapping = this._originalMappings[index];
            if (mapping.source === needle.source) {
              return {
                line: util.getArg(mapping, "generatedLine", null),
                column: util.getArg(mapping, "generatedColumn", null),
                lastColumn: util.getArg(mapping, "lastGeneratedColumn", null),
              };
            }
          }
          return { line: null, column: null, lastColumn: null };
        };
      __webpack_unused_export__ = BasicSourceMapConsumer;
      function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === "string") {
          sourceMap = util.parseSourceMapInput(aSourceMap);
        }
        var version = util.getArg(sourceMap, "version");
        var sections = util.getArg(sourceMap, "sections");
        if (version != this._version) {
          throw new Error("Unsupported version: " + version);
        }
        this._sources = new ArraySet();
        this._names = new ArraySet();
        var lastOffset = { line: -1, column: 0 };
        this._sections = sections.map(function (s) {
          if (s.url) {
            throw new Error(
              "Support for url field in sections not implemented.",
            );
          }
          var offset = util.getArg(s, "offset");
          var offsetLine = util.getArg(offset, "line");
          var offsetColumn = util.getArg(offset, "column");
          if (
            offsetLine < lastOffset.line ||
            (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)
          ) {
            throw new Error(
              "Section offsets must be ordered and non-overlapping.",
            );
          }
          lastOffset = offset;
          return {
            generatedOffset: {
              generatedLine: offsetLine + 1,
              generatedColumn: offsetColumn + 1,
            },
            consumer: new SourceMapConsumer(
              util.getArg(s, "map"),
              aSourceMapURL,
            ),
          };
        });
      }
      IndexedSourceMapConsumer.prototype = Object.create(
        SourceMapConsumer.prototype,
      );
      IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
      IndexedSourceMapConsumer.prototype._version = 3;
      Object.defineProperty(IndexedSourceMapConsumer.prototype, "sources", {
        get: function () {
          var sources = [];
          for (var i = 0; i < this._sections.length; i++) {
            for (
              var j = 0;
              j < this._sections[i].consumer.sources.length;
              j++
            ) {
              sources.push(this._sections[i].consumer.sources[j]);
            }
          }
          return sources;
        },
      });
      IndexedSourceMapConsumer.prototype.originalPositionFor =
        function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
          var needle = {
            generatedLine: util.getArg(aArgs, "line"),
            generatedColumn: util.getArg(aArgs, "column"),
          };
          var sectionIndex = binarySearch.search(
            needle,
            this._sections,
            function (needle, section) {
              var cmp =
                needle.generatedLine - section.generatedOffset.generatedLine;
              if (cmp) {
                return cmp;
              }
              return (
                needle.generatedColumn - section.generatedOffset.generatedColumn
              );
            },
          );
          var section = this._sections[sectionIndex];
          if (!section) {
            return { source: null, line: null, column: null, name: null };
          }
          return section.consumer.originalPositionFor({
            line:
              needle.generatedLine -
              (section.generatedOffset.generatedLine - 1),
            column:
              needle.generatedColumn -
              (section.generatedOffset.generatedLine === needle.generatedLine
                ? section.generatedOffset.generatedColumn - 1
                : 0),
            bias: aArgs.bias,
          });
        };
      IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
        function IndexedSourceMapConsumer_hasContentsOfAllSources() {
          return this._sections.every(function (s) {
            return s.consumer.hasContentsOfAllSources();
          });
        };
      IndexedSourceMapConsumer.prototype.sourceContentFor =
        function IndexedSourceMapConsumer_sourceContentFor(
          aSource,
          nullOnMissing,
        ) {
          for (var i = 0; i < this._sections.length; i++) {
            var section = this._sections[i];
            var content = section.consumer.sourceContentFor(aSource, true);
            if (content) {
              return content;
            }
          }
          if (nullOnMissing) {
            return null;
          } else {
            throw new Error('"' + aSource + '" is not in the SourceMap.');
          }
        };
      IndexedSourceMapConsumer.prototype.generatedPositionFor =
        function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
          for (var i = 0; i < this._sections.length; i++) {
            var section = this._sections[i];
            if (
              section.consumer._findSourceIndex(
                util.getArg(aArgs, "source"),
              ) === -1
            ) {
              continue;
            }
            var generatedPosition =
              section.consumer.generatedPositionFor(aArgs);
            if (generatedPosition) {
              var ret = {
                line:
                  generatedPosition.line +
                  (section.generatedOffset.generatedLine - 1),
                column:
                  generatedPosition.column +
                  (section.generatedOffset.generatedLine ===
                  generatedPosition.line
                    ? section.generatedOffset.generatedColumn - 1
                    : 0),
              };
              return ret;
            }
          }
          return { line: null, column: null };
        };
      IndexedSourceMapConsumer.prototype._parseMappings =
        function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
          this.__generatedMappings = [];
          this.__originalMappings = [];
          for (var i = 0; i < this._sections.length; i++) {
            var section = this._sections[i];
            var sectionMappings = section.consumer._generatedMappings;
            for (var j = 0; j < sectionMappings.length; j++) {
              var mapping = sectionMappings[j];
              var source = section.consumer._sources.at(mapping.source);
              source = util.computeSourceURL(
                section.consumer.sourceRoot,
                source,
                this._sourceMapURL,
              );
              this._sources.add(source);
              source = this._sources.indexOf(source);
              var name = null;
              if (mapping.name) {
                name = section.consumer._names.at(mapping.name);
                this._names.add(name);
                name = this._names.indexOf(name);
              }
              var adjustedMapping = {
                source,
                generatedLine:
                  mapping.generatedLine +
                  (section.generatedOffset.generatedLine - 1),
                generatedColumn:
                  mapping.generatedColumn +
                  (section.generatedOffset.generatedLine ===
                  mapping.generatedLine
                    ? section.generatedOffset.generatedColumn - 1
                    : 0),
                originalLine: mapping.originalLine,
                originalColumn: mapping.originalColumn,
                name,
              };
              this.__generatedMappings.push(adjustedMapping);
              if (typeof adjustedMapping.originalLine === "number") {
                this.__originalMappings.push(adjustedMapping);
              }
            }
          }
          quickSort(
            this.__generatedMappings,
            util.compareByGeneratedPositionsDeflated,
          );
          quickSort(this.__originalMappings, util.compareByOriginalPositions);
        };
      __webpack_unused_export__ = IndexedSourceMapConsumer;
    },
    4601: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var base64VLQ = __nccwpck_require__(244);
      var util = __nccwpck_require__(8715);
      var ArraySet = __nccwpck_require__(591).C;
      var MappingList = __nccwpck_require__(5526).P;
      function SourceMapGenerator(aArgs) {
        if (!aArgs) {
          aArgs = {};
        }
        this._file = util.getArg(aArgs, "file", null);
        this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
        this._skipValidation = util.getArg(aArgs, "skipValidation", false);
        this._sources = new ArraySet();
        this._names = new ArraySet();
        this._mappings = new MappingList();
        this._sourcesContents = null;
      }
      SourceMapGenerator.prototype._version = 3;
      SourceMapGenerator.fromSourceMap =
        function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
          var sourceRoot = aSourceMapConsumer.sourceRoot;
          var generator = new SourceMapGenerator({
            file: aSourceMapConsumer.file,
            sourceRoot,
          });
          aSourceMapConsumer.eachMapping(function (mapping) {
            var newMapping = {
              generated: {
                line: mapping.generatedLine,
                column: mapping.generatedColumn,
              },
            };
            if (mapping.source != null) {
              newMapping.source = mapping.source;
              if (sourceRoot != null) {
                newMapping.source = util.relative(
                  sourceRoot,
                  newMapping.source,
                );
              }
              newMapping.original = {
                line: mapping.originalLine,
                column: mapping.originalColumn,
              };
              if (mapping.name != null) {
                newMapping.name = mapping.name;
              }
            }
            generator.addMapping(newMapping);
          });
          aSourceMapConsumer.sources.forEach(function (sourceFile) {
            var sourceRelative = sourceFile;
            if (sourceRoot !== null) {
              sourceRelative = util.relative(sourceRoot, sourceFile);
            }
            if (!generator._sources.has(sourceRelative)) {
              generator._sources.add(sourceRelative);
            }
            var content = aSourceMapConsumer.sourceContentFor(sourceFile);
            if (content != null) {
              generator.setSourceContent(sourceFile, content);
            }
          });
          return generator;
        };
      SourceMapGenerator.prototype.addMapping =
        function SourceMapGenerator_addMapping(aArgs) {
          var generated = util.getArg(aArgs, "generated");
          var original = util.getArg(aArgs, "original", null);
          var source = util.getArg(aArgs, "source", null);
          var name = util.getArg(aArgs, "name", null);
          if (!this._skipValidation) {
            this._validateMapping(generated, original, source, name);
          }
          if (source != null) {
            source = String(source);
            if (!this._sources.has(source)) {
              this._sources.add(source);
            }
          }
          if (name != null) {
            name = String(name);
            if (!this._names.has(name)) {
              this._names.add(name);
            }
          }
          this._mappings.add({
            generatedLine: generated.line,
            generatedColumn: generated.column,
            originalLine: original != null && original.line,
            originalColumn: original != null && original.column,
            source,
            name,
          });
        };
      SourceMapGenerator.prototype.setSourceContent =
        function SourceMapGenerator_setSourceContent(
          aSourceFile,
          aSourceContent,
        ) {
          var source = aSourceFile;
          if (this._sourceRoot != null) {
            source = util.relative(this._sourceRoot, source);
          }
          if (aSourceContent != null) {
            if (!this._sourcesContents) {
              this._sourcesContents = Object.create(null);
            }
            this._sourcesContents[util.toSetString(source)] = aSourceContent;
          } else if (this._sourcesContents) {
            delete this._sourcesContents[util.toSetString(source)];
            if (Object.keys(this._sourcesContents).length === 0) {
              this._sourcesContents = null;
            }
          }
        };
      SourceMapGenerator.prototype.applySourceMap =
        function SourceMapGenerator_applySourceMap(
          aSourceMapConsumer,
          aSourceFile,
          aSourceMapPath,
        ) {
          var sourceFile = aSourceFile;
          if (aSourceFile == null) {
            if (aSourceMapConsumer.file == null) {
              throw new Error(
                "SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, " +
                  'or the source map\'s "file" property. Both were omitted.',
              );
            }
            sourceFile = aSourceMapConsumer.file;
          }
          var sourceRoot = this._sourceRoot;
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          var newSources = new ArraySet();
          var newNames = new ArraySet();
          this._mappings.unsortedForEach(function (mapping) {
            if (mapping.source === sourceFile && mapping.originalLine != null) {
              var original = aSourceMapConsumer.originalPositionFor({
                line: mapping.originalLine,
                column: mapping.originalColumn,
              });
              if (original.source != null) {
                mapping.source = original.source;
                if (aSourceMapPath != null) {
                  mapping.source = util.join(aSourceMapPath, mapping.source);
                }
                if (sourceRoot != null) {
                  mapping.source = util.relative(sourceRoot, mapping.source);
                }
                mapping.originalLine = original.line;
                mapping.originalColumn = original.column;
                if (original.name != null) {
                  mapping.name = original.name;
                }
              }
            }
            var source = mapping.source;
            if (source != null && !newSources.has(source)) {
              newSources.add(source);
            }
            var name = mapping.name;
            if (name != null && !newNames.has(name)) {
              newNames.add(name);
            }
          }, this);
          this._sources = newSources;
          this._names = newNames;
          aSourceMapConsumer.sources.forEach(function (sourceFile) {
            var content = aSourceMapConsumer.sourceContentFor(sourceFile);
            if (content != null) {
              if (aSourceMapPath != null) {
                sourceFile = util.join(aSourceMapPath, sourceFile);
              }
              if (sourceRoot != null) {
                sourceFile = util.relative(sourceRoot, sourceFile);
              }
              this.setSourceContent(sourceFile, content);
            }
          }, this);
        };
      SourceMapGenerator.prototype._validateMapping =
        function SourceMapGenerator_validateMapping(
          aGenerated,
          aOriginal,
          aSource,
          aName,
        ) {
          if (
            aOriginal &&
            typeof aOriginal.line !== "number" &&
            typeof aOriginal.column !== "number"
          ) {
            throw new Error(
              "original.line and original.column are not numbers -- you probably meant to omit " +
                "the original mapping entirely and only map the generated position. If so, pass " +
                "null for the original mapping instead of an object with empty or null values.",
            );
          }
          if (
            aGenerated &&
            "line" in aGenerated &&
            "column" in aGenerated &&
            aGenerated.line > 0 &&
            aGenerated.column >= 0 &&
            !aOriginal &&
            !aSource &&
            !aName
          ) {
            return;
          } else if (
            aGenerated &&
            "line" in aGenerated &&
            "column" in aGenerated &&
            aOriginal &&
            "line" in aOriginal &&
            "column" in aOriginal &&
            aGenerated.line > 0 &&
            aGenerated.column >= 0 &&
            aOriginal.line > 0 &&
            aOriginal.column >= 0 &&
            aSource
          ) {
            return;
          } else {
            throw new Error(
              "Invalid mapping: " +
                JSON.stringify({
                  generated: aGenerated,
                  source: aSource,
                  original: aOriginal,
                  name: aName,
                }),
            );
          }
        };
      SourceMapGenerator.prototype._serializeMappings =
        function SourceMapGenerator_serializeMappings() {
          var previousGeneratedColumn = 0;
          var previousGeneratedLine = 1;
          var previousOriginalColumn = 0;
          var previousOriginalLine = 0;
          var previousName = 0;
          var previousSource = 0;
          var result = "";
          var next;
          var mapping;
          var nameIdx;
          var sourceIdx;
          var mappings = this._mappings.toArray();
          for (var i = 0, len = mappings.length; i < len; i++) {
            mapping = mappings[i];
            next = "";
            if (mapping.generatedLine !== previousGeneratedLine) {
              previousGeneratedColumn = 0;
              while (mapping.generatedLine !== previousGeneratedLine) {
                next += ";";
                previousGeneratedLine++;
              }
            } else {
              if (i > 0) {
                if (
                  !util.compareByGeneratedPositionsInflated(
                    mapping,
                    mappings[i - 1],
                  )
                ) {
                  continue;
                }
                next += ",";
              }
            }
            next += base64VLQ.encode(
              mapping.generatedColumn - previousGeneratedColumn,
            );
            previousGeneratedColumn = mapping.generatedColumn;
            if (mapping.source != null) {
              sourceIdx = this._sources.indexOf(mapping.source);
              next += base64VLQ.encode(sourceIdx - previousSource);
              previousSource = sourceIdx;
              next += base64VLQ.encode(
                mapping.originalLine - 1 - previousOriginalLine,
              );
              previousOriginalLine = mapping.originalLine - 1;
              next += base64VLQ.encode(
                mapping.originalColumn - previousOriginalColumn,
              );
              previousOriginalColumn = mapping.originalColumn;
              if (mapping.name != null) {
                nameIdx = this._names.indexOf(mapping.name);
                next += base64VLQ.encode(nameIdx - previousName);
                previousName = nameIdx;
              }
            }
            result += next;
          }
          return result;
        };
      SourceMapGenerator.prototype._generateSourcesContent =
        function SourceMapGenerator_generateSourcesContent(
          aSources,
          aSourceRoot,
        ) {
          return aSources.map(function (source) {
            if (!this._sourcesContents) {
              return null;
            }
            if (aSourceRoot != null) {
              source = util.relative(aSourceRoot, source);
            }
            var key = util.toSetString(source);
            return Object.prototype.hasOwnProperty.call(
              this._sourcesContents,
              key,
            )
              ? this._sourcesContents[key]
              : null;
          }, this);
        };
      SourceMapGenerator.prototype.toJSON =
        function SourceMapGenerator_toJSON() {
          var map = {
            version: this._version,
            sources: this._sources.toArray(),
            names: this._names.toArray(),
            mappings: this._serializeMappings(),
          };
          if (this._file != null) {
            map.file = this._file;
          }
          if (this._sourceRoot != null) {
            map.sourceRoot = this._sourceRoot;
          }
          if (this._sourcesContents) {
            map.sourcesContent = this._generateSourcesContent(
              map.sources,
              map.sourceRoot,
            );
          }
          return map;
        };
      SourceMapGenerator.prototype.toString =
        function SourceMapGenerator_toString() {
          return JSON.stringify(this.toJSON());
        };
      exports.SourceMapGenerator = SourceMapGenerator;
    },
    1395: (__unused_webpack_module, exports, __nccwpck_require__) => {
      var __webpack_unused_export__;
      var SourceMapGenerator = __nccwpck_require__(4601).SourceMapGenerator;
      var util = __nccwpck_require__(8715);
      var REGEX_NEWLINE = /(\r?\n)/;
      var NEWLINE_CODE = 10;
      var isSourceNode = "$$$isSourceNode$$$";
      function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
        this.children = [];
        this.sourceContents = {};
        this.line = aLine == null ? null : aLine;
        this.column = aColumn == null ? null : aColumn;
        this.source = aSource == null ? null : aSource;
        this.name = aName == null ? null : aName;
        this[isSourceNode] = true;
        if (aChunks != null) this.add(aChunks);
      }
      SourceNode.fromStringWithSourceMap =
        function SourceNode_fromStringWithSourceMap(
          aGeneratedCode,
          aSourceMapConsumer,
          aRelativePath,
        ) {
          var node = new SourceNode();
          var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
          var remainingLinesIndex = 0;
          var shiftNextLine = function () {
            var lineContents = getNextLine();
            var newLine = getNextLine() || "";
            return lineContents + newLine;
            function getNextLine() {
              return remainingLinesIndex < remainingLines.length
                ? remainingLines[remainingLinesIndex++]
                : undefined;
            }
          };
          var lastGeneratedLine = 1,
            lastGeneratedColumn = 0;
          var lastMapping = null;
          aSourceMapConsumer.eachMapping(function (mapping) {
            if (lastMapping !== null) {
              if (lastGeneratedLine < mapping.generatedLine) {
                addMappingWithCode(lastMapping, shiftNextLine());
                lastGeneratedLine++;
                lastGeneratedColumn = 0;
              } else {
                var nextLine = remainingLines[remainingLinesIndex] || "";
                var code = nextLine.substr(
                  0,
                  mapping.generatedColumn - lastGeneratedColumn,
                );
                remainingLines[remainingLinesIndex] = nextLine.substr(
                  mapping.generatedColumn - lastGeneratedColumn,
                );
                lastGeneratedColumn = mapping.generatedColumn;
                addMappingWithCode(lastMapping, code);
                lastMapping = mapping;
                return;
              }
            }
            while (lastGeneratedLine < mapping.generatedLine) {
              node.add(shiftNextLine());
              lastGeneratedLine++;
            }
            if (lastGeneratedColumn < mapping.generatedColumn) {
              var nextLine = remainingLines[remainingLinesIndex] || "";
              node.add(nextLine.substr(0, mapping.generatedColumn));
              remainingLines[remainingLinesIndex] = nextLine.substr(
                mapping.generatedColumn,
              );
              lastGeneratedColumn = mapping.generatedColumn;
            }
            lastMapping = mapping;
          }, this);
          if (remainingLinesIndex < remainingLines.length) {
            if (lastMapping) {
              addMappingWithCode(lastMapping, shiftNextLine());
            }
            node.add(remainingLines.splice(remainingLinesIndex).join(""));
          }
          aSourceMapConsumer.sources.forEach(function (sourceFile) {
            var content = aSourceMapConsumer.sourceContentFor(sourceFile);
            if (content != null) {
              if (aRelativePath != null) {
                sourceFile = util.join(aRelativePath, sourceFile);
              }
              node.setSourceContent(sourceFile, content);
            }
          });
          return node;
          function addMappingWithCode(mapping, code) {
            if (mapping === null || mapping.source === undefined) {
              node.add(code);
            } else {
              var source = aRelativePath
                ? util.join(aRelativePath, mapping.source)
                : mapping.source;
              node.add(
                new SourceNode(
                  mapping.originalLine,
                  mapping.originalColumn,
                  source,
                  code,
                  mapping.name,
                ),
              );
            }
          }
        };
      SourceNode.prototype.add = function SourceNode_add(aChunk) {
        if (Array.isArray(aChunk)) {
          aChunk.forEach(function (chunk) {
            this.add(chunk);
          }, this);
        } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
          if (aChunk) {
            this.children.push(aChunk);
          }
        } else {
          throw new TypeError(
            "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " +
              aChunk,
          );
        }
        return this;
      };
      SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
        if (Array.isArray(aChunk)) {
          for (var i = aChunk.length - 1; i >= 0; i--) {
            this.prepend(aChunk[i]);
          }
        } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
          this.children.unshift(aChunk);
        } else {
          throw new TypeError(
            "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " +
              aChunk,
          );
        }
        return this;
      };
      SourceNode.prototype.walk = function SourceNode_walk(aFn) {
        var chunk;
        for (var i = 0, len = this.children.length; i < len; i++) {
          chunk = this.children[i];
          if (chunk[isSourceNode]) {
            chunk.walk(aFn);
          } else {
            if (chunk !== "") {
              aFn(chunk, {
                source: this.source,
                line: this.line,
                column: this.column,
                name: this.name,
              });
            }
          }
        }
      };
      SourceNode.prototype.join = function SourceNode_join(aSep) {
        var newChildren;
        var i;
        var len = this.children.length;
        if (len > 0) {
          newChildren = [];
          for (i = 0; i < len - 1; i++) {
            newChildren.push(this.children[i]);
            newChildren.push(aSep);
          }
          newChildren.push(this.children[i]);
          this.children = newChildren;
        }
        return this;
      };
      SourceNode.prototype.replaceRight = function SourceNode_replaceRight(
        aPattern,
        aReplacement,
      ) {
        var lastChild = this.children[this.children.length - 1];
        if (lastChild[isSourceNode]) {
          lastChild.replaceRight(aPattern, aReplacement);
        } else if (typeof lastChild === "string") {
          this.children[this.children.length - 1] = lastChild.replace(
            aPattern,
            aReplacement,
          );
        } else {
          this.children.push("".replace(aPattern, aReplacement));
        }
        return this;
      };
      SourceNode.prototype.setSourceContent =
        function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
          this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
        };
      SourceNode.prototype.walkSourceContents =
        function SourceNode_walkSourceContents(aFn) {
          for (var i = 0, len = this.children.length; i < len; i++) {
            if (this.children[i][isSourceNode]) {
              this.children[i].walkSourceContents(aFn);
            }
          }
          var sources = Object.keys(this.sourceContents);
          for (var i = 0, len = sources.length; i < len; i++) {
            aFn(
              util.fromSetString(sources[i]),
              this.sourceContents[sources[i]],
            );
          }
        };
      SourceNode.prototype.toString = function SourceNode_toString() {
        var str = "";
        this.walk(function (chunk) {
          str += chunk;
        });
        return str;
      };
      SourceNode.prototype.toStringWithSourceMap =
        function SourceNode_toStringWithSourceMap(aArgs) {
          var generated = { code: "", line: 1, column: 0 };
          var map = new SourceMapGenerator(aArgs);
          var sourceMappingActive = false;
          var lastOriginalSource = null;
          var lastOriginalLine = null;
          var lastOriginalColumn = null;
          var lastOriginalName = null;
          this.walk(function (chunk, original) {
            generated.code += chunk;
            if (
              original.source !== null &&
              original.line !== null &&
              original.column !== null
            ) {
              if (
                lastOriginalSource !== original.source ||
                lastOriginalLine !== original.line ||
                lastOriginalColumn !== original.column ||
                lastOriginalName !== original.name
              ) {
                map.addMapping({
                  source: original.source,
                  original: { line: original.line, column: original.column },
                  generated: { line: generated.line, column: generated.column },
                  name: original.name,
                });
              }
              lastOriginalSource = original.source;
              lastOriginalLine = original.line;
              lastOriginalColumn = original.column;
              lastOriginalName = original.name;
              sourceMappingActive = true;
            } else if (sourceMappingActive) {
              map.addMapping({
                generated: { line: generated.line, column: generated.column },
              });
              lastOriginalSource = null;
              sourceMappingActive = false;
            }
            for (var idx = 0, length = chunk.length; idx < length; idx++) {
              if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
                generated.line++;
                generated.column = 0;
                if (idx + 1 === length) {
                  lastOriginalSource = null;
                  sourceMappingActive = false;
                } else if (sourceMappingActive) {
                  map.addMapping({
                    source: original.source,
                    original: { line: original.line, column: original.column },
                    generated: {
                      line: generated.line,
                      column: generated.column,
                    },
                    name: original.name,
                  });
                }
              } else {
                generated.column++;
              }
            }
          });
          this.walkSourceContents(function (sourceFile, sourceContent) {
            map.setSourceContent(sourceFile, sourceContent);
          });
          return { code: generated.code, map };
        };
      __webpack_unused_export__ = SourceNode;
    },
    8715: (__unused_webpack_module, exports) => {
      function getArg(aArgs, aName, aDefaultValue) {
        if (aName in aArgs) {
          return aArgs[aName];
        } else if (arguments.length === 3) {
          return aDefaultValue;
        } else {
          throw new Error('"' + aName + '" is a required argument.');
        }
      }
      exports.getArg = getArg;
      var urlRegexp =
        /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
      var dataUrlRegexp = /^data:.+\,.+$/;
      function urlParse(aUrl) {
        var match = aUrl.match(urlRegexp);
        if (!match) {
          return null;
        }
        return {
          scheme: match[1],
          auth: match[2],
          host: match[3],
          port: match[4],
          path: match[5],
        };
      }
      exports.urlParse = urlParse;
      function urlGenerate(aParsedUrl) {
        var url = "";
        if (aParsedUrl.scheme) {
          url += aParsedUrl.scheme + ":";
        }
        url += "//";
        if (aParsedUrl.auth) {
          url += aParsedUrl.auth + "@";
        }
        if (aParsedUrl.host) {
          url += aParsedUrl.host;
        }
        if (aParsedUrl.port) {
          url += ":" + aParsedUrl.port;
        }
        if (aParsedUrl.path) {
          url += aParsedUrl.path;
        }
        return url;
      }
      exports.urlGenerate = urlGenerate;
      function normalize(aPath) {
        var path = aPath;
        var url = urlParse(aPath);
        if (url) {
          if (!url.path) {
            return aPath;
          }
          path = url.path;
        }
        var isAbsolute = exports.isAbsolute(path);
        var parts = path.split(/\/+/);
        for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
          part = parts[i];
          if (part === ".") {
            parts.splice(i, 1);
          } else if (part === "..") {
            up++;
          } else if (up > 0) {
            if (part === "") {
              parts.splice(i + 1, up);
              up = 0;
            } else {
              parts.splice(i, 2);
              up--;
            }
          }
        }
        path = parts.join("/");
        if (path === "") {
          path = isAbsolute ? "/" : ".";
        }
        if (url) {
          url.path = path;
          return urlGenerate(url);
        }
        return path;
      }
      exports.normalize = normalize;
      function join(aRoot, aPath) {
        if (aRoot === "") {
          aRoot = ".";
        }
        if (aPath === "") {
          aPath = ".";
        }
        var aPathUrl = urlParse(aPath);
        var aRootUrl = urlParse(aRoot);
        if (aRootUrl) {
          aRoot = aRootUrl.path || "/";
        }
        if (aPathUrl && !aPathUrl.scheme) {
          if (aRootUrl) {
            aPathUrl.scheme = aRootUrl.scheme;
          }
          return urlGenerate(aPathUrl);
        }
        if (aPathUrl || aPath.match(dataUrlRegexp)) {
          return aPath;
        }
        if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
          aRootUrl.host = aPath;
          return urlGenerate(aRootUrl);
        }
        var joined =
          aPath.charAt(0) === "/"
            ? aPath
            : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);
        if (aRootUrl) {
          aRootUrl.path = joined;
          return urlGenerate(aRootUrl);
        }
        return joined;
      }
      exports.join = join;
      exports.isAbsolute = function (aPath) {
        return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
      };
      function relative(aRoot, aPath) {
        if (aRoot === "") {
          aRoot = ".";
        }
        aRoot = aRoot.replace(/\/$/, "");
        var level = 0;
        while (aPath.indexOf(aRoot + "/") !== 0) {
          var index = aRoot.lastIndexOf("/");
          if (index < 0) {
            return aPath;
          }
          aRoot = aRoot.slice(0, index);
          if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
            return aPath;
          }
          ++level;
        }
        return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
      }
      exports.relative = relative;
      var supportsNullProto = (function () {
        var obj = Object.create(null);
        return !("__proto__" in obj);
      })();
      function identity(s) {
        return s;
      }
      function toSetString(aStr) {
        if (isProtoString(aStr)) {
          return "$" + aStr;
        }
        return aStr;
      }
      exports.toSetString = supportsNullProto ? identity : toSetString;
      function fromSetString(aStr) {
        if (isProtoString(aStr)) {
          return aStr.slice(1);
        }
        return aStr;
      }
      exports.fromSetString = supportsNullProto ? identity : fromSetString;
      function isProtoString(s) {
        if (!s) {
          return false;
        }
        var length = s.length;
        if (length < 9) {
          return false;
        }
        if (
          s.charCodeAt(length - 1) !== 95 ||
          s.charCodeAt(length - 2) !== 95 ||
          s.charCodeAt(length - 3) !== 111 ||
          s.charCodeAt(length - 4) !== 116 ||
          s.charCodeAt(length - 5) !== 111 ||
          s.charCodeAt(length - 6) !== 114 ||
          s.charCodeAt(length - 7) !== 112 ||
          s.charCodeAt(length - 8) !== 95 ||
          s.charCodeAt(length - 9) !== 95
        ) {
          return false;
        }
        for (var i = length - 10; i >= 0; i--) {
          if (s.charCodeAt(i) !== 36) {
            return false;
          }
        }
        return true;
      }
      function compareByOriginalPositions(
        mappingA,
        mappingB,
        onlyCompareOriginal,
      ) {
        var cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp !== 0 || onlyCompareOriginal) {
          return cmp;
        }
        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp !== 0) {
          return cmp;
        }
        return strcmp(mappingA.name, mappingB.name);
      }
      exports.compareByOriginalPositions = compareByOriginalPositions;
      function compareByGeneratedPositionsDeflated(
        mappingA,
        mappingB,
        onlyCompareGenerated,
      ) {
        var cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp !== 0 || onlyCompareGenerated) {
          return cmp;
        }
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp !== 0) {
          return cmp;
        }
        return strcmp(mappingA.name, mappingB.name);
      }
      exports.compareByGeneratedPositionsDeflated =
        compareByGeneratedPositionsDeflated;
      function strcmp(aStr1, aStr2) {
        if (aStr1 === aStr2) {
          return 0;
        }
        if (aStr1 === null) {
          return 1;
        }
        if (aStr2 === null) {
          return -1;
        }
        if (aStr1 > aStr2) {
          return 1;
        }
        return -1;
      }
      function compareByGeneratedPositionsInflated(mappingA, mappingB) {
        var cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp !== 0) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp !== 0) {
          return cmp;
        }
        return strcmp(mappingA.name, mappingB.name);
      }
      exports.compareByGeneratedPositionsInflated =
        compareByGeneratedPositionsInflated;
      function parseSourceMapInput(str) {
        return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
      }
      exports.parseSourceMapInput = parseSourceMapInput;
      function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
        sourceURL = sourceURL || "";
        if (sourceRoot) {
          if (
            sourceRoot[sourceRoot.length - 1] !== "/" &&
            sourceURL[0] !== "/"
          ) {
            sourceRoot += "/";
          }
          sourceURL = sourceRoot + sourceURL;
        }
        if (sourceMapURL) {
          var parsed = urlParse(sourceMapURL);
          if (!parsed) {
            throw new Error("sourceMapURL could not be parsed");
          }
          if (parsed.path) {
            var index = parsed.path.lastIndexOf("/");
            if (index >= 0) {
              parsed.path = parsed.path.substring(0, index + 1);
            }
          }
          sourceURL = join(urlGenerate(parsed), sourceURL);
        }
        return normalize(sourceURL);
      }
      exports.computeSourceURL = computeSourceURL;
    },
    1361: (__unused_webpack_module, exports, __nccwpck_require__) => {
      exports.SourceMapGenerator = __nccwpck_require__(4601).SourceMapGenerator;
      __nccwpck_require__(6150);
      __nccwpck_require__(1395);
    },
    5477: (module) => {
      var __extends;
      var __assign;
      var __rest;
      var __decorate;
      var __param;
      var __esDecorate;
      var __runInitializers;
      var __propKey;
      var __setFunctionName;
      var __metadata;
      var __awaiter;
      var __generator;
      var __exportStar;
      var __values;
      var __read;
      var __spread;
      var __spreadArrays;
      var __spreadArray;
      var __await;
      var __asyncGenerator;
      var __asyncDelegator;
      var __asyncValues;
      var __makeTemplateObject;
      var __importStar;
      var __importDefault;
      var __classPrivateFieldGet;
      var __classPrivateFieldSet;
      var __classPrivateFieldIn;
      var __createBinding;
      var __addDisposableResource;
      var __disposeResources;
      var __rewriteRelativeImportExtension;
      (function (factory) {
        var root =
          typeof global === "object"
            ? global
            : typeof self === "object"
              ? self
              : typeof this === "object"
                ? this
                : {};
        if (typeof define === "function" && define.amd) {
          define("tslib", ["exports"], function (exports) {
            factory(createExporter(root, createExporter(exports)));
          });
        } else if (true && typeof module.exports === "object") {
          factory(createExporter(root, createExporter(module.exports)));
        } else {
          factory(createExporter(root));
        }
        function createExporter(exports, previous) {
          if (exports !== root) {
            if (typeof Object.create === "function") {
              Object.defineProperty(exports, "__esModule", { value: true });
            } else {
              exports.__esModule = true;
            }
          }
          return function (id, v) {
            return (exports[id] = previous ? previous(id, v) : v);
          };
        }
      })(function (exporter) {
        var extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (d, b) {
              d.__proto__ = b;
            }) ||
          function (d, b) {
            for (var p in b)
              if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
          };
        __extends = function (d, b) {
          if (typeof b !== "function" && b !== null)
            throw new TypeError(
              "Class extends value " +
                String(b) +
                " is not a constructor or null",
            );
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype =
            b === null
              ? Object.create(b)
              : ((__.prototype = b.prototype), new __());
        };
        __assign =
          Object.assign ||
          function (t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
          };
        __rest = function (s, e) {
          var t = {};
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
              t[p] = s[p];
          if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (
              var i = 0, p = Object.getOwnPropertySymbols(s);
              i < p.length;
              i++
            ) {
              if (
                e.indexOf(p[i]) < 0 &&
                Object.prototype.propertyIsEnumerable.call(s, p[i])
              )
                t[p[i]] = s[p[i]];
            }
          return t;
        };
        __decorate = function (decorators, target, key, desc) {
          var c = arguments.length,
            r =
              c < 3
                ? target
                : desc === null
                  ? (desc = Object.getOwnPropertyDescriptor(target, key))
                  : desc,
            d;
          if (
            typeof Reflect === "object" &&
            typeof Reflect.decorate === "function"
          )
            r = Reflect.decorate(decorators, target, key, desc);
          else
            for (var i = decorators.length - 1; i >= 0; i--)
              if ((d = decorators[i]))
                r =
                  (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) ||
                  r;
          return (c > 3 && r && Object.defineProperty(target, key, r), r);
        };
        __param = function (paramIndex, decorator) {
          return function (target, key) {
            decorator(target, key, paramIndex);
          };
        };
        __esDecorate = function (
          ctor,
          descriptorIn,
          decorators,
          contextIn,
          initializers,
          extraInitializers,
        ) {
          function accept(f) {
            if (f !== void 0 && typeof f !== "function")
              throw new TypeError("Function expected");
            return f;
          }
          var kind = contextIn.kind,
            key =
              kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
          var target =
            !descriptorIn && ctor
              ? contextIn["static"]
                ? ctor
                : ctor.prototype
              : null;
          var descriptor =
            descriptorIn ||
            (target
              ? Object.getOwnPropertyDescriptor(target, contextIn.name)
              : {});
          var _,
            done = false;
          for (var i = decorators.length - 1; i >= 0; i--) {
            var context = {};
            for (var p in contextIn)
              context[p] = p === "access" ? {} : contextIn[p];
            for (var p in contextIn.access)
              context.access[p] = contextIn.access[p];
            context.addInitializer = function (f) {
              if (done)
                throw new TypeError(
                  "Cannot add initializers after decoration has completed",
                );
              extraInitializers.push(accept(f || null));
            };
            var result = (0, decorators[i])(
              kind === "accessor"
                ? { get: descriptor.get, set: descriptor.set }
                : descriptor[key],
              context,
            );
            if (kind === "accessor") {
              if (result === void 0) continue;
              if (result === null || typeof result !== "object")
                throw new TypeError("Object expected");
              if ((_ = accept(result.get))) descriptor.get = _;
              if ((_ = accept(result.set))) descriptor.set = _;
              if ((_ = accept(result.init))) initializers.unshift(_);
            } else if ((_ = accept(result))) {
              if (kind === "field") initializers.unshift(_);
              else descriptor[key] = _;
            }
          }
          if (target) Object.defineProperty(target, contextIn.name, descriptor);
          done = true;
        };
        __runInitializers = function (thisArg, initializers, value) {
          var useValue = arguments.length > 2;
          for (var i = 0; i < initializers.length; i++) {
            value = useValue
              ? initializers[i].call(thisArg, value)
              : initializers[i].call(thisArg);
          }
          return useValue ? value : void 0;
        };
        __propKey = function (x) {
          return typeof x === "symbol" ? x : "".concat(x);
        };
        __setFunctionName = function (f, name, prefix) {
          if (typeof name === "symbol")
            name = name.description ? "[".concat(name.description, "]") : "";
          return Object.defineProperty(f, "name", {
            configurable: true,
            value: prefix ? "".concat(prefix, " ", name) : name,
          });
        };
        __metadata = function (metadataKey, metadataValue) {
          if (
            typeof Reflect === "object" &&
            typeof Reflect.metadata === "function"
          )
            return Reflect.metadata(metadataKey, metadataValue);
        };
        __awaiter = function (thisArg, _arguments, P, generator) {
          function adopt(value) {
            return value instanceof P
              ? value
              : new P(function (resolve) {
                  resolve(value);
                });
          }
          return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
              try {
                step(generator.next(value));
              } catch (e) {
                reject(e);
              }
            }
            function rejected(value) {
              try {
                step(generator["throw"](value));
              } catch (e) {
                reject(e);
              }
            }
            function step(result) {
              result.done
                ? resolve(result.value)
                : adopt(result.value).then(fulfilled, rejected);
            }
            step(
              (generator = generator.apply(thisArg, _arguments || [])).next(),
            );
          });
        };
        __generator = function (thisArg, body) {
          var _ = {
              label: 0,
              sent: function () {
                if (t[0] & 1) throw t[1];
                return t[1];
              },
              trys: [],
              ops: [],
            },
            f,
            y,
            t,
            g = Object.create(
              (typeof Iterator === "function" ? Iterator : Object).prototype,
            );
          return (
            (g.next = verb(0)),
            (g["throw"] = verb(1)),
            (g["return"] = verb(2)),
            typeof Symbol === "function" &&
              (g[Symbol.iterator] = function () {
                return this;
              }),
            g
          );
          function verb(n) {
            return function (v) {
              return step([n, v]);
            };
          }
          function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while ((g && ((g = 0), op[0] && (_ = 0)), _))
              try {
                if (
                  ((f = 1),
                  y &&
                    (t =
                      op[0] & 2
                        ? y["return"]
                        : op[0]
                          ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                          : y.next) &&
                    !(t = t.call(y, op[1])).done)
                )
                  return t;
                if (((y = 0), t)) op = [op[0] & 2, t.value];
                switch (op[0]) {
                  case 0:
                  case 1:
                    t = op;
                    break;
                  case 4:
                    _.label++;
                    return { value: op[1], done: false };
                  case 5:
                    _.label++;
                    y = op[1];
                    op = [0];
                    continue;
                  case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                  default:
                    if (
                      !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                      (op[0] === 6 || op[0] === 2)
                    ) {
                      _ = 0;
                      continue;
                    }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                      _.label = op[1];
                      break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                      _.label = t[1];
                      t = op;
                      break;
                    }
                    if (t && _.label < t[2]) {
                      _.label = t[2];
                      _.ops.push(op);
                      break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
                }
                op = body.call(thisArg, _);
              } catch (e) {
                op = [6, e];
                y = 0;
              } finally {
                f = t = 0;
              }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
          }
        };
        __exportStar = function (m, o) {
          for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
              __createBinding(o, m, p);
        };
        __createBinding = Object.create
          ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (
                !desc ||
                ("get" in desc
                  ? !m.__esModule
                  : desc.writable || desc.configurable)
              ) {
                desc = {
                  enumerable: true,
                  get: function () {
                    return m[k];
                  },
                };
              }
              Object.defineProperty(o, k2, desc);
            }
          : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
            };
        __values = function (o) {
          var s = typeof Symbol === "function" && Symbol.iterator,
            m = s && o[s],
            i = 0;
          if (m) return m.call(o);
          if (o && typeof o.length === "number")
            return {
              next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
              },
            };
          throw new TypeError(
            s ? "Object is not iterable." : "Symbol.iterator is not defined.",
          );
        };
        __read = function (o, n) {
          var m = typeof Symbol === "function" && o[Symbol.iterator];
          if (!m) return o;
          var i = m.call(o),
            r,
            ar = [],
            e;
          try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
              ar.push(r.value);
          } catch (error) {
            e = { error };
          } finally {
            try {
              if (r && !r.done && (m = i["return"])) m.call(i);
            } finally {
              if (e) throw e.error;
            }
          }
          return ar;
        };
        __spread = function () {
          for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
          return ar;
        };
        __spreadArrays = function () {
          for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
          for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
              r[k] = a[j];
          return r;
        };
        __spreadArray = function (to, from, pack) {
          if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
              if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
              }
            }
          return to.concat(ar || Array.prototype.slice.call(from));
        };
        __await = function (v) {
          return this instanceof __await
            ? ((this.v = v), this)
            : new __await(v);
        };
        __asyncGenerator = function (thisArg, _arguments, generator) {
          if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
          var g = generator.apply(thisArg, _arguments || []),
            i,
            q = [];
          return (
            (i = Object.create(
              (typeof AsyncIterator === "function" ? AsyncIterator : Object)
                .prototype,
            )),
            verb("next"),
            verb("throw"),
            verb("return", awaitReturn),
            (i[Symbol.asyncIterator] = function () {
              return this;
            }),
            i
          );
          function awaitReturn(f) {
            return function (v) {
              return Promise.resolve(v).then(f, reject);
            };
          }
          function verb(n, f) {
            if (g[n]) {
              i[n] = function (v) {
                return new Promise(function (a, b) {
                  q.push([n, v, a, b]) > 1 || resume(n, v);
                });
              };
              if (f) i[n] = f(i[n]);
            }
          }
          function resume(n, v) {
            try {
              step(g[n](v));
            } catch (e) {
              settle(q[0][3], e);
            }
          }
          function step(r) {
            r.value instanceof __await
              ? Promise.resolve(r.value.v).then(fulfill, reject)
              : settle(q[0][2], r);
          }
          function fulfill(value) {
            resume("next", value);
          }
          function reject(value) {
            resume("throw", value);
          }
          function settle(f, v) {
            if ((f(v), q.shift(), q.length)) resume(q[0][0], q[0][1]);
          }
        };
        __asyncDelegator = function (o) {
          var i, p;
          return (
            (i = {}),
            verb("next"),
            verb("throw", function (e) {
              throw e;
            }),
            verb("return"),
            (i[Symbol.iterator] = function () {
              return this;
            }),
            i
          );
          function verb(n, f) {
            i[n] = o[n]
              ? function (v) {
                  return (p = !p)
                    ? { value: __await(o[n](v)), done: false }
                    : f
                      ? f(v)
                      : v;
                }
              : f;
          }
        };
        __asyncValues = function (o) {
          if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
          var m = o[Symbol.asyncIterator],
            i;
          return m
            ? m.call(o)
            : ((o =
                typeof __values === "function"
                  ? __values(o)
                  : o[Symbol.iterator]()),
              (i = {}),
              verb("next"),
              verb("throw"),
              verb("return"),
              (i[Symbol.asyncIterator] = function () {
                return this;
              }),
              i);
          function verb(n) {
            i[n] =
              o[n] &&
              function (v) {
                return new Promise(function (resolve, reject) {
                  ((v = o[n](v)), settle(resolve, reject, v.done, v.value));
                });
              };
          }
          function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function (v) {
              resolve({ value: v, done: d });
            }, reject);
          }
        };
        __makeTemplateObject = function (cooked, raw) {
          if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
          } else {
            cooked.raw = raw;
          }
          return cooked;
        };
        var __setModuleDefault = Object.create
          ? function (o, v) {
              Object.defineProperty(o, "default", {
                enumerable: true,
                value: v,
              });
            }
          : function (o, v) {
              o["default"] = v;
            };
        var ownKeys = function (o) {
          ownKeys =
            Object.getOwnPropertyNames ||
            function (o) {
              var ar = [];
              for (var k in o)
                if (Object.prototype.hasOwnProperty.call(o, k))
                  ar[ar.length] = k;
              return ar;
            };
          return ownKeys(o);
        };
        __importStar = function (mod) {
          if (mod && mod.__esModule) return mod;
          var result = {};
          if (mod != null)
            for (var k = ownKeys(mod), i = 0; i < k.length; i++)
              if (k[i] !== "default") __createBinding(result, mod, k[i]);
          __setModuleDefault(result, mod);
          return result;
        };
        __importDefault = function (mod) {
          return mod && mod.__esModule ? mod : { default: mod };
        };
        __classPrivateFieldGet = function (receiver, state, kind, f) {
          if (kind === "a" && !f)
            throw new TypeError(
              "Private accessor was defined without a getter",
            );
          if (
            typeof state === "function"
              ? receiver !== state || !f
              : !state.has(receiver)
          )
            throw new TypeError(
              "Cannot read private member from an object whose class did not declare it",
            );
          return kind === "m"
            ? f
            : kind === "a"
              ? f.call(receiver)
              : f
                ? f.value
                : state.get(receiver);
        };
        __classPrivateFieldSet = function (receiver, state, value, kind, f) {
          if (kind === "m")
            throw new TypeError("Private method is not writable");
          if (kind === "a" && !f)
            throw new TypeError(
              "Private accessor was defined without a setter",
            );
          if (
            typeof state === "function"
              ? receiver !== state || !f
              : !state.has(receiver)
          )
            throw new TypeError(
              "Cannot write private member to an object whose class did not declare it",
            );
          return (
            kind === "a"
              ? f.call(receiver, value)
              : f
                ? (f.value = value)
                : state.set(receiver, value),
            value
          );
        };
        __classPrivateFieldIn = function (state, receiver) {
          if (
            receiver === null ||
            (typeof receiver !== "object" && typeof receiver !== "function")
          )
            throw new TypeError("Cannot use 'in' operator on non-object");
          return typeof state === "function"
            ? receiver === state
            : state.has(receiver);
        };
        __addDisposableResource = function (env, value, async) {
          if (value !== null && value !== void 0) {
            if (typeof value !== "object" && typeof value !== "function")
              throw new TypeError("Object expected.");
            var dispose, inner;
            if (async) {
              if (!Symbol.asyncDispose)
                throw new TypeError("Symbol.asyncDispose is not defined.");
              dispose = value[Symbol.asyncDispose];
            }
            if (dispose === void 0) {
              if (!Symbol.dispose)
                throw new TypeError("Symbol.dispose is not defined.");
              dispose = value[Symbol.dispose];
              if (async) inner = dispose;
            }
            if (typeof dispose !== "function")
              throw new TypeError("Object not disposable.");
            if (inner)
              dispose = function () {
                try {
                  inner.call(this);
                } catch (e) {
                  return Promise.reject(e);
                }
              };
            env.stack.push({ value, dispose, async });
          } else if (async) {
            env.stack.push({ async: true });
          }
          return value;
        };
        var _SuppressedError =
          typeof SuppressedError === "function"
            ? SuppressedError
            : function (error, suppressed, message) {
                var e = new Error(message);
                return (
                  (e.name = "SuppressedError"),
                  (e.error = error),
                  (e.suppressed = suppressed),
                  e
                );
              };
        __disposeResources = function (env) {
          function fail(e) {
            env.error = env.hasError
              ? new _SuppressedError(
                  e,
                  env.error,
                  "An error was suppressed during disposal.",
                )
              : e;
            env.hasError = true;
          }
          var r,
            s = 0;
          function next() {
            while ((r = env.stack.pop())) {
              try {
                if (!r.async && s === 1)
                  return (
                    (s = 0),
                    env.stack.push(r),
                    Promise.resolve().then(next)
                  );
                if (r.dispose) {
                  var result = r.dispose.call(r.value);
                  if (r.async)
                    return (
                      (s |= 2),
                      Promise.resolve(result).then(next, function (e) {
                        fail(e);
                        return next();
                      })
                    );
                } else s |= 1;
              } catch (e) {
                fail(e);
              }
            }
            if (s === 1)
              return env.hasError
                ? Promise.reject(env.error)
                : Promise.resolve();
            if (env.hasError) throw env.error;
          }
          return next();
        };
        __rewriteRelativeImportExtension = function (path, preserveJsx) {
          if (typeof path === "string" && /^\.\.?\//.test(path)) {
            return path.replace(
              /\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i,
              function (m, tsx, d, ext, cm) {
                return tsx
                  ? preserveJsx
                    ? ".jsx"
                    : ".js"
                  : d && (!ext || !cm)
                    ? m
                    : d + ext + "." + cm.toLowerCase() + "js";
              },
            );
          }
          return path;
        };
        exporter("__extends", __extends);
        exporter("__assign", __assign);
        exporter("__rest", __rest);
        exporter("__decorate", __decorate);
        exporter("__param", __param);
        exporter("__esDecorate", __esDecorate);
        exporter("__runInitializers", __runInitializers);
        exporter("__propKey", __propKey);
        exporter("__setFunctionName", __setFunctionName);
        exporter("__metadata", __metadata);
        exporter("__awaiter", __awaiter);
        exporter("__generator", __generator);
        exporter("__exportStar", __exportStar);
        exporter("__createBinding", __createBinding);
        exporter("__values", __values);
        exporter("__read", __read);
        exporter("__spread", __spread);
        exporter("__spreadArrays", __spreadArrays);
        exporter("__spreadArray", __spreadArray);
        exporter("__await", __await);
        exporter("__asyncGenerator", __asyncGenerator);
        exporter("__asyncDelegator", __asyncDelegator);
        exporter("__asyncValues", __asyncValues);
        exporter("__makeTemplateObject", __makeTemplateObject);
        exporter("__importStar", __importStar);
        exporter("__importDefault", __importDefault);
        exporter("__classPrivateFieldGet", __classPrivateFieldGet);
        exporter("__classPrivateFieldSet", __classPrivateFieldSet);
        exporter("__classPrivateFieldIn", __classPrivateFieldIn);
        exporter("__addDisposableResource", __addDisposableResource);
        exporter("__disposeResources", __disposeResources);
        exporter(
          "__rewriteRelativeImportExtension",
          __rewriteRelativeImportExtension,
        );
      });
      0 && 0;
    },
    3344: (module) => {
      "use strict";
      module.exports = require("./package.json");
    },
    2613: (module) => {
      "use strict";
      module.exports = require("assert");
    },
    9140: (module) => {
      "use strict";
      module.exports = require("constants");
    },
    9896: (module) => {
      "use strict";
      module.exports = require("fs");
    },
    9316: (module) => {
      "use strict";
      module.exports = require("needle");
    },
    6928: (module) => {
      "use strict";
      module.exports = require("path");
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
    9694: (__unused_webpack_module, exports, __nccwpck_require__) => {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var isWhat = __nccwpck_require__(9994);
      function assignProp(
        carry,
        key,
        newVal,
        originalObject,
        includeNonenumerable,
      ) {
        const propType = {}.propertyIsEnumerable.call(originalObject, key)
          ? "enumerable"
          : "nonenumerable";
        if (propType === "enumerable") carry[key] = newVal;
        if (includeNonenumerable && propType === "nonenumerable") {
          Object.defineProperty(carry, key, {
            value: newVal,
            enumerable: false,
            writable: true,
            configurable: true,
          });
        }
      }
      function copy(target, options = {}) {
        if (isWhat.isArray(target)) {
          return target.map((item) => copy(item, options));
        }
        if (!isWhat.isPlainObject(target)) {
          return target;
        }
        const props = Object.getOwnPropertyNames(target);
        const symbols = Object.getOwnPropertySymbols(target);
        return [...props, ...symbols].reduce((carry, key) => {
          if (isWhat.isArray(options.props) && !options.props.includes(key)) {
            return carry;
          }
          const val = target[key];
          const newVal = copy(val, options);
          assignProp(carry, key, newVal, target, options.nonenumerable);
          return carry;
        }, {});
      }
      exports.copy = copy;
    },
    9637: (module) => {
      "use strict";
      module.exports = JSON.parse(
        '{"application/andrew-inset":["ez"],"application/applixware":["aw"],"application/atom+xml":["atom"],"application/atomcat+xml":["atomcat"],"application/atomsvc+xml":["atomsvc"],"application/bdoc":["bdoc"],"application/ccxml+xml":["ccxml"],"application/cdmi-capability":["cdmia"],"application/cdmi-container":["cdmic"],"application/cdmi-domain":["cdmid"],"application/cdmi-object":["cdmio"],"application/cdmi-queue":["cdmiq"],"application/cu-seeme":["cu"],"application/dash+xml":["mpd"],"application/davmount+xml":["davmount"],"application/docbook+xml":["dbk"],"application/dssc+der":["dssc"],"application/dssc+xml":["xdssc"],"application/ecmascript":["ecma"],"application/emma+xml":["emma"],"application/epub+zip":["epub"],"application/exi":["exi"],"application/font-tdpfr":["pfr"],"application/font-woff":[],"application/font-woff2":[],"application/geo+json":["geojson"],"application/gml+xml":["gml"],"application/gpx+xml":["gpx"],"application/gxf":["gxf"],"application/gzip":["gz"],"application/hyperstudio":["stk"],"application/inkml+xml":["ink","inkml"],"application/ipfix":["ipfix"],"application/java-archive":["jar","war","ear"],"application/java-serialized-object":["ser"],"application/java-vm":["class"],"application/javascript":["js","mjs"],"application/json":["json","map"],"application/json5":["json5"],"application/jsonml+json":["jsonml"],"application/ld+json":["jsonld"],"application/lost+xml":["lostxml"],"application/mac-binhex40":["hqx"],"application/mac-compactpro":["cpt"],"application/mads+xml":["mads"],"application/manifest+json":["webmanifest"],"application/marc":["mrc"],"application/marcxml+xml":["mrcx"],"application/mathematica":["ma","nb","mb"],"application/mathml+xml":["mathml"],"application/mbox":["mbox"],"application/mediaservercontrol+xml":["mscml"],"application/metalink+xml":["metalink"],"application/metalink4+xml":["meta4"],"application/mets+xml":["mets"],"application/mods+xml":["mods"],"application/mp21":["m21","mp21"],"application/mp4":["mp4s","m4p"],"application/msword":["doc","dot"],"application/mxf":["mxf"],"application/octet-stream":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"],"application/oda":["oda"],"application/oebps-package+xml":["opf"],"application/ogg":["ogx"],"application/omdoc+xml":["omdoc"],"application/onenote":["onetoc","onetoc2","onetmp","onepkg"],"application/oxps":["oxps"],"application/patch-ops-error+xml":["xer"],"application/pdf":["pdf"],"application/pgp-encrypted":["pgp"],"application/pgp-signature":["asc","sig"],"application/pics-rules":["prf"],"application/pkcs10":["p10"],"application/pkcs7-mime":["p7m","p7c"],"application/pkcs7-signature":["p7s"],"application/pkcs8":["p8"],"application/pkix-attr-cert":["ac"],"application/pkix-cert":["cer"],"application/pkix-crl":["crl"],"application/pkix-pkipath":["pkipath"],"application/pkixcmp":["pki"],"application/pls+xml":["pls"],"application/postscript":["ai","eps","ps"],"application/prs.cww":["cww"],"application/pskc+xml":["pskcxml"],"application/raml+yaml":["raml"],"application/rdf+xml":["rdf"],"application/reginfo+xml":["rif"],"application/relax-ng-compact-syntax":["rnc"],"application/resource-lists+xml":["rl"],"application/resource-lists-diff+xml":["rld"],"application/rls-services+xml":["rs"],"application/rpki-ghostbusters":["gbr"],"application/rpki-manifest":["mft"],"application/rpki-roa":["roa"],"application/rsd+xml":["rsd"],"application/rss+xml":["rss"],"application/rtf":["rtf"],"application/sbml+xml":["sbml"],"application/scvp-cv-request":["scq"],"application/scvp-cv-response":["scs"],"application/scvp-vp-request":["spq"],"application/scvp-vp-response":["spp"],"application/sdp":["sdp"],"application/set-payment-initiation":["setpay"],"application/set-registration-initiation":["setreg"],"application/shf+xml":["shf"],"application/smil+xml":["smi","smil"],"application/sparql-query":["rq"],"application/sparql-results+xml":["srx"],"application/srgs":["gram"],"application/srgs+xml":["grxml"],"application/sru+xml":["sru"],"application/ssdl+xml":["ssdl"],"application/ssml+xml":["ssml"],"application/tei+xml":["tei","teicorpus"],"application/thraud+xml":["tfi"],"application/timestamped-data":["tsd"],"application/vnd.3gpp.pic-bw-large":["plb"],"application/vnd.3gpp.pic-bw-small":["psb"],"application/vnd.3gpp.pic-bw-var":["pvb"],"application/vnd.3gpp2.tcap":["tcap"],"application/vnd.3m.post-it-notes":["pwn"],"application/vnd.accpac.simply.aso":["aso"],"application/vnd.accpac.simply.imp":["imp"],"application/vnd.acucobol":["acu"],"application/vnd.acucorp":["atc","acutc"],"application/vnd.adobe.air-application-installer-package+zip":["air"],"application/vnd.adobe.formscentral.fcdt":["fcdt"],"application/vnd.adobe.fxp":["fxp","fxpl"],"application/vnd.adobe.xdp+xml":["xdp"],"application/vnd.adobe.xfdf":["xfdf"],"application/vnd.ahead.space":["ahead"],"application/vnd.airzip.filesecure.azf":["azf"],"application/vnd.airzip.filesecure.azs":["azs"],"application/vnd.amazon.ebook":["azw"],"application/vnd.americandynamics.acc":["acc"],"application/vnd.amiga.ami":["ami"],"application/vnd.android.package-archive":["apk"],"application/vnd.anser-web-certificate-issue-initiation":["cii"],"application/vnd.anser-web-funds-transfer-initiation":["fti"],"application/vnd.antix.game-component":["atx"],"application/vnd.apple.installer+xml":["mpkg"],"application/vnd.apple.mpegurl":["m3u8"],"application/vnd.apple.pkpass":["pkpass"],"application/vnd.aristanetworks.swi":["swi"],"application/vnd.astraea-software.iota":["iota"],"application/vnd.audiograph":["aep"],"application/vnd.blueice.multipass":["mpm"],"application/vnd.bmi":["bmi"],"application/vnd.businessobjects":["rep"],"application/vnd.chemdraw+xml":["cdxml"],"application/vnd.chipnuts.karaoke-mmd":["mmd"],"application/vnd.cinderella":["cdy"],"application/vnd.claymore":["cla"],"application/vnd.cloanto.rp9":["rp9"],"application/vnd.clonk.c4group":["c4g","c4d","c4f","c4p","c4u"],"application/vnd.cluetrust.cartomobile-config":["c11amc"],"application/vnd.cluetrust.cartomobile-config-pkg":["c11amz"],"application/vnd.commonspace":["csp"],"application/vnd.contact.cmsg":["cdbcmsg"],"application/vnd.cosmocaller":["cmc"],"application/vnd.crick.clicker":["clkx"],"application/vnd.crick.clicker.keyboard":["clkk"],"application/vnd.crick.clicker.palette":["clkp"],"application/vnd.crick.clicker.template":["clkt"],"application/vnd.crick.clicker.wordbank":["clkw"],"application/vnd.criticaltools.wbs+xml":["wbs"],"application/vnd.ctc-posml":["pml"],"application/vnd.cups-ppd":["ppd"],"application/vnd.curl.car":["car"],"application/vnd.curl.pcurl":["pcurl"],"application/vnd.dart":["dart"],"application/vnd.data-vision.rdz":["rdz"],"application/vnd.dece.data":["uvf","uvvf","uvd","uvvd"],"application/vnd.dece.ttml+xml":["uvt","uvvt"],"application/vnd.dece.unspecified":["uvx","uvvx"],"application/vnd.dece.zip":["uvz","uvvz"],"application/vnd.denovo.fcselayout-link":["fe_launch"],"application/vnd.dna":["dna"],"application/vnd.dolby.mlp":["mlp"],"application/vnd.dpgraph":["dpg"],"application/vnd.dreamfactory":["dfac"],"application/vnd.ds-keypoint":["kpxx"],"application/vnd.dvb.ait":["ait"],"application/vnd.dvb.service":["svc"],"application/vnd.dynageo":["geo"],"application/vnd.ecowin.chart":["mag"],"application/vnd.enliven":["nml"],"application/vnd.epson.esf":["esf"],"application/vnd.epson.msf":["msf"],"application/vnd.epson.quickanime":["qam"],"application/vnd.epson.salt":["slt"],"application/vnd.epson.ssf":["ssf"],"application/vnd.eszigno3+xml":["es3","et3"],"application/vnd.ezpix-album":["ez2"],"application/vnd.ezpix-package":["ez3"],"application/vnd.fdf":["fdf"],"application/vnd.fdsn.mseed":["mseed"],"application/vnd.fdsn.seed":["seed","dataless"],"application/vnd.flographit":["gph"],"application/vnd.fluxtime.clip":["ftc"],"application/vnd.framemaker":["fm","frame","maker","book"],"application/vnd.frogans.fnc":["fnc"],"application/vnd.frogans.ltf":["ltf"],"application/vnd.fsc.weblaunch":["fsc"],"application/vnd.fujitsu.oasys":["oas"],"application/vnd.fujitsu.oasys2":["oa2"],"application/vnd.fujitsu.oasys3":["oa3"],"application/vnd.fujitsu.oasysgp":["fg5"],"application/vnd.fujitsu.oasysprs":["bh2"],"application/vnd.fujixerox.ddd":["ddd"],"application/vnd.fujixerox.docuworks":["xdw"],"application/vnd.fujixerox.docuworks.binder":["xbd"],"application/vnd.fuzzysheet":["fzs"],"application/vnd.genomatix.tuxedo":["txd"],"application/vnd.geogebra.file":["ggb"],"application/vnd.geogebra.tool":["ggt"],"application/vnd.geometry-explorer":["gex","gre"],"application/vnd.geonext":["gxt"],"application/vnd.geoplan":["g2w"],"application/vnd.geospace":["g3w"],"application/vnd.gmx":["gmx"],"application/vnd.google-apps.document":["gdoc"],"application/vnd.google-apps.presentation":["gslides"],"application/vnd.google-apps.spreadsheet":["gsheet"],"application/vnd.google-earth.kml+xml":["kml"],"application/vnd.google-earth.kmz":["kmz"],"application/vnd.grafeq":["gqf","gqs"],"application/vnd.groove-account":["gac"],"application/vnd.groove-help":["ghf"],"application/vnd.groove-identity-message":["gim"],"application/vnd.groove-injector":["grv"],"application/vnd.groove-tool-message":["gtm"],"application/vnd.groove-tool-template":["tpl"],"application/vnd.groove-vcard":["vcg"],"application/vnd.hal+xml":["hal"],"application/vnd.handheld-entertainment+xml":["zmm"],"application/vnd.hbci":["hbci"],"application/vnd.hhe.lesson-player":["les"],"application/vnd.hp-hpgl":["hpgl"],"application/vnd.hp-hpid":["hpid"],"application/vnd.hp-hps":["hps"],"application/vnd.hp-jlyt":["jlt"],"application/vnd.hp-pcl":["pcl"],"application/vnd.hp-pclxl":["pclxl"],"application/vnd.hydrostatix.sof-data":["sfd-hdstx"],"application/vnd.ibm.minipay":["mpy"],"application/vnd.ibm.modcap":["afp","listafp","list3820"],"application/vnd.ibm.rights-management":["irm"],"application/vnd.ibm.secure-container":["sc"],"application/vnd.iccprofile":["icc","icm"],"application/vnd.igloader":["igl"],"application/vnd.immervision-ivp":["ivp"],"application/vnd.immervision-ivu":["ivu"],"application/vnd.insors.igm":["igm"],"application/vnd.intercon.formnet":["xpw","xpx"],"application/vnd.intergeo":["i2g"],"application/vnd.intu.qbo":["qbo"],"application/vnd.intu.qfx":["qfx"],"application/vnd.ipunplugged.rcprofile":["rcprofile"],"application/vnd.irepository.package+xml":["irp"],"application/vnd.is-xpr":["xpr"],"application/vnd.isac.fcs":["fcs"],"application/vnd.jam":["jam"],"application/vnd.jcp.javame.midlet-rms":["rms"],"application/vnd.jisp":["jisp"],"application/vnd.joost.joda-archive":["joda"],"application/vnd.kahootz":["ktz","ktr"],"application/vnd.kde.karbon":["karbon"],"application/vnd.kde.kchart":["chrt"],"application/vnd.kde.kformula":["kfo"],"application/vnd.kde.kivio":["flw"],"application/vnd.kde.kontour":["kon"],"application/vnd.kde.kpresenter":["kpr","kpt"],"application/vnd.kde.kspread":["ksp"],"application/vnd.kde.kword":["kwd","kwt"],"application/vnd.kenameaapp":["htke"],"application/vnd.kidspiration":["kia"],"application/vnd.kinar":["kne","knp"],"application/vnd.koan":["skp","skd","skt","skm"],"application/vnd.kodak-descriptor":["sse"],"application/vnd.las.las+xml":["lasxml"],"application/vnd.llamagraphics.life-balance.desktop":["lbd"],"application/vnd.llamagraphics.life-balance.exchange+xml":["lbe"],"application/vnd.lotus-1-2-3":["123"],"application/vnd.lotus-approach":["apr"],"application/vnd.lotus-freelance":["pre"],"application/vnd.lotus-notes":["nsf"],"application/vnd.lotus-organizer":["org"],"application/vnd.lotus-screencam":["scm"],"application/vnd.lotus-wordpro":["lwp"],"application/vnd.macports.portpkg":["portpkg"],"application/vnd.mcd":["mcd"],"application/vnd.medcalcdata":["mc1"],"application/vnd.mediastation.cdkey":["cdkey"],"application/vnd.mfer":["mwf"],"application/vnd.mfmp":["mfm"],"application/vnd.micrografx.flo":["flo"],"application/vnd.micrografx.igx":["igx"],"application/vnd.mif":["mif"],"application/vnd.mobius.daf":["daf"],"application/vnd.mobius.dis":["dis"],"application/vnd.mobius.mbk":["mbk"],"application/vnd.mobius.mqy":["mqy"],"application/vnd.mobius.msl":["msl"],"application/vnd.mobius.plc":["plc"],"application/vnd.mobius.txf":["txf"],"application/vnd.mophun.application":["mpn"],"application/vnd.mophun.certificate":["mpc"],"application/vnd.mozilla.xul+xml":["xul"],"application/vnd.ms-artgalry":["cil"],"application/vnd.ms-cab-compressed":["cab"],"application/vnd.ms-excel":["xls","xlm","xla","xlc","xlt","xlw"],"application/vnd.ms-excel.addin.macroenabled.12":["xlam"],"application/vnd.ms-excel.sheet.binary.macroenabled.12":["xlsb"],"application/vnd.ms-excel.sheet.macroenabled.12":["xlsm"],"application/vnd.ms-excel.template.macroenabled.12":["xltm"],"application/vnd.ms-fontobject":["eot"],"application/vnd.ms-htmlhelp":["chm"],"application/vnd.ms-ims":["ims"],"application/vnd.ms-lrm":["lrm"],"application/vnd.ms-officetheme":["thmx"],"application/vnd.ms-outlook":["msg"],"application/vnd.ms-pki.seccat":["cat"],"application/vnd.ms-pki.stl":["stl"],"application/vnd.ms-powerpoint":["ppt","pps","pot"],"application/vnd.ms-powerpoint.addin.macroenabled.12":["ppam"],"application/vnd.ms-powerpoint.presentation.macroenabled.12":["pptm"],"application/vnd.ms-powerpoint.slide.macroenabled.12":["sldm"],"application/vnd.ms-powerpoint.slideshow.macroenabled.12":["ppsm"],"application/vnd.ms-powerpoint.template.macroenabled.12":["potm"],"application/vnd.ms-project":["mpp","mpt"],"application/vnd.ms-word.document.macroenabled.12":["docm"],"application/vnd.ms-word.template.macroenabled.12":["dotm"],"application/vnd.ms-works":["wps","wks","wcm","wdb"],"application/vnd.ms-wpl":["wpl"],"application/vnd.ms-xpsdocument":["xps"],"application/vnd.mseq":["mseq"],"application/vnd.musician":["mus"],"application/vnd.muvee.style":["msty"],"application/vnd.mynfc":["taglet"],"application/vnd.neurolanguage.nlu":["nlu"],"application/vnd.nitf":["ntf","nitf"],"application/vnd.noblenet-directory":["nnd"],"application/vnd.noblenet-sealer":["nns"],"application/vnd.noblenet-web":["nnw"],"application/vnd.nokia.n-gage.data":["ngdat"],"application/vnd.nokia.n-gage.symbian.install":["n-gage"],"application/vnd.nokia.radio-preset":["rpst"],"application/vnd.nokia.radio-presets":["rpss"],"application/vnd.novadigm.edm":["edm"],"application/vnd.novadigm.edx":["edx"],"application/vnd.novadigm.ext":["ext"],"application/vnd.oasis.opendocument.chart":["odc"],"application/vnd.oasis.opendocument.chart-template":["otc"],"application/vnd.oasis.opendocument.database":["odb"],"application/vnd.oasis.opendocument.formula":["odf"],"application/vnd.oasis.opendocument.formula-template":["odft"],"application/vnd.oasis.opendocument.graphics":["odg"],"application/vnd.oasis.opendocument.graphics-template":["otg"],"application/vnd.oasis.opendocument.image":["odi"],"application/vnd.oasis.opendocument.image-template":["oti"],"application/vnd.oasis.opendocument.presentation":["odp"],"application/vnd.oasis.opendocument.presentation-template":["otp"],"application/vnd.oasis.opendocument.spreadsheet":["ods"],"application/vnd.oasis.opendocument.spreadsheet-template":["ots"],"application/vnd.oasis.opendocument.text":["odt"],"application/vnd.oasis.opendocument.text-master":["odm"],"application/vnd.oasis.opendocument.text-template":["ott"],"application/vnd.oasis.opendocument.text-web":["oth"],"application/vnd.olpc-sugar":["xo"],"application/vnd.oma.dd2+xml":["dd2"],"application/vnd.openofficeorg.extension":["oxt"],"application/vnd.openxmlformats-officedocument.presentationml.presentation":["pptx"],"application/vnd.openxmlformats-officedocument.presentationml.slide":["sldx"],"application/vnd.openxmlformats-officedocument.presentationml.slideshow":["ppsx"],"application/vnd.openxmlformats-officedocument.presentationml.template":["potx"],"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":["xlsx"],"application/vnd.openxmlformats-officedocument.spreadsheetml.template":["xltx"],"application/vnd.openxmlformats-officedocument.wordprocessingml.document":["docx"],"application/vnd.openxmlformats-officedocument.wordprocessingml.template":["dotx"],"application/vnd.osgeo.mapguide.package":["mgp"],"application/vnd.osgi.dp":["dp"],"application/vnd.osgi.subsystem":["esa"],"application/vnd.palm":["pdb","pqa","oprc"],"application/vnd.pawaafile":["paw"],"application/vnd.pg.format":["str"],"application/vnd.pg.osasli":["ei6"],"application/vnd.picsel":["efif"],"application/vnd.pmi.widget":["wg"],"application/vnd.pocketlearn":["plf"],"application/vnd.powerbuilder6":["pbd"],"application/vnd.previewsystems.box":["box"],"application/vnd.proteus.magazine":["mgz"],"application/vnd.publishare-delta-tree":["qps"],"application/vnd.pvi.ptid1":["ptid"],"application/vnd.quark.quarkxpress":["qxd","qxt","qwd","qwt","qxl","qxb"],"application/vnd.realvnc.bed":["bed"],"application/vnd.recordare.musicxml":["mxl"],"application/vnd.recordare.musicxml+xml":["musicxml"],"application/vnd.rig.cryptonote":["cryptonote"],"application/vnd.rim.cod":["cod"],"application/vnd.rn-realmedia":["rm"],"application/vnd.rn-realmedia-vbr":["rmvb"],"application/vnd.route66.link66+xml":["link66"],"application/vnd.sailingtracker.track":["st"],"application/vnd.seemail":["see"],"application/vnd.sema":["sema"],"application/vnd.semd":["semd"],"application/vnd.semf":["semf"],"application/vnd.shana.informed.formdata":["ifm"],"application/vnd.shana.informed.formtemplate":["itp"],"application/vnd.shana.informed.interchange":["iif"],"application/vnd.shana.informed.package":["ipk"],"application/vnd.simtech-mindmapper":["twd","twds"],"application/vnd.smaf":["mmf"],"application/vnd.smart.teacher":["teacher"],"application/vnd.solent.sdkm+xml":["sdkm","sdkd"],"application/vnd.spotfire.dxp":["dxp"],"application/vnd.spotfire.sfs":["sfs"],"application/vnd.stardivision.calc":["sdc"],"application/vnd.stardivision.draw":["sda"],"application/vnd.stardivision.impress":["sdd"],"application/vnd.stardivision.math":["smf"],"application/vnd.stardivision.writer":["sdw","vor"],"application/vnd.stardivision.writer-global":["sgl"],"application/vnd.stepmania.package":["smzip"],"application/vnd.stepmania.stepchart":["sm"],"application/vnd.sun.wadl+xml":["wadl"],"application/vnd.sun.xml.calc":["sxc"],"application/vnd.sun.xml.calc.template":["stc"],"application/vnd.sun.xml.draw":["sxd"],"application/vnd.sun.xml.draw.template":["std"],"application/vnd.sun.xml.impress":["sxi"],"application/vnd.sun.xml.impress.template":["sti"],"application/vnd.sun.xml.math":["sxm"],"application/vnd.sun.xml.writer":["sxw"],"application/vnd.sun.xml.writer.global":["sxg"],"application/vnd.sun.xml.writer.template":["stw"],"application/vnd.sus-calendar":["sus","susp"],"application/vnd.svd":["svd"],"application/vnd.symbian.install":["sis","sisx"],"application/vnd.syncml+xml":["xsm"],"application/vnd.syncml.dm+wbxml":["bdm"],"application/vnd.syncml.dm+xml":["xdm"],"application/vnd.tao.intent-module-archive":["tao"],"application/vnd.tcpdump.pcap":["pcap","cap","dmp"],"application/vnd.tmobile-livetv":["tmo"],"application/vnd.trid.tpt":["tpt"],"application/vnd.triscape.mxs":["mxs"],"application/vnd.trueapp":["tra"],"application/vnd.ufdl":["ufd","ufdl"],"application/vnd.uiq.theme":["utz"],"application/vnd.umajin":["umj"],"application/vnd.unity":["unityweb"],"application/vnd.uoml+xml":["uoml"],"application/vnd.vcx":["vcx"],"application/vnd.visio":["vsd","vst","vss","vsw"],"application/vnd.visionary":["vis"],"application/vnd.vsf":["vsf"],"application/vnd.wap.wbxml":["wbxml"],"application/vnd.wap.wmlc":["wmlc"],"application/vnd.wap.wmlscriptc":["wmlsc"],"application/vnd.webturbo":["wtb"],"application/vnd.wolfram.player":["nbp"],"application/vnd.wordperfect":["wpd"],"application/vnd.wqd":["wqd"],"application/vnd.wt.stf":["stf"],"application/vnd.xara":["xar"],"application/vnd.xfdl":["xfdl"],"application/vnd.yamaha.hv-dic":["hvd"],"application/vnd.yamaha.hv-script":["hvs"],"application/vnd.yamaha.hv-voice":["hvp"],"application/vnd.yamaha.openscoreformat":["osf"],"application/vnd.yamaha.openscoreformat.osfpvg+xml":["osfpvg"],"application/vnd.yamaha.smaf-audio":["saf"],"application/vnd.yamaha.smaf-phrase":["spf"],"application/vnd.yellowriver-custom-menu":["cmp"],"application/vnd.zul":["zir","zirz"],"application/vnd.zzazz.deck+xml":["zaz"],"application/voicexml+xml":["vxml"],"application/wasm":["wasm"],"application/widget":["wgt"],"application/winhlp":["hlp"],"application/wsdl+xml":["wsdl"],"application/wspolicy+xml":["wspolicy"],"application/x-7z-compressed":["7z"],"application/x-abiword":["abw"],"application/x-ace-compressed":["ace"],"application/x-apple-diskimage":[],"application/x-arj":["arj"],"application/x-authorware-bin":["aab","x32","u32","vox"],"application/x-authorware-map":["aam"],"application/x-authorware-seg":["aas"],"application/x-bcpio":["bcpio"],"application/x-bdoc":[],"application/x-bittorrent":["torrent"],"application/x-blorb":["blb","blorb"],"application/x-bzip":["bz"],"application/x-bzip2":["bz2","boz"],"application/x-cbr":["cbr","cba","cbt","cbz","cb7"],"application/x-cdlink":["vcd"],"application/x-cfs-compressed":["cfs"],"application/x-chat":["chat"],"application/x-chess-pgn":["pgn"],"application/x-chrome-extension":["crx"],"application/x-cocoa":["cco"],"application/x-conference":["nsc"],"application/x-cpio":["cpio"],"application/x-csh":["csh"],"application/x-debian-package":["udeb"],"application/x-dgc-compressed":["dgc"],"application/x-director":["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"],"application/x-doom":["wad"],"application/x-dtbncx+xml":["ncx"],"application/x-dtbook+xml":["dtb"],"application/x-dtbresource+xml":["res"],"application/x-dvi":["dvi"],"application/x-envoy":["evy"],"application/x-eva":["eva"],"application/x-font-bdf":["bdf"],"application/x-font-ghostscript":["gsf"],"application/x-font-linux-psf":["psf"],"application/x-font-pcf":["pcf"],"application/x-font-snf":["snf"],"application/x-font-type1":["pfa","pfb","pfm","afm"],"application/x-freearc":["arc"],"application/x-futuresplash":["spl"],"application/x-gca-compressed":["gca"],"application/x-glulx":["ulx"],"application/x-gnumeric":["gnumeric"],"application/x-gramps-xml":["gramps"],"application/x-gtar":["gtar"],"application/x-hdf":["hdf"],"application/x-httpd-php":["php"],"application/x-install-instructions":["install"],"application/x-iso9660-image":[],"application/x-java-archive-diff":["jardiff"],"application/x-java-jnlp-file":["jnlp"],"application/x-latex":["latex"],"application/x-lua-bytecode":["luac"],"application/x-lzh-compressed":["lzh","lha"],"application/x-makeself":["run"],"application/x-mie":["mie"],"application/x-mobipocket-ebook":["prc","mobi"],"application/x-ms-application":["application"],"application/x-ms-shortcut":["lnk"],"application/x-ms-wmd":["wmd"],"application/x-ms-wmz":["wmz"],"application/x-ms-xbap":["xbap"],"application/x-msaccess":["mdb"],"application/x-msbinder":["obd"],"application/x-mscardfile":["crd"],"application/x-msclip":["clp"],"application/x-msdos-program":[],"application/x-msdownload":["com","bat"],"application/x-msmediaview":["mvb","m13","m14"],"application/x-msmetafile":["wmf","emf","emz"],"application/x-msmoney":["mny"],"application/x-mspublisher":["pub"],"application/x-msschedule":["scd"],"application/x-msterminal":["trm"],"application/x-mswrite":["wri"],"application/x-netcdf":["nc","cdf"],"application/x-ns-proxy-autoconfig":["pac"],"application/x-nzb":["nzb"],"application/x-perl":["pl","pm"],"application/x-pilot":[],"application/x-pkcs12":["p12","pfx"],"application/x-pkcs7-certificates":["p7b","spc"],"application/x-pkcs7-certreqresp":["p7r"],"application/x-rar-compressed":["rar"],"application/x-redhat-package-manager":["rpm"],"application/x-research-info-systems":["ris"],"application/x-sea":["sea"],"application/x-sh":["sh"],"application/x-shar":["shar"],"application/x-shockwave-flash":["swf"],"application/x-silverlight-app":["xap"],"application/x-sql":["sql"],"application/x-stuffit":["sit"],"application/x-stuffitx":["sitx"],"application/x-subrip":["srt"],"application/x-sv4cpio":["sv4cpio"],"application/x-sv4crc":["sv4crc"],"application/x-t3vm-image":["t3"],"application/x-tads":["gam"],"application/x-tar":["tar"],"application/x-tcl":["tcl","tk"],"application/x-tex":["tex"],"application/x-tex-tfm":["tfm"],"application/x-texinfo":["texinfo","texi"],"application/x-tgif":["obj"],"application/x-ustar":["ustar"],"application/x-virtualbox-hdd":["hdd"],"application/x-virtualbox-ova":["ova"],"application/x-virtualbox-ovf":["ovf"],"application/x-virtualbox-vbox":["vbox"],"application/x-virtualbox-vbox-extpack":["vbox-extpack"],"application/x-virtualbox-vdi":["vdi"],"application/x-virtualbox-vhd":["vhd"],"application/x-virtualbox-vmdk":["vmdk"],"application/x-wais-source":["src"],"application/x-web-app-manifest+json":["webapp"],"application/x-x509-ca-cert":["der","crt","pem"],"application/x-xfig":["fig"],"application/x-xliff+xml":["xlf"],"application/x-xpinstall":["xpi"],"application/x-xz":["xz"],"application/x-zmachine":["z1","z2","z3","z4","z5","z6","z7","z8"],"application/xaml+xml":["xaml"],"application/xcap-diff+xml":["xdf"],"application/xenc+xml":["xenc"],"application/xhtml+xml":["xhtml","xht"],"application/xml":["xml","xsl","xsd","rng"],"application/xml-dtd":["dtd"],"application/xop+xml":["xop"],"application/xproc+xml":["xpl"],"application/xslt+xml":["xslt"],"application/xspf+xml":["xspf"],"application/xv+xml":["mxml","xhvml","xvml","xvm"],"application/yang":["yang"],"application/yin+xml":["yin"],"application/zip":["zip"],"audio/3gpp":[],"audio/adpcm":["adp"],"audio/basic":["au","snd"],"audio/midi":["mid","midi","kar","rmi"],"audio/mp3":[],"audio/mp4":["m4a","mp4a"],"audio/mpeg":["mpga","mp2","mp2a","mp3","m2a","m3a"],"audio/ogg":["oga","ogg","spx"],"audio/s3m":["s3m"],"audio/silk":["sil"],"audio/vnd.dece.audio":["uva","uvva"],"audio/vnd.digital-winds":["eol"],"audio/vnd.dra":["dra"],"audio/vnd.dts":["dts"],"audio/vnd.dts.hd":["dtshd"],"audio/vnd.lucent.voice":["lvp"],"audio/vnd.ms-playready.media.pya":["pya"],"audio/vnd.nuera.ecelp4800":["ecelp4800"],"audio/vnd.nuera.ecelp7470":["ecelp7470"],"audio/vnd.nuera.ecelp9600":["ecelp9600"],"audio/vnd.rip":["rip"],"audio/wav":["wav"],"audio/wave":[],"audio/webm":["weba"],"audio/x-aac":["aac"],"audio/x-aiff":["aif","aiff","aifc"],"audio/x-caf":["caf"],"audio/x-flac":["flac"],"audio/x-m4a":[],"audio/x-matroska":["mka"],"audio/x-mpegurl":["m3u"],"audio/x-ms-wax":["wax"],"audio/x-ms-wma":["wma"],"audio/x-pn-realaudio":["ram","ra"],"audio/x-pn-realaudio-plugin":["rmp"],"audio/x-realaudio":[],"audio/x-wav":[],"audio/xm":["xm"],"chemical/x-cdx":["cdx"],"chemical/x-cif":["cif"],"chemical/x-cmdf":["cmdf"],"chemical/x-cml":["cml"],"chemical/x-csml":["csml"],"chemical/x-xyz":["xyz"],"font/collection":["ttc"],"font/otf":["otf"],"font/ttf":["ttf"],"font/woff":["woff"],"font/woff2":["woff2"],"image/apng":["apng"],"image/bmp":["bmp"],"image/cgm":["cgm"],"image/g3fax":["g3"],"image/gif":["gif"],"image/ief":["ief"],"image/jp2":["jp2","jpg2"],"image/jpeg":["jpeg","jpg","jpe"],"image/jpm":["jpm"],"image/jpx":["jpx","jpf"],"image/ktx":["ktx"],"image/png":["png"],"image/prs.btif":["btif"],"image/sgi":["sgi"],"image/svg+xml":["svg","svgz"],"image/tiff":["tiff","tif"],"image/vnd.adobe.photoshop":["psd"],"image/vnd.dece.graphic":["uvi","uvvi","uvg","uvvg"],"image/vnd.djvu":["djvu","djv"],"image/vnd.dvb.subtitle":[],"image/vnd.dwg":["dwg"],"image/vnd.dxf":["dxf"],"image/vnd.fastbidsheet":["fbs"],"image/vnd.fpx":["fpx"],"image/vnd.fst":["fst"],"image/vnd.fujixerox.edmics-mmr":["mmr"],"image/vnd.fujixerox.edmics-rlc":["rlc"],"image/vnd.ms-modi":["mdi"],"image/vnd.ms-photo":["wdp"],"image/vnd.net-fpx":["npx"],"image/vnd.wap.wbmp":["wbmp"],"image/vnd.xiff":["xif"],"image/webp":["webp"],"image/x-3ds":["3ds"],"image/x-cmu-raster":["ras"],"image/x-cmx":["cmx"],"image/x-freehand":["fh","fhc","fh4","fh5","fh7"],"image/x-icon":["ico"],"image/x-jng":["jng"],"image/x-mrsid-image":["sid"],"image/x-ms-bmp":[],"image/x-pcx":["pcx"],"image/x-pict":["pic","pct"],"image/x-portable-anymap":["pnm"],"image/x-portable-bitmap":["pbm"],"image/x-portable-graymap":["pgm"],"image/x-portable-pixmap":["ppm"],"image/x-rgb":["rgb"],"image/x-tga":["tga"],"image/x-xbitmap":["xbm"],"image/x-xpixmap":["xpm"],"image/x-xwindowdump":["xwd"],"message/rfc822":["eml","mime"],"model/gltf+json":["gltf"],"model/gltf-binary":["glb"],"model/iges":["igs","iges"],"model/mesh":["msh","mesh","silo"],"model/vnd.collada+xml":["dae"],"model/vnd.dwf":["dwf"],"model/vnd.gdl":["gdl"],"model/vnd.gtw":["gtw"],"model/vnd.mts":["mts"],"model/vnd.vtu":["vtu"],"model/vrml":["wrl","vrml"],"model/x3d+binary":["x3db","x3dbz"],"model/x3d+vrml":["x3dv","x3dvz"],"model/x3d+xml":["x3d","x3dz"],"text/cache-manifest":["appcache","manifest"],"text/calendar":["ics","ifb"],"text/coffeescript":["coffee","litcoffee"],"text/css":["css"],"text/csv":["csv"],"text/hjson":["hjson"],"text/html":["html","htm","shtml"],"text/jade":["jade"],"text/jsx":["jsx"],"text/less":["less"],"text/markdown":["markdown","md"],"text/mathml":["mml"],"text/n3":["n3"],"text/plain":["txt","text","conf","def","list","log","in","ini"],"text/prs.lines.tag":["dsc"],"text/richtext":["rtx"],"text/rtf":[],"text/sgml":["sgml","sgm"],"text/slim":["slim","slm"],"text/stylus":["stylus","styl"],"text/tab-separated-values":["tsv"],"text/troff":["t","tr","roff","man","me","ms"],"text/turtle":["ttl"],"text/uri-list":["uri","uris","urls"],"text/vcard":["vcard"],"text/vnd.curl":["curl"],"text/vnd.curl.dcurl":["dcurl"],"text/vnd.curl.mcurl":["mcurl"],"text/vnd.curl.scurl":["scurl"],"text/vnd.dvb.subtitle":["sub"],"text/vnd.fly":["fly"],"text/vnd.fmi.flexstor":["flx"],"text/vnd.graphviz":["gv"],"text/vnd.in3d.3dml":["3dml"],"text/vnd.in3d.spot":["spot"],"text/vnd.sun.j2me.app-descriptor":["jad"],"text/vnd.wap.wml":["wml"],"text/vnd.wap.wmlscript":["wmls"],"text/vtt":["vtt"],"text/x-asm":["s","asm"],"text/x-c":["c","cc","cxx","cpp","h","hh","dic"],"text/x-component":["htc"],"text/x-fortran":["f","for","f77","f90"],"text/x-handlebars-template":["hbs"],"text/x-java-source":["java"],"text/x-lua":["lua"],"text/x-markdown":["mkd"],"text/x-nfo":["nfo"],"text/x-opml":["opml"],"text/x-org":[],"text/x-pascal":["p","pas"],"text/x-processing":["pde"],"text/x-sass":["sass"],"text/x-scss":["scss"],"text/x-setext":["etx"],"text/x-sfv":["sfv"],"text/x-suse-ymp":["ymp"],"text/x-uuencode":["uu"],"text/x-vcalendar":["vcs"],"text/x-vcard":["vcf"],"text/xml":[],"text/yaml":["yaml","yml"],"video/3gpp":["3gp","3gpp"],"video/3gpp2":["3g2"],"video/h261":["h261"],"video/h263":["h263"],"video/h264":["h264"],"video/jpeg":["jpgv"],"video/jpm":["jpgm"],"video/mj2":["mj2","mjp2"],"video/mp2t":["ts"],"video/mp4":["mp4","mp4v","mpg4"],"video/mpeg":["mpeg","mpg","mpe","m1v","m2v"],"video/ogg":["ogv"],"video/quicktime":["qt","mov"],"video/vnd.dece.hd":["uvh","uvvh"],"video/vnd.dece.mobile":["uvm","uvvm"],"video/vnd.dece.pd":["uvp","uvvp"],"video/vnd.dece.sd":["uvs","uvvs"],"video/vnd.dece.video":["uvv","uvvv"],"video/vnd.dvb.file":["dvb"],"video/vnd.fvt":["fvt"],"video/vnd.mpegurl":["mxu","m4u"],"video/vnd.ms-playready.media.pyv":["pyv"],"video/vnd.uvvu.mp4":["uvu","uvvu"],"video/vnd.vivo":["viv"],"video/webm":["webm"],"video/x-f4v":["f4v"],"video/x-fli":["fli"],"video/x-flv":["flv"],"video/x-m4v":["m4v"],"video/x-matroska":["mkv","mk3d","mks"],"video/x-mng":["mng"],"video/x-ms-asf":["asf","asx"],"video/x-ms-vob":["vob"],"video/x-ms-wm":["wm"],"video/x-ms-wmv":["wmv"],"video/x-ms-wmx":["wmx"],"video/x-ms-wvx":["wvx"],"video/x-msvideo":["avi"],"video/x-sgi-movie":["movie"],"video/x-smv":["smv"],"x-conference/x-cooltalk":["ice"]}',
      );
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
  var __webpack_exports__ = __nccwpck_require__(7243);
  module.exports = __webpack_exports__;
})();
