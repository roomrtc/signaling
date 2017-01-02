var http = require("http"),
    config = require("config"),
    signaling = require("./signaling");

var port = process.env.PORT || 8123;
var server = http.createServer(function (req, res) {
    res.writeHead(204);
    res.end();
});

server.listen(port, function () {
    console.log("server is running at: ", port);
});
signaling(server, config);
console.log("Config signaling server is done");