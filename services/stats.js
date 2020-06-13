let onlineUsers = {};
let connectedUsers = {};

const getLiveUsers = () => {
    try {
        return Object.keys(onlineUsers).filter(id => onlineUsers[id]);
    } catch (ex) {
        console.log(ex);
        return [];
    }
}

const heartbeat = (id) => {
    try {
        onlineUsers[id] = true;
    } catch (ex) {
        console.log(ex);
    }
}

const connected = (id) => {
    try {
        connectedUsers[id] = new Date();
        onlineUsers[id] = true;
    } catch (ex) {
        console.log(ex);
    }
}

const disconnected = (id) => {
    try {
        connectedUsers[id] = undefined;
        onlineUsers[id] = undefined;
    } catch (ex) {
        console.log(ex);
    }
}

module.exports = {
    getLiveUsers,
    heartbeat,
    connected,
    disconnected
}