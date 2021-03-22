/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fs = require('fs-extra');

const { sourceDir, expDir, devDir } = require('./paths');

exports.createFiles = () =>
  new Promise(resolve => {
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

        setTimeout(resolve, 50);
      });
    } else {
      resolve();
    }
  });
