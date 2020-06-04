import React, { Component } from 'react'
import Peer from 'peerjs';
import RandonString from 'randomstring'

let localVideoStream;
let remoteStream;
let localStream;
class Main extends Component {

    constructor(props) {
        super(props);
        this.state = {
            peer: '',
            peerToConnect: '',
            connected: false,
            message: '',
            connection: null,
            webCamON: false,
            videoOn: true,
            audioOn: true,
            peerServerPath: '',
            port: ''
        }
        this.handleClick = this.handleClick.bind(this);
        this.updateUserPeerId = this.updateUserPeerId.bind(this);
        this.updateMessage = this.updateMessage.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.handleVideoToggle = this.handleVideoToggle.bind(this);
        this.handleAudioToggle = this.handleAudioToggle.bind(this);
        this.initPeerConnection = this.initPeerConnection.bind(this);
        this.updatePeerServerPath = this.updatePeerServerPath.bind(this);
        this.updatePort = this.updatePort.bind(this);
        this.initPeerConnectionAuto = this.initPeerConnectionAuto.bind(this);
    }

    componentDidMount() {

    }

    async initPeerConnection() {
        console.log(this.state.peerServerPath, this.state.port);
        var peer = new Peer(RandonString.generate(), { host: this.state.peerServerPath, port: this.state.port, path: '/chat' });
        peer.on('connection', (conn) => {
            this.setState({ connection: conn });
            conn.on('data', (data) => {
                this.setState({ connection: conn });
                console.log(data);
                this.setState({ connected: true });
            });
            conn.on('open', () => {
                //this.initRemoteVideo();
                this.setState({ connection: conn });
                conn.send('hello!');
                this.setState({ connected: true });
            });
        });
        peer.on('call', call => {
            this.setState({ connected: true });
            call.answer(localStream)
            call.on('stream', remoteStream => {
                this.remoteVideo.srcObject = remoteStream
            })
        })
        peer.on('error', (err) => {
            console.log(err);
            this.setState({ connected: false });
        });
        await this.setState({ peer: peer });
        this.initLocalVideo();
    }

    async initPeerConnectionAuto() {
        let path = window.location.href;
        let port;
        let parts = path.split(':');
        if (parts.length >= 3) {
            if (parts[0] === 'http') {
                port = parseInt(parts[2]);
            }
            if (parts[0] === 'https') {
                port = 443;
            }
            path = parts[1].replace('//', '');
        } else if (parts.length >= 2) {
            if (parts[0] === 'http') {
                port = 80;
            }
            if (parts[0] === 'https') {
                port = 443;
            }
            path = parts[1].replace('//', '').replace('/', '');
        }
        await this.setState({
            peerServerPath: path,
            port: port
        })
        this.initPeerConnection();
    }

    updatePeerServerPath(evt) {
        this.setState({
            peerServerPath: evt.target.value
        })
    }

    updatePort(evt) {
        this.setState({
            port: evt.target.value
        })
    }

    async initLocalVideo() {
        try {
            if (this.state.videoOn || this.state.audioOn) {
                localVideoStream = await navigator.mediaDevices.getUserMedia({
                    video: this.state.videoOn, audio: false
                })
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: this.state.videoOn, audio: this.state.audioOn
                })
            } else {
                localStream = null;
                localVideoStream = null;
            }
            this.localVideo.srcObject = localVideoStream;
            this.setState({ webCamON: true });
        } catch (ex) {
            console.log(ex);
        }
    }

    async handleVideoToggle() {
        await this.setState({ videoOn: !this.state.videoOn });
        this.initLocalVideo();
    }

    async handleAudioToggle() {
        await this.setState({ audioOn: !this.state.audioOn });
        this.initLocalVideo();
    }

    updateUserPeerId(evt) {
        this.setState({
            peerToConnect: evt.target.value
        });
    }

    updateMessage(evt) {
        this.setState({
            message: evt.target.value
        });
    }

    sendMessage() {
        if (this.state.connected) {
            let conn = this.state.connection;
            conn.send(this.state.message);
        }
    }

    handleClick() {
        const peer = this.state.peer;
        const conn = peer.connect(this.state.peerToConnect);
        conn.on('open', () => {
            //this.initRemoteVideo();
            this.setState({ connection: conn });
            conn.send('hi!');
            this.setState({ connected: true });
        });
        conn.on('data', (data) => {
            this.setState({ connection: conn });
            console.log(data);
            this.setState({ connected: true });
        });
        const call = peer.call(this.state.peerToConnect, localStream)
        call.on('stream', async (remoteStream) => {
            await this.setState({ connected: true });
            this.remoteVideo.srcObject = remoteStream
        })
    }

    render() {
        return (
            <div>
                {!!this.state.peer ?
                    (<div>
                        <h1>Hello, {this.state.peer._id}</h1>
                        <div>
                            Enter Peer id to connect: <input type="text" value={this.state.peerToConnect} onChange={this.updateUserPeerId} name="peerToConnect"></input>
                            <button onClick={this.handleClick}>Connect</button>
                        </div>
                        <br />
                        <br />
                        {this.state.connected ? (<div>
                            Enter Message to send:<input type="text" value={this.state.message} onChange={this.updateMessage} name="message"></input>
                            <button onClick={this.sendMessage}>Send</button>
                        </div>) : ''}
                        <video ref={localVideo => { this.localVideo = localVideo }} id="localVideo" autoPlay src={localVideoStream} muted></video>
                        <br />
                        <div>
                            <button onClick={this.handleVideoToggle}>Video {this.state.videoOn ? ' Off' : ' On'}</button>
                            <button onClick={this.handleAudioToggle}>Audio {this.state.audioOn ? ' Off' : ' On'}</button>
                        </div>
                        {this.state.connected ? (<video id="remoteVideo" ref={remoteVideo => { this.remoteVideo = remoteVideo }} autoPlay></video>) : ''}
                    </div>) : (
                        <div>
                            Enter Peer Server path: <input type="text" value={this.state.peerServerPath} onChange={this.updatePeerServerPath} name="peerServerPath"></input><br />
                            Enter Peer Port number:<input type="text" value={this.state.port} onChange={this.updatePort} name="port"></input><br />
                            <button onClick={this.initPeerConnection}>Connect</button><button onClick={this.initPeerConnectionAuto}>Auto</button>
                        </div>
                    )}
            </div>);
    }
}

export default Main;