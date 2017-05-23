signaling
=========

A simple signaling server for RoomRTC

[![npm version](https://img.shields.io/npm/v/signaling.svg?style=flat)](https://www.npmjs.com/package/signaling)
[![Travis](https://travis-ci.org/roomrtc/signaling.svg?branch=master)](https://travis-ci.org/roomrtc/signaling)

```bash
npm install signaling
```

Then:

```js
const signaling = require('signaling');
```

Use with express
================

```js
const express = require('express');
const signaling = require('signaling');

const app = express();
const server = app.listen(port);
const signalingServer = signaling(server);
```

Class: Signaling
=======================
Added in: `v0.10.0`

The `Signaling` class is defined and exposed by the `signaling` module:

```js
const Signaling = require('signaling').Signaling;
const signalingServer = new Signaling([httpServer, options]);
```

An event `connection` is going to emit when new client is connected and event `leave` when the connection has gone.

Event: 'connected'
=================

Added in: `v0.10.0`

```js
signalingServer.on('connection', (client) => {
    console.log('New connection is connected: ', client.id);
});
```

Event: 'leave'
==============

Added in: `v0.10.0`

```js
signalingServer.on('leave', (client, roomCount) => {
    console.log('A connection has gone: ', client.id, roomCount);
});
```

Event: 'message'
===============

Added in: `v0.10.0`

```js
signalingServer.on('message', (client, msg) => {
    console.log('server receive message:', msg, client.id);
});
```

Event: 'signalingReady'
===============

Added in: `v1.1.0`

```js
signalingServer.on('signalingReady', (httpServer) => {
    console.log('signaling server is ready');
});
```