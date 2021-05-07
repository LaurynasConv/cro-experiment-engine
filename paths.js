/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

let paths = { rootDir: '', expDir: '', sourceDir: '', devDir: '', expPath: '' };

const setUpPaths = providedExp => {
  const rootDir = path.join(__dirname, '../experiments');
  const expDir = providedExp ? path.join(process.cwd(), providedExp) : process.cwd();
  const sourceDir = path.join(expDir, 'source');
  const devDir = path.join(expDir, '__dev');
  const expPath = expDir.replace(/\/$/, '').replace(new RegExp(`${rootDir}/?`), '');

  paths = { rootDir, expDir, sourceDir, devDir, expPath };
  console.log(paths);
  return paths;
};

const getPaths = providedExp => {
  if (providedExp) {
    setUpPaths(providedExp);
  }

  return paths;
};

module.exports = { getPaths };
