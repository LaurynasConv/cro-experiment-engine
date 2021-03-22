/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const providedExp = process.argv[2];
const rootDir = path.join(__dirname, '../experiments');
const expDir = providedExp ? path.join(process.cwd(), providedExp) : process.cwd();
const sourceDir = path.join(expDir, 'source');
const devDir = path.join(expDir, 'dev');

module.exports = { rootDir, expDir, sourceDir, devDir };
console.log(module.exports);
