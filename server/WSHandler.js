import { WebSocketServer } from 'ws';

class WSHandler {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.clients = new Set();
    }

    start() {
        this.wss = new WebSocketServer({ port: this.port });
        this.wss.on('connection', (ws) => {
            console.log('New client connected');
            this.clients.add(ws);

            ws.on('message', (message) => {
                console.log(`Data: "${message}" received from client ${ws._socket.remoteAddress}, disconnecting...`);
                ws.close();
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
        console.log(`WebSocket server started on ws://localhost:${this.port}`);
    }

    broadcast(data) {
        const message = ({
            type: 'update',
            payload: data
        });

        this.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(JSON.stringify(message));
                } catch (error) {
                    console.error('Error sending message to client:', error);
                }
            }
        });
    }

    stop() {
        if (this.wss) {
            this.wss.close()
        }
    }
}

export default WSHandler;