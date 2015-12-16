Package.describe({
  name: 'weeger:image-upload',
  version: '0.0.2',
  // Brief, one-line summary of the package.
  summary: 'Simple image upload manager with client side thumbnails (crop / resize), add and deletion',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/weeger/meteor-image-upload',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.addFiles('wImageManager.js');
});

Package.onTest(function (api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('weeger:image-upload');
  api.addFiles('wImageManager.js');
  api.addFiles('image-upload-tests.js');
});
