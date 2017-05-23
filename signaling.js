'use strict';

const util = require('util');
const ws = require('socket.io');
const crypto = require('crypto');
const uuid = require('uuid');
const events = require('eventemitter2');

const logger = require('./logger')('Signaling');
const EventEmitter = events.EventEmitter2;

/**
 * Callback Utility
 */
function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return () => 1;
    }
}

class Signaling extends EventEmitter {
    constructor(server, options) {
        super();
        this.io = null;
        this.config = {
            stunservers: [],
            turnservers: [],
            isMediaServer: false,
            roomMaxClients: 4
        }

        // override default config
        for (let opt in options) {
            if (options.hasOwnProperty(opt)) {
                this.config[opt] = options[opt];
            }
        }

        if (server != null) {
            logger.log('Start signaling server ...');
            this.listen(server);
        }
    }

    listen(server) {
        this.io = ws.listen(server);
        this.io.sockets.on('connection', this.newConnection.bind(this));
        this.emit('signalingReady', server);
    }

    clientsInRoom(name) {
        let adapter = this.io.nsps['/'].adapter;
        let clients = adapter.rooms[name] || {};
        return Object.keys(clients).length;
    }

    describeRoom(name) {
        let adapter = this.io.nsps['/'].adapter;
        let room = adapter.rooms[name] || {};
        let sockets = room.sockets || {};
        let current = Object.keys(sockets).length;
        let result = {
            roomName: name,
            roomCount: current,
            clients: {}
        }

        Object.keys(sockets).forEach((id) => {
            let client = adapter.nsp.connected[id];
            if (client) {
                result.clients[id] = client.resources;
            }
        });
        return result;
    }

    removeFeed(client, type) {
        if (client.room) {
            // remove resources type in the room
            this.io.sockets.in(client.room).emit('remove', {
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

    joinRoom(client, name, cb) {
        // sanity check
        if (typeof name !== 'string') {
            return safeCb(cb)('name must be a string');
        }

        // check  max clients in the room
        var current = this.clientsInRoom(name);
        var config = this.config;
        if (config.roomMaxClients > 0 && current >= config.roomMaxClients) {
            return safeCb(cb)('full');
        }
        // leave all rooms
        this.removeFeed(client);
        safeCb(cb)(null, this.describeRoom(name));
        client.join(name);
        client.room = name;
        var hasListener = this.emit('join', name, client);
        if (!hasListener) {
            // send message: ready to call
            client.emit('ready', {
                roomName: name,
                pid: client.id
            });
        }
    }

    leaveRoom(client) {
        this.removeFeed(client);
        this.emit('leave', client, this.clientsInRoom(client.room));
    }

    newConnection(client) {
        logger.info('New connection:', client.id);
        client.resources = {
            profile: {},
            video: true,
            audio: false,
            screen: false
        }

        // send private message to another id
        client.on('message', (msg, cb) => {
            logger.info('Receive msg:', msg && msg.type);
            if (!msg) return;

            var hasListener = this.emit('message', client, msg, cb);
            if (!hasListener) {
                logger.info('No listener, default process:', msg && msg.type);
                this.processMsgMessage(client, msg, cb);
            }
        });

        client.on('shareScreen', () => {
            client.resources.screen = true;
        });

        client.on('unshareScreen', (type) => {
            client.resources.screen = false;
            this.removeFeed(client, 'screen');
        });

        /**
         * Event: join, leave, disconnect
         */
        client.on('join', this.joinRoom.bind(this, client));
        client.on('leave', this.leaveRoom.bind(this, client));
        client.on('bye', this.leaveRoom.bind(this, client));

        // we don't want to pass 'leave' directly because the
        // event type string of 'socket end' gets passed too.
        client.on('disconnect', this.leaveRoom.bind(this, client));

        client.on('create', (name, cb) => {
            name = name || uuid.v4();

            // check room is exists
            var room = io.nsps['/'].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)('taken');
            } else {
                this.joinRoom(client, name, cb);
            }
        });

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        // allow selectively vending turn credentials based on origin.
        var config = this.config;
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
        this.emit('connection', client);
    }

    processMsgMessage(client, msg, cb) {
        var toClient = this.io.to(msg.to);
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
}

module.exports = function (server, options) {
    return new Signaling(server, options);
};
// backwards compatible signaling@0.11.x
module.exports.Signaling = Signaling;