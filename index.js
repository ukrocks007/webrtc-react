var express = require('express')
const path = require('path');
var app = express()

const port = process.env.PORT || 80;

app.use('/webrtc-react', express.static(path.join(__dirname, 'build')))
app.use(express.static(path.join(__dirname, 'build')));

var srv = app.listen(port, function () {
    console.log('Listening on ' + port)
})

app.use('/chat', require('peer').ExpressPeerServer(srv, {
    debug: true
}))