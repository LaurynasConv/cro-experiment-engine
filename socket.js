/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const http = require('http');
const path = require('path');

const { Server } = require('socket.io');
const express = require('express');
const fs = require('fs-extra');

const { getPaths } = require('./paths');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: true });

app.use(express.static(path.join(__dirname, 'public')));

const getSockets = (exp = '') => {
  /** @type { socketIo.Socket[] } */
  const sockets = [];

  io?.sockets.sockets.forEach(socket => {
    if (exp.includes(socket.handshake.query.id)) {
      sockets.push(socket);
    }
  });

  return sockets;
};

const emitJS = (dir = '') => {
  getSockets(dir).forEach(socket => {
    console.log(`Emit JS for ${socket.handshake.query.id}`);
    const cleanupJsPath = path.join(dir, 'cleanup.js');
    let mainJS = fs.readFileSync(path.join(dir, 'index.js'), 'utf-8');

    if (fs.existsSync(cleanupJsPath)) {
      mainJS = `(function() {
  ${fs.readFileSync(cleanupJsPath, 'utf-8')};
  ${mainJS}
})()`;
    }
    socket.emit('js', mainJS);
  });
};

const emitCSS = (dir = '') => {
  getSockets(dir).forEach(socket => {
    console.log(`Emit CSS for ${socket.handshake.query.id}`);
    socket.emit('css', fs.readFileSync(path.join(dir, 'index.css'), 'utf-8'));
  });
};

const startServer = () =>
  new Promise(resolve => {
    const { rootDir } = getPaths();

    io.on('connect', ({ handshake: { query } }) => {
      resolve();

      if (query.id) {
        const requestedExpDir = path.join(rootDir, query.id, '__dev');
        const expFound = fs.existsSync(requestedExpDir);
        console.log('New connection', { query: { id: query.id }, requestedExpDir, expFound });

        if (expFound) {
          emitJS(requestedExpDir);
          emitCSS(requestedExpDir);
        }
      }
    });

    server.listen(4000, () => console.log('listening on *:4000'));
    return io;
  });

module.exports = { startServer, emitJS, emitCSS };
