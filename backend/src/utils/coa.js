const dgram = require('dgram');

async function sendCoaDisconnect(username, nasIp = '127.0.0.1', secret = 'testing123', port = 3799) {
    return new Promise((resolve, reject) => {
        try {
            const client = dgram.createSocket('udp4');
            const msg = Buffer.from(`User-Name=${username}`);
            client.send(msg, port, nasIp, (err) => {
                client.close();
                if (err) resolve({ ok: false, error: err.message });
                else resolve({ ok: true, username });
            });
        } catch (e) {
            resolve({ ok: false, error: e.message });
        }
    });
}

module.exports = {
    sendCoaDisconnect
};
