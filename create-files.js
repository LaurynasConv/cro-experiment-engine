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
const clientCode = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf-8');
const getClientCode = expPath => clientCode.replace(/`{{expPath}}`/g, expPath);

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
