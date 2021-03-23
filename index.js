#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const chokidar = require('chokidar');

const { compileTS, compileSass } = require('./compilers');
const { createFiles } = require('./create-files');
const { emitJS, emitCSS } = require('./socket');
const { expDir, devDir } = require('./paths');

if (process.stdin.setRawMode) {
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (chunk, key) => {
    if (key && key.name === 'c' && key.ctrl) {
      process.exit();
    }
  });
}

createFiles().then(() => {
  console.log('Experience ready!');

  compileTS();
  compileSass();
  chokidar.watch(path.join(expDir, '**/*.scss')).on('change', compileSass);
  chokidar.watch(devDir).on('change', file => {
    if (/.+\.js/.test(file)) {
      emitJS(devDir);
    } else if (/.+\.css$/.test(file)) {
      emitCSS(devDir);
    }
  });
});
