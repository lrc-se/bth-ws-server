/**
 * Tests for Web Sockets server.
 */

"use strict";

const tap = require("tap");
const wsServer = require("../index");
const http = require("http");
const WebSocket = require("ws");


let httpServer;
let port = process.env.WS_PORT || 1701;


tap.beforeEach(function(done) {
    httpServer = http.createServer();
    httpServer.listen(port, done);
});


tap.afterEach(function(done) {
    httpServer.close(done);
});


tap.tearDown(process.exit);


tap.test("Test independence of constructed objects", function(t) {
    let server1 = wsServer({ server: httpServer });
    let server2 = wsServer({ server: httpServer });
    t.notSame(
        server1.server,
        server2.server,
        "underlying WebSockets server not shared between objects"
    );
    t.end();
});


tap.test("Test connection-level handlers", function(t) {
    t.plan(11);
    
    wsServer({ server: httpServer }, {
        protocolHandler: function(protocols) {
            return protocols[0];
        },
        
        connectionHandler: function(client) {
            t.type(
                client.socket,
                WebSocket,
                "connect: client object contains WebSocket object"
            );
            t.type(
                client.request,
                http.IncomingMessage,
                "connect: client object contains request object"
            );
            
            // trigger error event
            client.socket.emit("error", new Error("Test error"));
            
            // trigger close event
            client.socket.close(4000, "Test reason");
        },
        
        errorHandler: function(err, client) {
            t.type(
                client.socket,
                WebSocket,
                "error: client object contains WebSocket object"
            );
            t.type(
                client.request,
                http.IncomingMessage,
                "error: client object contains request object"
            );
            
            t.type(err, Error, "error: error object received");
            t.equal(err.message, "Test error", "error: correct error message received");
        },
        
        closeHandler: function(code, reason, client) {
            t.type(
                client.socket,
                WebSocket,
                "close: client object contains WebSocket object"
            );
            t.type(
                client.request,
                http.IncomingMessage,
                "close: client object contains request object"
            );
            
            t.equal(code, 4000, "close: correct closing code received");
            t.equal(reason, "Test reason", "close: correct closing reason received");
        }
    });
    
    let socket = new WebSocket("ws://localhost:" + port, "test-protocol");
    socket.onopen = function() {
        t.equal(socket.protocol, "test-protocol", "protocol: correct subprotocol selected");
    };
});


tap.test("Test message handler", function(t) {
    wsServer({ server: httpServer }, {
        messageHandler: function(data, client) {
            t.type(client.socket, WebSocket, "client object contains WebSocket object");
            t.type(client.request, http.IncomingMessage, "client object contains request object");
            t.equal(data, "test!", "correct message received on server");
            
            client.socket.close();
            t.end();
        }
    });
    
    let socket = new WebSocket("ws://localhost:" + port);
    socket.onopen = function() {
        socket.send("test!");
    };
});


tap.test("Test JSON message sending", function(t) {
    let server = wsServer({ server: httpServer }, {
        connectionHandler: function(client) {
            server.sendJSON(client.socket, obj);
        }
    });
    
    let obj = { foo: "bar", baz: 42 };
    let socket = new WebSocket("ws://localhost:" + port);
    socket.onmessage = function(e) {
        socket.close();
        t.same(JSON.parse(e.data), obj, "correct message received on client");
        t.end();
    };
});


tap.test("Test broadcasts", function(t) {
    t.plan(6);
    
    let obj1 = { foo: "bar", baz: 42 };
    let obj2 = { bar: "baz", foo: 47 };
    
    let numClients = 0;
    let server = wsServer({ server: httpServer }, {
        connectionHandler: function(client) {
            if (++numClients == 2) {
                server.broadcast("foo", client.socket);
                server.broadcast("bar");
                server.broadcastJSON(obj1, client.socket);
                server.broadcastJSON(obj2);
            }
        }
    });
    
    let numMsgs1 = 0;
    let socket1 = new WebSocket("ws://localhost:" + port);
    socket1.onmessage = function(e) {
        switch (numMsgs1++) {
            case 0:
                t.equal(
                    e.data,
                    "foo",
                    "1st plain broadcast received on 1st client (2nd client excluded)"
                );
                break;
            case 1:
                t.equal(e.data, "bar", "2nd plain broadcast received on 1st client");
                break;
            case 2:
                t.same(
                    JSON.parse(e.data),
                    obj1,
                    "1st JSON broadcast received on 1st client (2nd client excluded)"
                );
                break;
            case 3:
                t.same(JSON.parse(e.data), obj2, "2nd JSON broadcast received on 1st client");
                socket1.close();
                break;
        }
    };
    
    let numMsgs2 = 0;
    let socket2 = new WebSocket("ws://localhost:" + port);
    socket2.onmessage = function(e) {
        switch (numMsgs2++) {
            case 0:
                t.equal(e.data, "bar", "2nd plain broadcast received on 2nd client");
                break;
            case 1:
                t.same(JSON.parse(e.data), obj2, "2nd JSON broadcast received on 2nd client");
                socket2.close();
                break;
        }
    };
});


tap.test("Test ping timeout", function(t) {
    wsServer({ server: httpServer }, {
        timeout: 300,
        
        closeHandler: function(code) {
            t.equal(code, 1006, "socket forcibly terminated after timeout");
            socket.close();
            t.end();
        }
    });
    
    let socket = new WebSocket("ws://localhost:" + port);
    socket.onopen = function() {
        setTimeout(function() {
            socket.pause();
        }, 400);
    };
});
