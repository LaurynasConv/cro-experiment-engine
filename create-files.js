/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fs = require('fs-extra');

const { getPaths } = require('./paths');

const getClientCode = () => {
  const { expPath } = getPaths();
  return `/* eslint-disable */
function trigger() {
  var socketScript = document.createElement('script');
  var style = document.createElement('style');

  socketScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/3.1.1/socket.io.js';
  socketScript.addEventListener('load', function() {
    var socket = io('http://localhost:4000', {
      query: { id: '${expPath}' },
    });

    socket.on('js', function(js) {
      console.log({ js: js });

      try {
        eval('(function() {'+js+'})()');
      } catch (err) {
        console.error('Error occured in the Experience script');
        console.error(err);
      }
    });

    socket.on('css', function(css) {
      console.log({ css: css });

      style.innerHTML = css;
    });
  });

  document.head.appendChild(style);
  document.head.appendChild(socketScript);
  window.__con_dev = window.__con_dev || {};
  window.__con_dev['${expPath}'] = { injected: true };
};

if (!(window.__con_dev && window.__con_dev['${expPath}'])) {
  trigger();
}`;
};

exports.createFiles = () =>
  new Promise(resolve => {
    const { sourceDir, expDir, devDir } = getPaths();
    const entryTsPath = path.join(sourceDir, 'index.ts');
    const entrySassPath = path.join(sourceDir, 'index.scss');

    if (!fs.existsSync(entryTsPath)) {
      rl.question(`No experience found in ${expDir}\nPress Enter to create it or "CTRL+C" to exit: `, () => {
        console.log('Creating experience files...');
        fs.ensureDirSync(sourceDir);
        fs.ensureDirSync(devDir);

        fs.ensureFileSync(entryTsPath);
        fs.ensureFileSync(entrySassPath);
        fs.ensureFileSync(path.join(expDir, 'activation.js'));
        fs.ensureFileSync(path.join(expDir, 'shared.js'));
        fs.ensureFileSync(path.join(devDir, 'cleanup.js'));
        fs.writeFileSync(path.join(devDir, 'client.js'), getClientCode());

        setTimeout(resolve, 50);
      });
    } else {
      resolve();
    }
  });
