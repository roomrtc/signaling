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

test('client send offer message to other client', (t) => {
  let clientA, clientB;
  t.plan(2);
  Promise.resolve(1)
    .then(() => {
      // client A require to join a pretty room
      return new Promise((resolve, reject) => {
        clientA = io.connect(socketUrl, socketOption);
        clientA.on('connect', () => {
          clientA.emit('join', 'prettyRoom', (err, roomData) => {
            resolve(roomData);
          });
          clientA.on('message', (msg) => {
            t.equal(msg.type, 'offer', 'ClientB sent message type of offer');
          });
        });

      });
    })
    .then((roomDataA) => {
      // client B require to join a pretty room            
      return new Promise((resolve, reject) => {
        clientB = io.connect(socketUrl, socketOption);
        clientB.on('connect', () => {
          clientB.emit('join', 'prettyRoom', (err, roomData) => {
            clientB.emit('message', {
              type: 'offer',
              to: clientA.id
            }, (err, data) => {
              if (!err) {
                resolve(roomData);
              } else {
                reject(err);
              }
            });
          });
        });
      });
    })
    .then((roomDataB) => {
      t.equal(roomDataB.roomCount, 1, '1 person in the prettyRoom');
      clientA.emit('bye');
      clientB.emit('bye');
    })
    .catch(err => {
      t.end(err);
    })
});