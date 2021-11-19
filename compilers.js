/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const postcss = require('postcss');
const postcssPresetEnv = require('postcss-preset-env');
const fs = require('fs-extra');
const webpack = require('webpack');
const sass = require('node-sass');
const prettier = require('prettier');
const { format } = require('date-fns');
const ukLocale = require('date-fns/locale/en-GB');

const { getPaths } = require('./paths');

const resolvePackage = () => {
  const { expDir } = getPaths();
  const packagePath = path.join(expDir, 'package.json');
  return fs.existsSync(packagePath) && fs.readJsonSync(packagePath);
};

const conversionTemplate = fs.readFileSync(path.join(__dirname, 'templates/output.js'), 'utf-8');
/**
 * @argument code {string}
 * */
const getCodeInConversionTemplate = code => {
  const { expPath } = getPaths();
  const package = resolvePackage();
  const codeLines = code.split(/[\n\r]/);
  codeLines.splice(codeLines.length - 2, 2);
  codeLines.splice(0, 1);

  /** @type {Record<'author' | 'date' | 'expPath' | 'variationCode', string>} */
  const varsToReplace = {
    expPath: expPath.replace(/\//g, ' '),
    author: package.author || 'Conversion',
    date: format(new Date(), 'P p', { locale: ukLocale }),
    variationCode: codeLines
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) {
          return trimmed;
        }

        return `	${line}`;
      })
      .join('\n')
      .trim(),
  };
  let outputCode = conversionTemplate;
  Object.keys(varsToReplace).forEach(key => {
    outputCode = outputCode.replace(new RegExp(`\`{{${key}}}\``, 'g'), varsToReplace[key]);
  });

  return outputCode;
};

/** @argument sourceDir {string} */
/** @argument devDir {string} */
/** @argument expDir {string} */
const compileTS = (sourceDir, devDir, expDir) => {
  const { rootDir: expRootDir, expPath } = getPaths();
  /** @type { webpack.Configuration } */
  const options = {
    entry: path.join(sourceDir, 'index'),
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: require.resolve('babel-loader'),
          options: {
            presets: [require.resolve('@babel/preset-env'), require.resolve('@babel/preset-typescript')],
            plugins: [
              require.resolve('./plugins/html'),
              require.resolve('@babel/plugin-proposal-class-properties'),
              [require.resolve('@babel/plugin-transform-template-literals'), { loose: true }],
            ],
          },
        },
      ],
    },
    externals: {
      jquery: 'jQuery',
    },
    output: {
      environment: {
        arrowFunction: false,
      },
    },
  };
  const devCompiler = webpack({
    ...options,
    output: {
      ...options.output,
      path: devDir,
      filename: 'index.js',
    },
    mode: 'development',
    devtool: 'eval-source-map',
  });
  const prodCompiler = webpack({
    ...options,
    output: {
      ...options.output,
      path: expDir,
      filename: 'index.js',
    },
    optimization: {
      minimize: false,
    },
    mode: 'production',
  });

  devCompiler.watch({}, (devErr, devInfo) => {
    if (devErr || devInfo.hasErrors()) {
      return console.error('TS (dev) compilation error', devErr || devInfo.compilation.errors);
    }

    prodCompiler.run((prodErr, prodInfo) => {
      if (prodErr || prodInfo.hasErrors()) {
        return console.error('TS (prod) compilation error', prodErr || prodInfo.compilation.errors);
      }

      const package = resolvePackage(expDir);
      const prodFilePath = path.join(expDir, 'index.js');
      const rawCode = fs.readFileSync(prodFilePath, 'utf-8');
      const prettified = prettier.format(rawCode, {
        useTabs: !!package?.conversiondev,
        parser: 'babel',
        printWidth: 200,
      });
      const splitPathRegExp = expPath.split('/').map(it => `(${it}/)?`);
      const concatRegExp = new RegExp(`CONCATENATED MODULE: ./${splitPathRegExp.join('')}`, 'g');
      const concatModuleReplaced = prettified.replace(concatRegExp, `CONCATENATED MODULE: ${expPath}/`);

      if (package?.conversiondev) {
        const codeLines = concatModuleReplaced.split(/[\n\r]/);
        codeLines.splice(codeLines.length - 2, 2);
        codeLines.splice(0, 1);

        fs.writeFileSync(prodFilePath, getCodeInConversionTemplate(concatModuleReplaced));
      } else {
        fs.writeFileSync(prodFilePath, concatModuleReplaced);
      }

      console.log('-----');
      console.table({
        'TS updated': {
          'Experience path': `${expDir.replace(expRootDir, '')}`,
          'Dev compile time': `${devInfo.endTime - devInfo.startTime} ms`,
          'Prod compile time': `${prodInfo.endTime - prodInfo.startTime} ms`,
        },
      });
    });
  });
};
/** @argument sourceDir {string} */
/** @argument devDir {string} */
/** @argument expDir {string} */
const compileSass = (sourceDir, devDir, expDir) => {
  const { rootDir: expRootDir } = getPaths();
  const file = path.join(sourceDir, 'index.scss');
  const outFile = path.join(devDir, 'index.css');
  /** @type { sass.Options } */
  const options = { file, outFile };

  if (!fs.existsSync(file)) {
    return;
  }

  fs.ensureDirSync(devDir);
  sass.render(
    {
      ...options,
      sourceMapContents: true,
      sourceMapEmbed: true,
      sourceMap: true,
    },
    (devErr, devInfo) => {
      if (devErr) {
        return console.error(devErr);
      }

      fs.writeFileSync(outFile, devInfo.css);

      sass.render({ ...options, outputStyle: 'expanded' }, (prodErr, prodInfo) => {
        if (prodErr) {
          throw prodErr;
        }

        console.log('-----');
        console.table({
          'SCSS updated': {
            'Experience path': `${expDir.replace(expRootDir, '')}`,
            'Dev compile time': `${devInfo.stats.end - devInfo.stats.start} ms`,
            'Prod compile time': `${prodInfo.stats.end - prodInfo.stats.start} ms`,
          },
        });

        const prodFilePath = path.join(expDir, 'index.css');
        postcss([postcssPresetEnv({ browsers: ['iOS 8', 'not dead'] })])
          .process(prodInfo.css, { from: file, to: prodFilePath })
          .then(({ css }) => fs.writeFileSync(prodFilePath, css));
      });
    },
  );
};

module.exports = { compileTS, compileSass, getCodeInConversionTemplate, resolvePackage };
