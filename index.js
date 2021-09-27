#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const { program } = require('commander');

const { optimise } = require('./optimise');
const { start } = require('./server');

program.version('0.0.1', '--version', 'output the current version');

function list(val, memo) {
  memo.push(val);
  return memo;
}

program
  .command('start [experiment]')
  .alias('s')
  .option('-v, --variations <path>', 'Experiment variations', list, [''])
  .description('Start the development server')
  .action((experiment, options) => {
    if (options.variations.length > 1) {
      options.variations.shift();
    }
    start(experiment, options.variations);
  });

program
  .command('optimise <experiment>')
  .alias('o')
  .description('Optimise assets for the experience')
  .option('-q, --quality <quality>', 'Image quality to use')
  .option('-a, --all', 'Optimise all images. By default the optimiser skips the image if destination exists')
  .action((experiment, options) => {
    optimise(experiment, options.quality, options.all).then(process.exit);
  });

program.parse(process.argv);
