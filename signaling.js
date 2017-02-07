var socketio = require("socket.io"),
    crypto = require("crypto"),
    uuid = require("uuid");


/**
 * Utility
 */
function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}

module.exports = function Signaling(server, config) {
    var io = socketio.listen(server);

    io.sockets.on("connection", function (client) {

        client.resources = {
            profile: {},
            video: true,
            audio: false,
            screen: false
        }

        // send private message to another id
        client.on("message", function (msg) {
            if (!msg) return;

            var toClient = io.to(msg.to);
            if (!toClient) {
                // TODO: send msg to a room ?
                return;
            }

            msg.from = client.id;
            toClient.emit("message", msg);

        });

        client.on("shareScreen", function () {
            client.resources.screen = true;
        });

        client.on("unshareScreen", function (type) {
            client.resources.screen = false;
            removeFeed("screen");
        });

        function removeFeed(type) {
            if (client.room) {
                // remove resources type in the room
                io.sockets.in(client.room).emit("remove", {
                    id: client.id,
                    type: type
                });
                // leave the room
                if (!type) {
                    client.leave(client.room);
                    delete client.room;
                }
            }
        }

        function joinRoom(name, cb) {
            // sanity check
            if (typeof name !== "string") return; // do nothing

            // check  max clients in the room
            var current = clientsInRoom(name);
            if (config.rooms && config.rooms.maxClients > 0 && current >= config.rooms.maxClients) {
                safeCb(cb)("full");
                return;
            }
            // leave all rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
        }

        /**
         * Event: join, leave, disconnect
         */
        client.on("join", joinRoom);
        client.on("leave", function () {
            removeFeed();
        });

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function () {
            removeFeed();
        });

        client.on("create", function (name, cb) {
            name = name || uuid.v4();

            // check room is exists
            var room = io.nsps["/"].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)("taken");
            } else {
                joinRoom(name);
                safeCb(cb)(null, name);
            }
        });

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        // allow selectively vending turn credentials based on origin.
        var origin = client.handshake.headers.origin;
        if (!config.turnorigins || config.turnorigins.indexOf(origin) !== -1) {
            var turnservers = config.turnservers || [];
            turnservers.forEach(function (server) {
                var hmac = crypto.createHmac('sha1', server.secret);
                // default to 86400 seconds timeout unless specified
                var username = Math.floor(new Date().getTime() / 1000) + (server.expiry || 86400) + "";
                hmac.update(username);
                credentials.push({
                    username: username,
                    credential: hmac.digest('base64'),
                    urls: server.urls || server.url
                });
            });
        }

        var iceInfo = {
            stunservers: config.stunservers || [],
            turnservers: credentials
        }

        // notify client about stun and turn servers
        client.emit("iceservers", iceInfo);

    });


    function clientsInRoom(name) {
        // return io.sockets.clients(name).length;
        var adapter = io.nsps["/"].adapter;
        var clients = adapter.rooms[name] || {};
        return Object.keys(clients).length;
    }

    function describeRoom(name) {
        var adapter = io.nsps["/"].adapter;
        var room = adapter.rooms[name] || {};
        var sockets = room.sockets || {};
        var current = Object.keys(sockets).length;
        var result = {
            roomName: name,
            roomCount: current,
            clients: {}
        }

        Object.keys(sockets).forEach(function (id) {
            var client = adapter.nsp.connected[id];
            if (client) {
                result.clients[id] = client.resources;
            }
        });
        return result;
    }
}