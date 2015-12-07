Introduction
============
This package aim to bring a simple way to manage images upload with reference ID and custom client side resize or crop managment. It works with meteor collections, simpleshema and file uploads.

Usage
-----
Install `meteor add weeger:image-upload`.

Use it into your own form event to fill up the Id fields with images IDs.

    Template.hello.events({
        'change input[type=file]': function (event) {
    
          var file = event.currentTarget.files[0];
    
          // This example will generate 5 files from uploaded file,
          // using different crop / resize method.
          // And it will upload it tu the database,
          // clearing old files if exists,
          // and populate saved IDs into form fields, ready to be saved.
          Meteor.wImageManager
    
              .reset()
    
              // Remove all already uploaded images, if exists.
              .collectionRemove('ImagesCollection', [
                document.getElementById('fieldFull').value,
                document.getElementById('fieldCrop').value,
                document.getElementById('fieldCropRatio').value,
                document.getElementById('fieldResized').value,
                document.getElementById('fieldMax').value
              ])
    
              // Load image for processing.
              .load(file)
              // Display image into a dom (as base64 src)
              .display(document.getElementById('previewFull'))
              // First upload method, save it now into collection.
              .upload('ImagesCollection', 'Blob', function (error, file, canvas) {
                // Populate field.
                document.getElementById('fieldFull').value = file._id;
                // Continue with the same canvas element.
                this.next(canvas);
              })
    
              .then(function(canvas) {
                // Execute custom action when you want.
                console.log('Now we will use a grouped upload method using store()');
                // And continue operations.
                this.next(canvas);
              })
    
              // Crop.
              .crop(200, 200)
              // Display image into a dom (as base64 src)
              .display(document.getElementById('previewCrop'))
              // Second upload method, store image before upload.
              .store('demoImage', 'crop', 'Blob')
    
              // Crop ratio.
              .cropRatio(1.8)
              // Display.
              .display(document.getElementById('previewCropRatio'))
              // Second upload method, store image before upload.
              .store('demoImage', 'cropRatio', 'Blob')
    
              // Resize.
              .resize(200, 200)
              // Display.
              .display(document.getElementById('previewResized'))
              // Store.
              .store('demoImage', 'resized', 'Blob')
    
              // Use again original image
              .load(file)
              // Create a thumb
              .max(100)
              // Display.
              .display(document.getElementById('previewMax'))
              // Store.
              .store('demoImage', 'max', 'Blob')
    
              // Upload all storage.
              .collectionInsertStore('demoImage', 'ImagesCollection', function (result) {
                // Populate fields.
                document.getElementById('fieldCrop').value = result.crop._id;
                document.getElementById('fieldCropRatio').value = result.cropRatio._id;
                document.getElementById('fieldResized').value = result.resized._id;
                document.getElementById('fieldMax').value = result.max._id;
              })
    
              // Required to launch process.
              .next();
        }
      });



Copyright
---------
Copyright Romain WEEGER 2010 / 2015
http://www.wexample.com

Licensed under the MIT and GPL licenses :

 - http://www.opensource.org/licenses/mit-license.php
 - http://www.gnu.org/licenses/gpl.html
