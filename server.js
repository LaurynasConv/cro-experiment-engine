/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const chokidar = require('chokidar');

const { compileTS, compileSass } = require('./compilers');
const { createFiles } = require('./create-files');
const { startServer, emitJS, emitCSS } = require('./socket');
const { getPaths } = require('./paths');

const start = providedExp => {
  const { expDir, devDir } = getPaths(providedExp);

  createFiles().then(async () => {
    await startServer();

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
};

module.exports = { start };
