import React from 'react';
import logo from './logo_transparent.png';
import './App.css';
import Main from './main/main';

// Handle prefixed versions
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

function App() {
    return (
        <Main logo={logo} />
    );
}

export default App;
