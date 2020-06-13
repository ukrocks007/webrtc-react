var express = require('express')
const path = require('path');
var app = express()
var morgan = require('morgan')

const stats = require('./services/stats');

const logInYellow = '\x1b[33m%s\x1b[0m';

const ExpressPeerServer = require('peer').ExpressPeerServer;

app.use(morgan('tiny'))

const port = process.env.PORT || 3001;

app.use('/webrtc-react', express.static(path.join(__dirname, 'build')))
app.use(express.static(path.join(__dirname, 'build')));

var srv = app.listen(port, function () {
    console.log('Listening on ' + port)
})

app.use('/chat', require('peer').ExpressPeerServer(srv, {
    debug: true
}))