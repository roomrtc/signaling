'use strict';

var test = require('tape');
var io = require('socket.io-client');
var signalingServer = require('../start');

var socketUrl = 'http://localhost:8123';
var socketOption = {
    transports: ['websocket'],
    'force new connection': true
}

test('it should know the connection is coming and leaving', (t) => {
    t.plan(4);

    signalingServer.once('connection', (client) => {
        t.true(client.id != null, 'it should not be null');
    });

    signalingServer.once('leave', (client, roomCount) => {
        t.true(client.id != null, 'it should not be null');
        t.equal(roomCount, 0, 'it should be 0');
    });

    // a client want to connect
    var client = io.connect(socketUrl, socketOption);
    client.on('connect', () => {
        client.emit('join', 'prettyRoom', (err, roomData) => {
            client.emit('bye');
            t.true(!err, 'it should not have an error');
        });
    });
});
