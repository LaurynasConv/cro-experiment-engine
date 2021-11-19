/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const http = require('http');
const path = require('path');

const { Server } = require('socket.io');
const express = require('express');
const fs = require('fs-extra');

const { getCodeInConversionTemplate, resolvePackage } = require('./compilers');
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

const getJsFromHtml = (code = '') => {
  const start = code.indexOf('<script>') + 8;
  const end = code.indexOf('</script>');
  return code.slice(start, end);
};

const emitJS = (dir = '') => {
  const package = resolvePackage();
  getSockets(dir).forEach(socket => {
    console.log(`Emit JS for ${socket.handshake.query.id}`);
    const mainPath = path.join(dir, 'index.js');
    const globalJsPath = path.join(dir, 'global.js');
    const cleanupJsPath = path.join(dir, 'cleanup.js');
    const cleanupJs = fs.existsSync(cleanupJsPath) && fs.readFileSync(cleanupJsPath, 'utf-8');
    let globalJs = fs.existsSync(globalJsPath) && fs.readFileSync(globalJsPath, 'utf-8');
    let mainJs = fs.readFileSync(mainPath, 'utf-8');

    if (package?.conversiondev) {
      const globalTemplate = globalJs && getCodeInConversionTemplate(globalJs, 'shared');
      const mainTemplate = getCodeInConversionTemplate(mainJs, 'variation');
      globalJs = globalTemplate.type === 'html' ? getJsFromHtml(globalTemplate.code) : globalTemplate.code;
      mainJs = mainTemplate.type === 'html' ? getJsFromHtml(mainTemplate.code) : mainTemplate.code;
    }

    if (cleanupJs || globalJs) {
      mainJs = `(function() {
  ${cleanupJs || ''};
  ${globalJs || ''};
  ${mainJs}
})()`;
    }

    socket.emit('js', mainJs);
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
