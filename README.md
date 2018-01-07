ws-server
=========

[![npm](https://img.shields.io/npm/v/ws-server.svg)](http://www.npmjs.com/package/ws-server)
[![Travis CI Build Status](https://travis-ci.org/lrc-se/bth-ws-server.svg?branch=master)](https://travis-ci.org/lrc-se/bth-ws-server)
[![Scrutinizer Build Status](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/badges/build.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/build-status/master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/?branch=master)
[![Code Coverage](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/badges/coverage.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-ws-server/?branch=master)

A simple Web Sockets server module for Node.js based on [ws](https://www.npmjs.com/package/ws), for use in server applications.


Dependencies
------------

- ws
- tap *(development)*
- eslint *(development)*
- npm-run-all *(development)*

Check out the `ws` documentation to better understand the information given below, specifically with regard to `ws.Server` construction options and event listener arguments.


Installation
------------

    $ npm install ws-server


Usage
-----

Import the module in your project:

```javascript
const wsServer = require("ws-server");
```

### Configuration

The resulting reference is a factory function which returns a new server object:

```javascript
const server = wsServer(serverOptions, config);
```

This function takes two configuration objects as arguments, where the first is passed to the constructor of the underlying `ws.Server` instance (but see notes below). 
The second object configures the returned server instance and has the following properties:

```javascript
{
    timeout,            // ping timeout in milliseconds
    protocolHandler,    // subprotocol selection handler (see note below)
    connectionHandler,  // connection handler
    messageHandler,     // message reception handler
    errorHandler,       // error handler
    closeHandler        // disconnection handler
}
```

All properties are optional, as is the `config` object itself (but the server won't be of much use if no handlers are registered).

*__NOTE:__ The `clientTracking` property in the `ws.Server` constructor options will always be set to `true` regardless of its value in `serverOptions`.*


#### Subprotocol selection

If `protocolHandler` is a function reference it will be used as the subprotocol selection routine for the connection, 
following the format defined by `ws.Server`.

*__NOTE:__ If present, the value of this property will overwrite the `handleProtocols` value in the `serverOptions` argument, 
and it has been included in the `config` object to keep all handler references in one place.*


#### Event handlers

The rest of the handler function references will, when present, be registered as listeners for the corresponding WebSocket events. 
`messageHandler`, `errorHandler` and `closeHandler` will be called with the same arguments as the underlying event listeners as per the WebSocket implementation, 
*with the addition of* an additional argument called `client` (see below). `connectionHandler` will be called with the `client` object as its sole argument.

##### The `client` object

This object is constructed when a connection is first established and has the following properties:

```javascript
{
    socket,     // active socket instance (WebSocket)
    request     // original request (http.IncomingMessage)
}
```

As such, this object lets the registered handler functions access both the socket that triggered the event in question *and* the HTTP request that opened the connection in the first place. 
The `client` object is a singleton tied to individual connections and thereby also functions as a container for client-specific data the application wishes to maintain, 
since any properties added to it will be available in all subsequent handler invocations. If you're building a chat system, for example, this would be a good place to store the user's nickname.


#### Ping timeouts

If the `timeout` property is present, a ping/pong cycle with the specified interval will be started for all connected clients. 
If a pong is not received before the next ping is to be sent out, the client in question is forcibly disconnected. 
To keep track of this, `ws-server` adds a `pingPending` property to all open sockets when ping is enabled, 
which means that the disconnection handler can determine whether the connection was closed because of a ping timeout by checking if `code == 1006 && client.socket.pingPending`.


### Methods and properties

The server instance exposes the following members:

#### `broadcast(data, exclude)`

Broadcasts a message to all connected clients. If present, the `exclude` argument signifies a socket instance to exclude from the broadcast 
(such as the writer of a chat message who shouldn't get it back in turn).

#### `broadcastJSON(data, exclude)`

Same as the above, but converts `data` to a JSON string first.

#### `sendJSON(socket, data)`

Convenience function to send JSON-ified `data` to a specific `socket`.

#### `server`

This property holds a reference to the underlying `ws.Server` instance.


Example
-------

```javascript
"use strict";

const wsServer = require("ws-server");
const http = require("http");

let httpServer = http.createServer();
let server = wsServer({ server: httpServer }, {
    timeout: 60000,
    
    connectionHandler: function(client) {
        console.log("Connection opened:", client.request.connection.remoteAddress);
    },
    
    messageHandler: function(data, client) {
        console.log(`Message from ${client.request.connection.remoteAddress}:`, data);
    },
    
    closeHandler: function(code, reason, client) {
        console.log("Connection closed:", client.request.connection.remoteAddress, code, reason);
    }
});

httpServer.listen(process.env.PORT || 80);
```


Tests
-----

A test suite using [Node Tap](http://www.node-tap.org/) is included in the repo together with [ESLint](https://eslint.org/) for linting:

```bash
$ npm run lint      # run linter
$ npm run tap       # run test suite
$ npm test          # both of the above, in sequence
```

The test suite will generate a coverage report in HTML format in *build/coverage*. To get a Clover report instead, run:

    $ npm run tap-clover

Set the `WS_PORT` environment variable to change the port the test suite uses (defaults to 1701).


About
-----

**Type:** School project @[BTH](https://www.bth.se/)  
**License:** MIT  
**Author:** [LRC](mailto:kabc16@student.bth.se)
