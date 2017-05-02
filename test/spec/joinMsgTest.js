'use strict';

var test = require('tape');
var io = require('socket.io-client');

var socketUrl = 'http://localhost:8123';
var socketOption = {
    transports: ['websocket'],
    'force new connection': true
}

test('it should receive the number of members after join to a room', (t) => {
    var clientA, clientB, clientC;
    Promise.resolve(1)
        .then(() => {
            // client A require to join a pretty room
            return new Promise((resolve, reject) => {
                clientA = io.connect(socketUrl, socketOption);
                clientA.on('connect', () => {
                    clientA.emit('join', 'prettyRoom', (err, roomData) => {
                        resolve(roomData);
                    });
                });
            });
        })
        .then((roomDataA) => {
            t.equal(roomDataA.roomName, 'prettyRoom', 'clientA --> join to prettyRoom');
            t.equal(roomDataA.roomCount, 0, 'clientA --> number of members in prettyRoom should be 0');
            // client B require to join a pretty room
            return new Promise((resolve, reject) => {
                clientB = io.connect(socketUrl, socketOption);
                clientB.on('connect', () => {
                    clientB.emit('join', 'prettyRoom', (err, roomData) => {
                        resolve(roomData);
                    });
                });
            });
        })
        .then((roomDataB) => {
            t.equal(roomDataB.roomName, 'prettyRoom', 'clientB --> prettyRoom');
            t.equal(roomDataB.roomCount, 1, 'clientB --> number of members in prettyRoom should be 1');
            // client C require to join an other room
            return new Promise((resolve, reject) => {
                clientC = io.connect(socketUrl, socketOption);
                clientC.on('connect', () => {
                    clientC.emit('join', 'otherRoom', (err, roomData) => {
                        resolve(roomData);
                    });
                });
            });
        })
        .then((roomDataC) => {
            t.equal(roomDataC.roomName, 'otherRoom', 'clientC --> otherRoom');
            t.equal(roomDataC.roomCount, 0, 'clientC --> number of members in otherRoom should be 0');
            clientA.emit('bye');
            clientB.emit('bye');
            clientC.emit('bye');
            t.end();
        })
        .catch(err => {
            t.end(err);
        })


});

test('it should receive an event "ready" after joinRoom successfully', (t) => {
    var clientA;
    t.plan(2);
    Promise.resolve()
        .then(() => {
            // client A require to join a pretty room
            clientA = io.connect(socketUrl, socketOption);
            clientA.on('connect', () => {
                clientA.emit('join', 'prettyRoom', (err, roomData) => {
                    t.equal(roomData.roomName, 'prettyRoom', 'clientA --> join to prettyRoom');
                });
            });
            // wait for an event
            clientA.on('ready', (data) => {
                t.equal(data.roomName, 'prettyRoom', 'prettyRoom is ready to call');
                clientA.emit('bye');
            });
        })
});