import React, { Component } from 'react'
import Peer from 'peerjs';
import RandonString from 'randomstring'
import { Container, Row, Col, Navbar, Button, InputGroup, FormControl, Alert, Spinner } from 'react-bootstrap';
import ReactQueryParams from 'react-query-params';
let localStream, calls = [];
class Main extends ReactQueryParams {

    constructor(props) {
        super(props);
        this.state = {
            mode: '',
            peer: '',
            peerId: '',
            peerToConnect: '',
            connected: false,
            message: '',
            connection: null,
            webCamON: false,
            videoOn: true,
            audioOn: true,
            peerServerPath: '',
            port: '',
            peers: [],
            streams: [],
            connections: [],
            localStreamError: false,
            invalidMeetingId: false,
            meetingLoader: false,
            isHost: true,
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
        this.initPeerConnectionAuto();
    }

    componentDidUpdate() {
        console.log("this.state.streams.length", this.state.streams.length);
        for (let i = 1; i < this.state.streams.length; i++) {
            console.log("Component exists", i, !!this["remoteVideo" + i]);
            if (this.state.streams.length >= 2 && !!this["remoteVideo" + i] && this.state.isHost) {
                console.log("remoteVideo added" + i);
                this["remoteVideo" + i].srcObject = this.state.streams[i];
            }
        }
    }

    async initPeerConnection() {
        console.log(this.state.peerServerPath, this.state.port);
        let myId = RandonString.generate(6);
        this.setState({
            peerId: myId
        });
        var peer = new Peer(myId, { host: this.state.peerServerPath, port: this.state.port, path: '/chat' });
        peer.on('connection', async (conn) => {
            this.setState({ connection: conn });
            await this.addConnection(conn);
            await this.addPeer(conn.peer);
            console.log("adding new peer to array", conn.peer);
            conn.on('data', (data) => {
                this.setState({ connection: conn });
                console.log(data);
                this.setState({ connected: true, meetingLoader: false });
            });
            conn.on('open', () => {
                //this.initRemoteVideo();
                this.setState({ connection: conn });
                console.log("sending peer list", this.state.peers, "to", conn.peer);
                conn.send(JSON.stringify({ peers: this.state.peers }));
                this.setState({ connected: true, meetingLoader: false });
            });
        });
        peer.on('call', async call => {
            await this.setState({ connected: true, meetingLoader: false });
            call.answer(localStream)
            call.on('stream', async remoteStream => {
                await this.addStream(remoteStream);
                this.remoteVideo.srcObject = this.state.streams.length >= 1 ? this.state.streams[0] : null;
                this.localVideo.srcObject = localStream;
            })
        })
        peer.on('error', (err) => {
            console.log(err);
            this.setState({ connected: false, invalidMeetingId: true, meetingLoader: false });
        });
        await this.setState({ peer: peer });
        await this.initLocalVideo();
        if (this.queryParams.join) {
            await this.setState({
                peerToConnect: this.queryParams.join
            });
            this.handleClick();
        }
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
            if (navigator.mediaDevices === undefined) {
                navigator.mediaDevices = {};
            }
            if (navigator.mediaDevices.getUserMedia === undefined) {
                navigator.mediaDevices.getUserMedia = function (constraints) {
                    var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    if (!getUserMedia) {
                        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                    }
                    return new Promise(function (resolve, reject) {
                        getUserMedia.call(navigator, constraints, resolve, reject);
                    });
                }
            } else {
                if (this.state.videoOn || this.state.audioOn) {
                    localStream = await navigator.mediaDevices.getUserMedia({
                        video: this.state.videoOn, audio: this.state.audioOn
                    })
                } else {
                    localStream = null;
                }
                this.localVideo.srcObject = localStream;
                this.setState({ webCamON: true });
            }
        } catch (ex) {
            this.setState({ localStreamError: true, meetingLoader: false })
            console.log("Unable to init local stream", ex);
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

    async addPeer(peer) {
        if (!this.state.peers.includes(peer) && peer != this.state.peerId) {
            await this.setState({
                peers: [...this.state.peers, peer]
            })
            if (this.state.isHost) {
                let connections = this.state.connections || [];
                for (let i = 0; i < connections.length; i++) {
                    connections[i].send(JSON.stringify({ peers: this.state.peers }));
                }
            }
        }
    }

    async addConnection(connection) {
        if (!this.state.connections.includes(connection) && connection.perr != this.state.peerId) {
            await this.setState({
                connections: [...this.state.connections, connection]
            })
        }
    }

    async addPeers(peers) {
        for (let i = 0; i < peers.length; i++) {
            await this.addPeer(peers[i]);
        }
        if (!this.state.isHost) {
            peers = this.state.peers;
            calls = [];
            for (let i = 0; i < peers.length; i++) {
                if (peers[i] != this.state.peerToConnect) {
                    console.log("Calling", peers[i]);
                    const call = this.state.peer.call(peers[i], localStream);
                    calls.push(call);
                    calls[calls.length - 1].on('stream', async (remoteStream) => {
                        console.log("Got new stream");
                        this.setState({ connected: true });
                        await this.addStream(remoteStream);
                        //this.remoteVideo.srcObject = this.state.streams.length >= 1 ? this.state.streams[0] : null;
                        this["remoteVideo" + i].srcObject = remoteStream;
                        this.localVideo.srcObject = localStream;
                    })
                }
            }
        }
    }

    async addStream(remoteStream) {
        if (!this.state.streams.includes(remoteStream)) {
            await this.setState({
                streams: [...this.state.streams, remoteStream]
            })
        }
    }

    handleClick() {
        this.setState({
            meetingLoader: true, isHost: false
        });
        this.initLocalVideo();
        const peer = this.state.peer;
        const conn = peer.connect(this.state.peerToConnect);
        conn.on('open', async () => {
            await this.addPeer(this.state.peerToConnect);
            //this.initRemoteVideo();
            this.setState({ connection: conn });
            conn.send('hi!');
            this.setState({ connected: true, meetingLoader: false });
        });
        conn.on('data', (data) => {
            this.setState({ connection: conn });
            let peers = JSON.parse(data).peers;
            console.log("Got peer list", peers);
            this.addPeers(peers || []);
            this.setState({ connected: true, meetingLoader: false });
        });

        //call begins here
        const call = peer.call(this.state.peerToConnect, localStream)
        call.on('stream', async (remoteStream) => {
            this.setState({ connected: true });
            await this.addStream(remoteStream);
            this.remoteVideo.srcObject = this.state.streams.length >= 1 ? this.state.streams[0] : null;
            //this.remoteVideo1.srcObject = this.state.streams.length >= 2 ? this.state.streams[1] : null;
            this.localVideo.srcObject = localStream;
        })
    }

    render() {
        return (
            <div>
                <div style={{ position: this.state.connection || this.state.connected ? 'fixed' : 'sticky', zIndex: 100 }}>
                    <Navbar sticky="top">
                        {/* <Navbar.Brand> */}
                        <img src={this.props.logo}
                            width="150"
                            className="d-inline-block align-top" alt="Meetster logo" />{' '}
                        {/* </Navbar.Brand> */}
                    </Navbar>
                </div>
                <Container fluid style={{ paddingLeft: this.state.connected ? '0%' : '4%', paddingRight: this.state.connected ? '0%' : '4%' }}>
                    {
                        !!this.state.peer && ((this.state.connection || this.state.connected) ? (
                            <>
                                <Row noGutters={true}>
                                    <Col xs="9" sm="9" md="9" lg="9" >
                                        <div class="video-container">
                                            <video id="remoteVideo" className='inCallVideoRemote' ref={remoteVideo => { this.remoteVideo = remoteVideo }} autoPlay></video>
                                        </div>
                                    </Col>
                                    <Col>
                                        <Row>
                                            <video className='inCallLocalVideo' ref={localVideo => { this.localVideo = localVideo }} id="localVideo" autoPlay muted ></video>
                                        </Row>
                                        {this.state.streams.map((value, index) => {
                                            return (index > 0 && <Row>
                                                <video className='inCallLocalVideo' id={'remoteVideo' + index} ref={remoteVid => { this['remoteVideo' + index] = remoteVid }} autoPlay ></video>
                                            </Row>);

                                        })}

                                    </Col>
                                </Row>
                            </>
                        ) :
                            (<div>
                                <Row>
                                    <Col xs="12" sm="12" md="12" lg="6" >
                                        <div className="introVideo">
                                            <center>
                                                <div className='homeVideoContainer' style={{ backgroundColor: (this.state.videoOn && !this.state.localStreamError) ? 'transparent' : 'black', borderRadius: '6%' }}>
                                                    <center>
                                                        <video className='homeVideo' ref={localVideo => { this.localVideo = localVideo }} id="localVideo" autoPlay muted>
                                                        </video>
                                                    </center>
                                                </div>
                                            </center>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <Button className="introControls" onClick={this.handleVideoToggle}>Video {this.state.videoOn ? ' Off' : ' On'}</Button>{' '}
                                                <Button className="introControls" onClick={this.handleAudioToggle}>Audio {this.state.audioOn ? ' Off' : ' On'}</Button>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col>
                                        <Row className="introMId">
                                            <h3>Your Meeting Id: {this.state.peer._id}</h3>
                                            <h4>Please share this meeing id with the participant to initiate the call.</h4>
                                        </Row>
                                        <center><hr />Or</center>
                                        <Row className="introForm">
                                            <Col className="stubCol1" xs="1" sm="1" md="2" lg="3" ></Col>
                                            <Col>
                                                <center>
                                                    <InputGroup>
                                                        <FormControl
                                                            placeholder="Enter meeting id to join"
                                                            aria-label="Meeting Id"
                                                            aria-describedby="basic-addon2"
                                                            value={this.state.peerToConnect} size="md" onChange={this.updateUserPeerId} name="peerToConnect"
                                                        />
                                                        <InputGroup.Append>
                                                            <Button onClick={this.handleClick} variant="primary" type="button">
                                                                Submit
                                                        </Button>
                                                        </InputGroup.Append>
                                                    </InputGroup>
                                                    <br />
                                                    <Spinner style={{ display: this.state.meetingLoader ? 'block' : 'none' }} animation="border" role="status">
                                                        <span className="sr-only">Loading...</span>
                                                    </Spinner>
                                                    <Alert variant="danger" show={this.state.invalidMeetingId} onClose={() => this.setState({ invalidMeetingId: false })} dismissible>
                                                        <Alert.Heading>Oh snap! You got an error!</Alert.Heading>
                                                        <p>
                                                            The meeting id you are trying to connect is not valid.
                                                        </p>
                                                    </Alert>
                                                </center>
                                            </Col>
                                            <Col className="stubCol2" xs="1" sm="1" md="2" lg="3"></Col>
                                            {/* <center>
                                                <h5>Enter meeting id to join:
                                                    <input type="text" value={this.state.peerToConnect} onChange={this.updateUserPeerId} name="peerToConnect">
                                                    </input>
                                                </h5>
                                                <Button className="introConnectButton" onClick={this.handleClick}>Connect</Button>
                                            </center> */}
                                            {/* <video id="remoteVideo" className='homeVideoRemote' ref={remoteVideo => { this.remoteVideo = remoteVideo }} autoPlay></video>)} */}
                                        </Row>
                                    </Col>
                                </Row>
                            </div>))
                    }
                </Container>
                <Navbar bg="light" variant="light" fixed="bottom" >
                    <Navbar.Brand href="#home">
                        {' '}By <a href="https://www.github.com/ukrocks007">Utkarsh Mehta</a>
                    </Navbar.Brand>
                </Navbar>
            </div >);
    }
}

export default Main;