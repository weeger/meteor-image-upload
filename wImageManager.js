Meteor.wImageManager = (function (context) {
  'use strict';

  // TODO All conversion formats.

  var ImageManagerClass = function () {
    this.reset();
  };

  ImageManagerClass.prototype = {

    reset: function () {
      this.asyncQueue = [false];
      this.storage = {};
      return this;
    },

    next: function () {
      var self = this, args = arguments, queue = self.asyncQueue;
      // Remove from queue.
      queue.shift();
      if (queue.length) {
        var callback = queue[0];
        // Execute asynchronously.
        setTimeout(function () {
          // Create a new context.
          var manager = new ImageManagerClass();
          // Save parent.
          manager.parentProcess = self;
          // Launch.
          callback.apply(manager, args);
        }, 0);
      }
      else {

        var parent = this.parent();
        if (parent) {
          parent.next.apply(parent, args);
        }
      }
      return this;
    },

    then: function (callback) {
      var queue = this.asyncQueue;
      // Append to queue.
      queue.push(callback);
      return this;
    },

    with: function () {
      var args = arguments;
      return this.then(function () {
        this.next.apply(this, args);
      });
    },

    parent: function () {
      return this.parentProcess || false;
    },

    load: function (source) {
      if (source instanceof HTMLCanvasElement) {
        return this.with(source);
      }
      if (typeof source === 'string') {
        return this.canvasFromSrc(source);
      }
      // Instance of "File" seems also to inherit from "Blob"
      else if (source instanceof Blob) {
        return this.canvasFromFile(source);
      }
    },

    canvasFromSrc: function (src) {
      this.then(function () {
        var self = this,
            image = new Image();
        image.onload = function () {
          self.canvasFromImage(image).next();
        };
        image.src = src;
      });
      return this;
    },

    canvasFromImage: function (image) {
      this.then(function () {
        var canvas = this.canvas(image.width, image.height),
            context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        this.next(canvas);
      });
      return this;
    },

    canvasFromFile: function (file) {
      this.then(function () {
        var self = this,
            reader = new FileReader();
        reader.onload = function (e) {
          self.canvasFromSrc(e.target.result).next();
        };
        reader.readAsDataURL(file);
      });
      return this;
    },

    convertTo: function (format, userCanvas) {
      return this['to' + format](userCanvas);
    },

    toBase64: function (userCanvas) {
      this.then(function (chainedCanvas) {
        var canvas = userCanvas || chainedCanvas;
        this.next(canvas.toDataURL());
      });
      return this;
    },

    toBlob: function (userCanvas) {
      this.then(function (chainedCanvas) {
        this.toBase64((userCanvas || chainedCanvas))
            .then(function (base64) {
              var contentType = '';
              var sliceSize = 512;

              base64 = base64.slice(base64.indexOf('base64') + 7);
              //console.warn(b64Data);
              var byteCharacters = atob(base64);
              var byteArrays = [];

              for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);

                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                  byteNumbers[i] = slice.charCodeAt(i);
                }

                var byteArray = new Uint8Array(byteNumbers);

                byteArrays.push(byteArray);
              }

              this.next(new Blob(byteArrays, {type: contentType}));
            }).next();
      });
      return this;
    },

    crop: function (width, height, x, y, userCanvas) {
      // Enqueue action.
      this.then(function (chainedCanvas) {
        var image = userCanvas || chainedCanvas,
            canvas = this.canvas(width, height);
        canvas.getContext("2d").drawImage(image, -x || 0, -y || 0);
        this.next(canvas);
      });
      // Chained operations.
      return this;
    },

    cropRatio: function (ratio, x, y, userCanvas) {
      this.then(function (chainedCanvas) {
        var image = userCanvas || chainedCanvas,
            currentRatio = image.width / image.height,
            cropWidth = image.width,
            cropHeight = image.height;
        // Format is horizontal
        if (ratio > currentRatio) {
          cropHeight = cropWidth / ratio;
        }
        else {
          cropWidth = cropHeight * ratio;
        }
        this.crop(cropWidth, cropHeight, x, y, image).next();
      });
      // Chained operations.
      return this;
    },

    resize: function (width, height, userCanvas) {
      // Enqueue action.
      this.then(function (chainedCanvas) {
        var image = userCanvas || chainedCanvas,
        // Return similar format as original.
            canvas = this.canvas(width, height),
            context = canvas.getContext("2d");
        // Resize.
        context.drawImage(image, 0, 0, width, height);
        // Work with html image
        this.next(canvas);
      });
      // Chained operations.
      return this;
    },

    max: function (maxLength, userCanvas) {
      // Enqueue action.
      this.then(function (chainedCanvas) {
        var canvas = userCanvas || chainedCanvas,
            ratio = canvas.width / canvas.height,
            width = maxLength,
            height = maxLength;
        // Format is horizontal
        if (ratio > 1) {
          height = width / ratio;
        }
        else {
          width = height * ratio;
        }
        this.resize(width, height).next(canvas);
      });
      // Chained operations.
      return this;
    },

    display: function (domTargetImage) {
      this.then(function (chainedCanvas) {
        this.with(chainedCanvas)
            .toBase64()
            .then(function (base64) {
              domTargetImage.src = base64;
              this.next(chainedCanvas);
            })
            .next();
      });
      return this;
    },

    /**
     * Upload current image to specified collection.
     */
    upload: function (collectionName, format, callback) {
      this.then(function (chainedCanvas) {
        this.with(chainedCanvas)
            .convertTo(format)
            .then(function (converted) {
              var self = this;
              context[collectionName].insert(converted, function (error, file) {
                if (callback) {
                  callback.call(self, error, file, chainedCanvas);
                }
                else {
                  self.next(chainedCanvas);
                }
              });
            })
            .next();
      });
      return this;
    },

    store: function (storeGroup, storeName, format) {
      var globalStorage = this.storage;
      this.then(function (chainedCanvas) {
        this.with(chainedCanvas)
            .convertTo(format)
            .then(function (converted) {
              globalStorage[storeGroup] = globalStorage[storeGroup] || {};
              globalStorage[storeGroup][storeName] = converted;
              this.next(chainedCanvas);
            })
            .next();
      });
      return this;
    },

    collectionRemove: function (collectionName, ids, complete) {
      this.then(function (chainedCanvas) {
        var self = this;
        this.asyncList(ids, function (id, index, complete) {
          // Allow empty values to be ignored.
          if (id) {
            // We can't use grouped query,
            // to avoid security package blocking.
            context[collectionName].remove({_id: id}, complete);
          }
          else {
            complete();
          }
        }, function () {
          if (complete) {
            complete.call(self, chainedCanvas);
          }
          // No complete function, continue.
          else {
            self.next(chainedCanvas);
          }
        });
      });
      return this;
    },

    collectionInsertStore: function (groupName, collectionName, complete) {
      var globalStorage = this.storage;
      this.then(function (chainedCanvas) {
        var self = this, results = {};
        this.asyncList(globalStorage[groupName],
            // Each item
            function (convertedImage, index, complete) {
              context[collectionName].insert(convertedImage, function (error, file) {
                results[index] = file;
                complete();
              });
            },
            function () {
              if (complete) {
                complete.call(self, results, chainedCanvas);
              }
              else {
                self.next(chainedCanvas);
              }
            });
      });
      return this;
    },

    canvas: function (width, height) {
      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },

    /**
     * Iterate over array / object, execute iterationCallback
     * for each item, with a callback to execute. When all
     * callbacks are executed, execute the complete function.
     * Useful to wait for several async methods have
     * to be executed before complete.
     */
    asyncList: function (items, iterationCallback, complete) {
      var length = 0;
      // Iterate over ids.
      _.each(items, function (item, index) {
        // Count total items..
        length++;
        // Ensure to execute async.
        setTimeout(function () {
          iterationCallback(item, index, function () {
            // Check if we reached the end.
            if (--length === 0) {
              // Complete.
              complete();
            }
          });
        }, 0);
      });
      // No item removed.
      if (!length) {
        // Complete directly.
        complete();
      }
    }
  };

  return new ImageManagerClass();

}(this));
