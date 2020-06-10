import React, { Component } from 'react'
import Peer from 'peerjs';
import RandonString from 'randomstring'
import { Container, Row, Col, Navbar, Button, InputGroup, FormControl, Alert } from 'react-bootstrap';
import ReactQueryParams from 'react-query-params';
let localStream;
class Main extends ReactQueryParams {

    constructor(props) {
        super(props);
        this.state = {
            mode: '',
            peer: '',
            peerToConnect: '',
            connected: false,
            message: '',
            connection: null,
            webCamON: false,
            videoOn: true,
            audioOn: true,
            peerServerPath: '',
            port: '',
            streams: [],
            localStreamError: false,
            invalidMeetingId: false,
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

    async initPeerConnection() {
        console.log(this.state.peerServerPath, this.state.port);
        var peer = new Peer(RandonString.generate(6), { host: this.state.peerServerPath, port: this.state.port, path: '/chat' });
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
        peer.on('call', async call => {
            await this.setState({ connected: true });
            call.answer(localStream)
            call.on('stream', async remoteStream => {
                if (!this.state.streams.includes(remoteStream)) {
                    await this.setState({
                        streams: [...this.state.streams, remoteStream]
                    })
                }
                this.remoteVideo.srcObject = this.state.streams.length >= 1 ? this.state.streams[0] : null;
                //this.remoteVideo1.srcObject = this.state.streams.length >= 2 ? this.state.streams[1] : null;
                this.localVideo.srcObject = localStream;
            })
        })
        peer.on('error', (err) => {
            //alert.error("You just broke something!");
            console.log(err);
            this.setState({ connected: false, invalidMeetingId: true });
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
            this.setState({ localStreamError: true })
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

    handleClick() {
        this.initLocalVideo();
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
            this.setState({ connected: true });
            if (!this.state.streams.includes(remoteStream)) {
                await this.setState({
                    streams: [...this.state.streams, remoteStream]
                })
            }
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
                                        {/* {this.state.streams.map((value, index) => {
                                            return (index > 0 && <Row>
                                                <video className='inCallLocalVideo' ref={remoteVid => { this['remoteVideo' + index] = remoteVid }} autoPlay ></video>
                                            </Row>);

                                        })} */}

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