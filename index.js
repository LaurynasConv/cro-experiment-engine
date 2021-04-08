#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const { program } = require('commander');

const { optimise } = require('./optimise');
const { start } = require('./server');

program.version('0.0.1', '-v, --version', 'output the current version');

program
  .command('start [experiment]')
  .alias('s')
  .description('Start the development server')
  .action(experiment => {
    start(experiment);
  });

program
  .command('optimise <experiment>')
  .alias('o')
  .description('Optimise assets for the experience')
  .option('-q, --quality <quality>', 'Image quality to use')
  .action((experiment, options) => {
    optimise(experiment, options.quality).then(process.exit);
  });

program.parse(process.argv);
