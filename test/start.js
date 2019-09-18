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
  'messageMsgTest',
  'serverMsgTest',
  'endTest'
].forEach((script) => {
  require(path.join(dir, script));
});