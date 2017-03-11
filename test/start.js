var path = require('path');
var signalingServer = require('../server');

/**
 * Import specs
 */
var dir = '../test/spec/';
[
  'joinMsgTest',
  'endTest'
].forEach((script) => {
  require(path.join(dir, script));
});