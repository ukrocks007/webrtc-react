'use strict';

var PeerServer = require('peer').PeerServer;
var express = require('express');
var app = express();
// var port = process.env.PORT || 3001;

// app.use(express.static(__dirname + '/build'));

// var expressServer = app.listen(port);
// var io = require('socket.io').listen(expressServer);

// console.log('Listening on port', port);

var peerServer = new PeerServer({ port: 9000, path: '/' });

peerServer.on('connection', function (id) {
    //io.emit(Topics.USER_CONNECTED, id);
    console.log('User connected.');
});

peerServer.on('disconnect', function (id) {
    //io.emit(Topics.USER_DISCONNECTED, id);
    console.log('User disconnected.');
});
