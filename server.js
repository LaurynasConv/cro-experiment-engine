/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const chokidar = require('chokidar');

const { compileTS, compileSass } = require('./compilers');
const { createFiles } = require('./create-files');
const { startServer, emitJS, emitCSS } = require('./socket');
const { getPaths } = require('./paths');

/** @argument providedExp {string} */
/** @argument variations {string[]} */
const start = (providedExp, variations) => {
  console.log({ providedExp, variations });
  const paths = getPaths(providedExp, variations);

  createFiles().then(async () => {
    startServer();

    console.log('Experience ready!');

    paths.variations.forEach(variation => {
      const { sourceDir, devDir, rootDir } = variation;
      compileTS(sourceDir, devDir, rootDir);
      compileSass(sourceDir, devDir, rootDir);
      chokidar
        .watch(path.join(paths.rootDir, '**/*.scss'), {
          ignored: paths.variations.map(it => it.rootDir).filter(it => it !== variation.rootDir),
        })
        .on('change', () => compileSass(sourceDir, devDir, rootDir));
      chokidar.watch(devDir).on('change', file => {
        if (/.+\.js/.test(file)) {
          emitJS(devDir);
        } else if (/.+\.css$/.test(file)) {
          emitCSS(devDir);
        }
      });
    });
  });
};

module.exports = { start };
