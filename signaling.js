'use strict';

const util = require('util');
const ws = require('socket.io');
const crypto = require('crypto');
const uuid = require('uuid');
const events = require('eventemitter2');

const EventEmitter = events.EventEmitter2;

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

function Signaling(server, options) {
    // check user is missing `new` keyword.
    if (!(this instanceof Signaling)) {
        return new Signaling(server, options);
    }

    // inherits constructor
    EventEmitter.call(this);

    // default config
    this.config = {
        stunservers: [],
        turnservers: [],
        isMediaServer: false,
        roomMaxClients: 6
    }

    // override default config
    for (let opt in options) {
        if (options.hasOwnProperty(opt)) {
            this.config[opt] = options[opt];
        }
    }

    var self = this;
    var io = ws.listen(server);

    self.io = io;
    self.config = this.config;

    io.sockets.on('connection', function (client) {

        client.resources = {
            profile: {},
            video: true,
            audio: false,
            screen: false
        }

        // send private message to another id
        client.on('message', function (msg, cb) {
            if (!msg) return;

            var hasListener = self.emit('message', client, msg);
            if (!hasListener) {
                console.log('No listener: ', msg);
                var toClient = io.to(msg.to);
                if (!toClient || !msg.to) {
                    return safeCb(cb)(null, {
                        type: 'info',
                        message: 'no specify a client, should send to the room !'
                    });
                }

                msg.from = client.id;
                toClient.emit('message', msg);
                safeCb(cb)(null, {
                    type: 'info',
                    message: 'the message is sent'
                });
            }
        });

        client.on('shareScreen', function () {
            client.resources.screen = true;
        });

        client.on('unshareScreen', function (type) {
            client.resources.screen = false;
            removeFeed('screen');
        });

        function removeFeed(type) {
            if (client.room) {
                // remove resources type in the room
                io.sockets.in(client.room).emit('remove', {
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
            if (typeof name !== 'string') {
                return safeCb(cb)('name must be a string');
            }

            // check  max clients in the room
            var current = clientsInRoom(name);
            var config = self.config;
            if (config.roomMaxClients > 0 && current >= config.roomMaxClients) {
                return safeCb(cb)('full');
            }
            // leave all rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
            self.emit('join', name, client);
        }

        function leaveRoom() {
            removeFeed();
            self.emit('leave', client, clientsInRoom(client.room));
        }

        /**
         * Event: join, leave, disconnect
         */
        client.on('join', joinRoom);
        client.on('leave', leaveRoom);
        client.on('bye', leaveRoom);

        // we don't want to pass 'leave' directly because the
        // event type string of 'socket end' gets passed too.
        client.on('disconnect', leaveRoom);

        client.on('create', function (name, cb) {
            name = name || uuid.v4();

            // check room is exists
            var room = io.nsps['/'].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)('taken');
            } else {
                joinRoom(name);
                safeCb(cb)(null, name);
            }
        });

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        // allow selectively vending turn credentials based on origin.
        var config = self.config;
        var origin = client.handshake.headers.origin;
        if (!config.turnorigins || config.turnorigins.indexOf(origin) !== -1) {
            var turnservers = config.turnservers || [];
            turnservers.forEach(function (server) {
                var hmac = crypto.createHmac('sha1', server.secret);
                // default to 86400 seconds timeout unless specified
                var username = Math.floor(new Date().getTime() / 1000) + (server.expiry || 86400) + '';
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
        client.emit('iceservers', iceInfo);
        self.emit('connection', client);
    });


    function clientsInRoom(name) {
        // return io.sockets.clients(name).length;
        var adapter = io.nsps['/'].adapter;
        var clients = adapter.rooms[name] || {};
        return Object.keys(clients).length;
    }

    function describeRoom(name) {
        var adapter = io.nsps['/'].adapter;
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

util.inherits(Signaling, EventEmitter);

Signaling.Signaling = Signaling;
module.exports = Signaling;