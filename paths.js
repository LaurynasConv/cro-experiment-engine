/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const fs = require('fs-extra');

let paths = {
  rootDir: '',
  expDir: '',
  expPath: '',
  clientId: '',
  expId: '',
  variations: [{ sourceDir: '', devDir: '', variationDir: '', variationPath: '' }],
};

const getRootDir = currentDir => {
  if (/\/experiments$/.test(currentDir)) {
    return currentDir;
  }

  const upDir = path.join(currentDir, '..');
  if (fs.existsSync(upDir)) {
    return getRootDir(upDir);
  }
};

/** @argument providedExp {string} */
/** @argument variations {string[]} */
const setUpPaths = (providedExp, variations) => {
  const rootDir = getRootDir(process.cwd());
  const expDir = providedExp ? path.join(process.cwd(), providedExp) : process.cwd();
  const expPath = expDir.replace(/\/$/, '').replace(new RegExp(`${rootDir}/?`), '');
  const clientId = expPath.split('/').shift();
  const expId = expPath.match(/^[a-zA-Z0-9]+\/(.+)\/?/)?.[1];

  paths = {
    rootDir,
    expDir,
    expPath,
    clientId,
    expId,
    variations: variations.map(variationPath => {
      const variationRootDir = path.join(expDir, variationPath);
      return {
        sourceDir: path.join(variationRootDir, 'source'),
        devDir: path.join(variationRootDir, '__dev'),
        variationDir: variationRootDir,
        variationPath: path.join(expPath, variationPath),
      };
    }),
  };
  console.log(paths);
  return paths;
};

/** @argument providedExp {string} */
/** @argument variations {string[]} */
const getPaths = (providedExp, variations) => {
  if (providedExp) {
    setUpPaths(providedExp, variations);
  }

  return paths;
};

module.exports = { getPaths };
