# signaling

A simple signaling server for RoomRTC

# Use with express

```js
var express = require('express');
var signaling = require('signaling');

var app = express();
var server = app.listen(port);
signaling(server, config);
```
