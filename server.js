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
      const { sourceDir, devDir, variationDir } = variation;
      compileTS(sourceDir, devDir, variationDir);
      compileSass(sourceDir, devDir, variationDir);
      chokidar
        .watch(path.join(paths.expDir, '**/*.scss'), {
          ignored: paths.variations.map(it => it.variationDir).filter(it => it !== variation.variationDir),
        })
        .on('change', () => compileSass(sourceDir, devDir, variationDir));
      chokidar.watch(devDir).on('change', file => {
        if (/.+\.js/.test(file) && !/\.prod\.js$/.test(file)) {
          emitJS(devDir);
        } else if (/.+\.css$/.test(file) && !/\.prod\.css$/.test(file)) {
          emitCSS(devDir);
        }
      });
    });
  });
};

module.exports = { start };
