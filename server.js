var http = require("http"),
    config = require("config"),
    Signaling = require("./signaling");

var port = process.env.PORT || 8123;
var server = http.createServer(function (req, res) {
    res.writeHead(204);
    res.end();
});

server.listen(port, function () {
    console.log("server is running at: ", port);
});

// expose signaling server for testing.
module.exports = new Signaling(server);
console.log("Config signaling server is done");