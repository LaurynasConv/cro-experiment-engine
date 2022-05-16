/* eslint-disable @typescript-eslint/no-var-requires, no-console, no-restricted-syntax, no-await-in-loop */
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fs = require('fs-extra');
const Mustache = require('mustache');

const { getPaths } = require('./paths');
const { resolvePackage } = require('./compilers');

const clientTemplate = fs.readFileSync(path.join(__dirname, 'templates/client.js'), 'utf-8');
const cleanupTemplate = fs.readFileSync(path.join(__dirname, 'templates/cleanup.js'), 'utf-8');
const packageTemplate = fs.readFileSync(path.join(__dirname, 'templates/package.json'), 'utf-8');
/** @argument expPath {string} */
const getClientCode = expPath => {
  const package = resolvePackage();
  return Mustache.render(clientTemplate, { expPath, ...package?.conversiondev?.vars });
};
/** @argument expTag {string} */
const getCleanupCode = expTag => {
  const package = resolvePackage();
  return Mustache.render(cleanupTemplate, { expTag, ...package?.conversiondev?.vars });
};

exports.createFiles = async () => {
  const { variations, expPath, expDir } = getPaths();
  const expTag = expPath
    .replace(/\/|\s+/g, '-')
    .replace(/\./g, '_')
    .toLowerCase();

  for (const { rootDir, sourceDir, devDir, variationPath } of variations) {
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
          fs.writeFileSync(clientJsPath, getClientCode(variationPath));
          fs.writeFileSync(cleanupPath, getCleanupCode(expTag));

          setTimeout(resolve, 50);
        });
      });
    } else {
      if (!fs.existsSync(clientJsPath)) {
        fs.ensureDirSync(devDir);
        fs.writeFileSync(clientJsPath, getClientCode(variationPath));
      }
      if (!fs.existsSync(cleanupPath)) {
        fs.ensureDirSync(devDir);
        fs.writeFileSync(cleanupPath, getCleanupCode(expTag));
      }
    }
  }

  const packagePath = path.join(expDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    fs.writeFileSync(
      packagePath,
      Mustache.render(packageTemplate, {
        variations: variations.some(it => !!it.name)
          ? variations.map(variation => ` -v ${variation.name}`).join('')
          : undefined,
        expTag,
      }),
    );
  }
};
