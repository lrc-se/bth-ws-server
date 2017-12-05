/**
 * Tests for WebSocket server.
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
    t.plan(5);
    
    let server = wsServer({ server: httpServer }, {
        protocolHandler: function(protocols) {
            return protocols[0];
        },
        
        connectionHandler: function(client) {
            t.type(client.socket, WebSocket, "client object contains WebSocket object");
            t.type(client.request, http.IncomingMessage, "client object contains request object");
            
            client.socket.close(4000, "Test reason");
        },
        
        closeHandler: function(code, reason) {
            t.equal(code, 4000, "correct closing code received");
            t.equal(reason, "Test reason", "correct closing reason received");
        }
    });
    
    let socket = new WebSocket("ws://localhost:" + port, "test-protocol");
    socket.onopen = function() {
        t.equal(socket.protocol, "test-protocol", "correct subprotocol selected");
    };
});
