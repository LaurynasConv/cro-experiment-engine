/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const fs = require('fs-extra');

let paths = { rootDir: '', expDir: '', sourceDir: '', devDir: '', expPath: '' };

const getRootDir = currentDir => {
  if (/\/experiments$/.test(currentDir)) {
    return currentDir;
  }

  const upDir = path.join(currentDir, '..');
  if (fs.existsSync(upDir)) {
    return getRootDir(upDir);
  }
};

const setUpPaths = providedExp => {
  const rootDir = getRootDir(process.cwd());
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
