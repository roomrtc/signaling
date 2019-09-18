const http = require('http');
const logger = require('./logger')('Server');
const Signaling = require('./signaling');

var port = process.env.PORT || 8123;
var server = http.createServer(function (req, res) {
  res.writeHead(204);
  res.end();
});

server.listen(port, function () {
  logger.info('server is running at: ', port);
});

// expose signaling server for testing.
module.exports = new Signaling(server);
logger.info('Config signaling server is done');