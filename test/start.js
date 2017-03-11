var path = require('path');
var signalingServer = require('../server');

// expose signaling server for test
module.exports = signalingServer;

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