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
  /** @type { import('socket.io').Socket[] } */
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

/**
 * @param {string} dir
 * @param {import('socket.io').Socket} providedSocket
 */
const emitJS = (dir = '', providedSocket) => {
  const package = resolvePackage();
  const con = package?.conversiondev;
  /** @param {import('socket.io').Socket} socket */
  const sendCode = socket => {
    console.log(`Emit JS for ${socket.handshake.query.id}`);
    const mainPath = path.join(dir, 'index.js');
    const cleanupJsPath = path.join(dir, 'cleanup.js');
    const cleanupJs = fs.existsSync(cleanupJsPath) && fs.readFileSync(cleanupJsPath, 'utf-8');
    const removeDomElements =
      con?.cleanupSelectors &&
      `document.querySelectorAll('${con?.cleanupSelectors}').forEach($item => $item.remove());`;
    let mainJs = fs.readFileSync(mainPath, 'utf-8');

    if (cleanupJs && /__MutationObserver/.test(cleanupJs)) {
      /** @type {[RegExp, string][]} */
      const overrides = [
        [/window\.MutationObserver|MutationObserver|Observer/g, '__MutationObserver'],
        [/window\.setTimeout|setTimeout/g, '__setTimeout'],
        [/window\.setInterval|setInterval/g, '__setInterval'],
        [/window\.addEventListener/g, '__windowAddEventListener'],
        [/document\.addEventListener/g, '__documentAddEventListener'],
        [/document\.createElement/g, '__createElement'],
      ];

      overrides.forEach(([regExp, replace]) => {
        mainJs = mainJs.replace(regExp, replace);
      });
    }

    if (con) {
      const mainTemplate = getCodeInConversionTemplate(mainJs, 'variation');
      mainJs = mainTemplate.type === 'html' ? getJsFromHtml(mainTemplate.code) : mainTemplate.code;
    }

    if (cleanupJs || removeDomElements) {
      mainJs = `(function() {
  ${removeDomElements || ''}
  ${cleanupJs || ''};
  ${mainJs}
})()`;
    }

    socket.emit('js', mainJs);
  };

  if (providedSocket) {
    sendCode(providedSocket);
  } else {
    getSockets(dir).forEach(sendCode);
  }
};

/**
 * @param {string} dir
 * @param {import('socket.io').Socket} providedSocket
 */
const emitCSS = (dir = '', providedSocket) => {
  /** @param {import('socket.io').Socket} socket */
  const sendCode = socket => {
    console.log(`Emit CSS for ${socket.handshake.query.id}`);
    socket.emit('css', fs.readFileSync(path.join(dir, 'index.css'), 'utf-8'));
  };

  if (providedSocket) {
    sendCode(providedSocket);
  } else {
    getSockets(dir).forEach(sendCode);
  }
};

const startServer = () =>
  new Promise(resolve => {
    const { rootDir } = getPaths();

    io.on('connect', socket => {
      const { id } = socket.handshake.query;
      resolve();

      if (id) {
        const requestedExpDir = path.join(rootDir, id, '__dev');
        const expFound = fs.existsSync(requestedExpDir);
        console.log('New connection', { query: { id }, requestedExpDir, expFound });

        if (expFound) {
          emitJS(requestedExpDir, socket);
          emitCSS(requestedExpDir, socket);
        }
      }
    });

    server.listen(4000, () => console.log('listening on *:4000'));
    return io;
  });

module.exports = { startServer, emitJS, emitCSS };
