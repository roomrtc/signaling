'use strict';

var test = require('tape');
var io = require('socket.io-client');
var signalingServer = require('../start');

var socketUrl = 'http://localhost:8123';
var socketOption = {
    transports: ['websocket'],
    'force new connection': true
}

test('it should receive message response from signaling server without error', (t) => {
    var client = io.connect(socketUrl, socketOption);
    client.on('connect', () => {
        client.emit('message', {
            type: 'offer'
        }, (err, data) => {
            console.log('callback:', data);
            client.emit('bye');
            t.end(err);
        });
    });
});

test('it should receive the offer message is sent to media server', (t) => {
    t.plan(1);

    // listen event message only once
    signalingServer.once('message', (client, msg) => {
        console.log('server receive message:', msg, client.id);
        t.equal(!msg, false, 'it should be not null');
    });

    // try to connect and send offer message
    var client = io.connect(socketUrl, socketOption);
    client.on('connect', () => {
        client.emit('message', {
            type: 'offer'
        }, (err, data) => {
            t.fail('it should does not call back');
        });
    });

});