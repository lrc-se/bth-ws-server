/**
 * Tests for WebSocket server.
 */

"use strict";

const tap = require("tap");
const wsServer = require("../index");
const http = require("http");


let httpServer;


tap.beforeEach(function(done) {
    httpServer = http.createServer();
    httpServer.listen(process.env.WS_PORT || 1701, done);
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
