
const net = require('net');

const host = '104.46.127.151';
const port = 1433;

console.log(`Checking connectivity to ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
    console.log(`✅ Port ${port} on ${host} is OPEN.`);
    socket.destroy();
});

socket.on('timeout', () => {
    console.log(`❌ Connection timed out connecting to ${host}:${port}. Firewall might be blocking.`);
    socket.destroy();
});

socket.on('error', (err) => {
    console.log(`❌ Error connecting to ${host}:${port}: ${err.message}`);
});

socket.connect(port, host);
