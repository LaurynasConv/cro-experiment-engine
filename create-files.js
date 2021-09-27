/* eslint-disable @typescript-eslint/no-var-requires, no-console, no-restricted-syntax, no-await-in-loop */
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fs = require('fs-extra');

const { getPaths } = require('./paths');

/** @argument expPath {string} */
const getClientCode = expPath => `/* eslint-disable */
function trigger() {
  var experiment = '${expPath}';
  var socketScript = document.createElement('script');
  var style = document.createElement('style');
  var injectJs = function(js) {
    try {
      eval('(function() {'+js+'})()');
    } catch (err) {
      console.error('Error occured in the Experience script');
      console.error(err);
    }
  }

  window.__con_dev = window.__con_dev || {};
  window.__con_dev[experiment] = window.__con_dev[experiment] || { injected: true };

  if (window.__con_dev[experiment].code) {
    injectJs(window.__con_dev[experiment].code);
  } else {
    socketScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/3.1.1/socket.io.js';
    socketScript.addEventListener('load', function() {
      var socket = io('http://localhost:4000', {
        query: { id: experiment },
      });

      socket.on('js', function(js) {
        console.log({ js: js });

        try {
          window.__con_dev[experiment].code = js;
          injectJs(js);
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
  }
};

trigger();`;

exports.createFiles = async () => {
  const { variations } = getPaths();
  for (const { rootDir, sourceDir, devDir, varPath } of variations) {
    const entryTsPath = path.join(sourceDir, 'index.ts');
    const entrySassPath = path.join(sourceDir, 'index.scss');
    const clientJsPath = path.join(devDir, 'client.js');
    const cleanupPath = path.join(devDir, 'cleanup.js');

    if (!fs.existsSync(entryTsPath)) {
      await new Promise(resolve => {
        rl.question(`No experience found in ${rootDir}\nPress Enter to create it or "CTRL+C" to exit: `, () => {
          console.log('Creating experience files...');
          fs.ensureDirSync(sourceDir);
          fs.ensureDirSync(devDir);

          fs.ensureFileSync(entryTsPath);
          fs.ensureFileSync(entrySassPath);
          fs.ensureFileSync(cleanupPath);
          fs.writeFileSync(clientJsPath, getClientCode(varPath));

          setTimeout(resolve, 50);
        });
      });
    } else {
      if (!fs.existsSync(clientJsPath)) {
        fs.ensureDirSync(devDir);
        fs.writeFileSync(clientJsPath, getClientCode(varPath));
      }
      fs.ensureFileSync(cleanupPath);
    }
  }
};
