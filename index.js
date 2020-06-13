var express = require('express')
const path = require('path');
var app = express()
var morgan = require('morgan')

const stats = require('./services/stats');

const logInYellow = '\x1b[33m%s\x1b[0m';

const ExpressPeerServer = require('peer').ExpressPeerServer;

app.use(morgan('tiny'))

const port = process.env.PORT || 3001;

var srv = app.listen(port, function () {
    console.log('Listening on ' + port)
})

var peerJSServer = ExpressPeerServer(srv, {
    debug: true
});

app.get("/api/admin/onlineUsers", (req, res) => {
    try {
        res.status(200).json({ users: stats.getLiveUsers() });
    } catch (ex) {
        res.status(422).json(ex);
    }
});

app.use('/chat', peerJSServer);

peerJSServer.on('connection', function (peer) {
    stats.connected(peer.id);
    console.log(logInYellow, 'user with ' + peer.id + ' connected');
});

peerJSServer.on('disconnect', function (peer) {
    stats.disconnected(peer.id);
    console.log(logInYellow, 'user with ' + peer.id + ' disconnected');
});

peerJSServer.on('message', function (peer, message) {
    if (message) {
        if (message.type == 'HEARTBEAT') {
            stats.heartbeat(peer.id);
        }
        else {
            console.log(logInYellow, 'user with ' + peer.id + ' streaming data ' + JSON.stringify(message));
        }
    }
});

peerJSServer.on('error', function (err) {
    console.log(err);
});