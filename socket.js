/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const socketIo = require('socket.io');
const fs = require('fs-extra');

const { rootDir } = require('./paths');

/** @type { socketIo.Server } */
const io = socketIo(4000, { cors: true });

const getSockets = (exp = '') => {
  /** @type { socketIo.Socket[] } */
  const sockets = [];

  io.sockets.sockets.forEach(socket => {
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

io.on('connect', ({ handshake: { query } }) => {
  if (query.id) {
    const requestedExpDir = path.join(rootDir, query.id, 'dev');

    if (fs.existsSync(requestedExpDir)) {
      emitJS(requestedExpDir);
      emitCSS(requestedExpDir);
    }
  }
});

module.exports = { emitJS, emitCSS };
