/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const postcss = require('postcss');
const Mustache = require('mustache');
const postcssPresetEnv = require('postcss-preset-env');
const fs = require('fs-extra');
const webpack = require('webpack');
const sass = require('sass');
const prettier = require('prettier');
const { format } = require('date-fns');
const ukLocale = require('date-fns/locale/en-GB');
const UglifyJS = require('uglify-js');

Mustache.escape = code => code;

const { getPaths } = require('./paths');

const resolvePackage = () => {
  const { expDir } = getPaths();
  const packagePath = path.join(expDir, 'package.json');
  return fs.existsSync(packagePath) && fs.readJsonSync(packagePath);
};

/**
 * @argument lines {string[]}
 * @argument indent {string}
 * */
const indentLines = (lines, indent) =>
  lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return trimmed;
      }
      return `${indent || '	'}${line}`;
    })
    .join('\n')
    .trim();

/**
 * @argument code {string}
 * @argument fileType {'variation' | 'control' | 'shared' | 'css'}
 * @argument env {'production' | 'development'}
 * @argument variationDir {string}
 * */
const getCodeInConversionTemplate = (code, fileType, env, variationDir) => {
  const package = resolvePackage();
  const { rootDir, expPath, clientId, expId, variations } = getPaths();
  const templatesPath = path.join(rootDir, 'templates');
  const genericTemplatePath = path.join(templatesPath, 'Generic/template.js');
  const clientTemplateDir = path.join(templatesPath, clientId);
  const conversionTemplate = {
    code: fileType === 'variation' ? fs.readFileSync(genericTemplatePath, 'utf-8') : '{{jsCode}}',
    type: 'js',
  };
  let templateExists = fileType === 'variation';

  if (fs.existsSync(clientTemplateDir)) {
    const clientTemplatePath = {
      js: {
        variation: path.join(clientTemplateDir, 'variation.js'),
        control: path.join(clientTemplateDir, 'control.js'),
        shared: path.join(clientTemplateDir, 'shared.js'),
      },
      html: {
        variation: path.join(clientTemplateDir, 'variation.html'),
        css: path.join(clientTemplateDir, 'variation.html'),
        control: path.join(clientTemplateDir, 'control.html'),
        shared: path.join(clientTemplateDir, 'shared.html'),
      },
    };

    if (fs.existsSync(clientTemplatePath.js[fileType])) {
      conversionTemplate.code = fs.readFileSync(clientTemplatePath.js[fileType], 'utf-8');
      templateExists = true;
    } else if (fs.existsSync(clientTemplatePath.html[fileType])) {
      conversionTemplate.code = fs.readFileSync(clientTemplatePath.html[fileType], 'utf-8');
      conversionTemplate.type = 'html';
      templateExists = true;
    }
  }

  const codeLines = code.split(/[\n\r]/);
  if (templateExists && env === 'production' && fileType !== 'css') {
    codeLines.splice(codeLines.length - 2, 2);
    codeLines.splice(0, 1);
  }

  const variation = variations.find(it => it.variationDir === variationDir);
  const devDir = variation?.devDir;
  const varName = variation?.name;
  const devJsPath = devDir && path.join(devDir, 'index.prod.js');
  const devCssPath = devDir && path.join(devDir, 'index.prod.css');

  let jsCode = '';
  if (fileType === 'css' && devJsPath && fs.existsSync(devJsPath)) {
    const jsCodeLines = fs.readFileSync(devJsPath, 'utf-8').split(/[\n\r]/);
    if (env === 'production') {
      jsCodeLines.splice(jsCodeLines.length - 2, 2);
      jsCodeLines.splice(0, 1);
    }
    jsCode = indentLines(jsCodeLines, conversionTemplate.type === 'html' ? '		' : '	');
  } else if (templateExists) {
    jsCode = indentLines(codeLines, conversionTemplate.type === 'html' ? '		' : '	');
  } else {
    jsCode = codeLines.join('\n');
  }

  let cssCode = '';
  if (fileType === 'variation' && conversionTemplate.type === 'html' && devCssPath && fs.existsSync(devCssPath)) {
    cssCode = indentLines(fs.readFileSync(devCssPath, 'utf-8').split(/[\n\r]/));
  } else {
    cssCode = indentLines(codeLines);
  }

  const expName = `${expPath.replace(/\//g, ' ')}${varName ? ` (${varName})` : ''}`;
  /** @type {Record<'author' | 'date' | 'expPath' | 'variationCode', string>} */
  const varsToReplace = {
    expName,
    expNameLong: expName,
    expTag: expPath.replace(/\/|\.|\s+/g, '-').toLowerCase(),
    author: package?.author || 'Conversion',
    date: format(new Date(), 'P p', { locale: ukLocale }),
    expId: expId.replace(/\./g, '-'),
    clientId,
    cssCode,
    jsCode,
    ...package?.conversiondev?.vars,
  };

  conversionTemplate.code = Mustache.render(conversionTemplate.code, varsToReplace);

  if (package?.conversiondev?.polyfills || /\.closest\(/.test(UglifyJS.minify(jsCode).code)) {
    conversionTemplate.code = conversionTemplate.code.replace(
      /(\s+)\/\/ Polyfills/,
      '$1// Polyfills$1var ElProto=Element.prototype;if(ElProto.matches||(ElProto.matches=ElProto.msMatchesSelector||ElProto.webkitMatchesSelector),!ElProto.closest)ElProto.closest=function(t){var o=this;do{if(ElProto.matches.call(o,t))return o;o=o.parentElement||o.parentNode}while(null!==o&&1===o.nodeType);return null};',
    );
  }

  if (fileType === 'css' && devCssPath) {
    fs.writeFileSync(devCssPath, code);
  }
  if (fileType === 'variation' && devJsPath) {
    fs.writeFileSync(devJsPath, code);
  }

  return conversionTemplate;
};

/**
 * @argument fileType {'variation' | 'control' | 'shared'}
 * @argument env {'production' | 'development'}
 * @argument variationDir {string}
 * */
const handleCompilerOutput = (fileType, env, variationDir) => {
  const { expPath } = getPaths();
  const package = resolvePackage(variationDir);
  const fileJsPath = path.join(variationDir, `${fileType}.js`);
  const codeFound = fs.existsSync(fileJsPath);
  const rawCode = codeFound && fs.readFileSync(fileJsPath, 'utf-8');
  const prettified = prettier.format(rawCode || '', {
    useTabs: !!package?.conversiondev,
    parser: 'babel',
    printWidth: 200,
  });
  const splitPathRegExp = expPath.split('/').map(it => `(${it}/)?`);
  const concatRegExp = new RegExp(`CONCATENATED MODULE: ./${splitPathRegExp.join('')}`, 'g');
  const concatModuleReplaced = prettified.replace(concatRegExp, `CONCATENATED MODULE: ${expPath}/`);

  if (package?.conversiondev) {
    let webpackReplaced = concatModuleReplaced
      .replace(/\/\*{6}\/ "use strict";[\n\r]\t/, '')
      .replace(/\/\/ webpackBootstrap[\n\r]\t/, '');

    if (webpackReplaced.match(/__webpack_exports__/g)?.length === 1) {
      webpackReplaced = webpackReplaced.replace(/var __webpack_exports__ = {};\s?/, '');
    }

    const template = getCodeInConversionTemplate(webpackReplaced, fileType, env, variationDir);

    if (template.type === 'html') {
      const fileHtmlPath = path.join(variationDir, `${fileType}.html`);

      if (template.code) {
        fs.writeFileSync(fileHtmlPath, template.code);
      }

      if (codeFound) {
        fs.unlinkSync(fileJsPath);
      }
    } else if (template.code) {
      fs.writeFileSync(fileJsPath, template.code);
    }

    return template.code;
  }

  if (concatModuleReplaced) {
    fs.writeFileSync(fileJsPath, concatModuleReplaced);
  }
  return concatModuleReplaced;
};

/** @argument sourceDir {string} */
/** @argument devDir {string} */
/** @argument variationDir {string} */
const compileTS = async (sourceDir, devDir, variationDir) => {
  const { rootDir: expRootDir } = getPaths();
  const variationEntry = path.join(sourceDir, 'index.ts');
  const controlEntry = path.join(sourceDir, 'control.ts');
  const sharedEntry = path.join(sourceDir, 'shared.ts');
  /** @type { webpack.Configuration } */
  const options = {
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
    entry: variationEntry,
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
    entry: variationEntry,
    output: {
      ...options.output,
      path: variationDir,
      filename: 'variation.js',
    },
    optimization: {
      minimize: false,
    },
    mode: 'production',
  });

  devCompiler.watch({}, async (devErr, devInfo) => {
    if (devErr || devInfo.hasErrors()) {
      return console.error('TS (dev) compilation error', devErr || devInfo.compilation.errors);
    }

    prodCompiler.run((prodErr, prodInfo) => {
      if (prodErr || prodInfo.hasErrors()) {
        return console.error('TS (prod) compilation error', prodErr || prodInfo.compilation.errors);
      }
      handleCompilerOutput('variation', 'production', variationDir);

      console.log('-----');
      console.table({
        'TS (Variation) updated': {
          'Experience path': `${variationDir.replace(expRootDir, '')}`,
          'Dev compile time': `${devInfo.endTime - devInfo.startTime} ms`,
          'Prod compile time': `${prodInfo.endTime - prodInfo.startTime} ms`,
        },
      });
    });
  });

  if (fs.existsSync(sharedEntry)) {
    const sharedDevCompiler = webpack({
      ...options,
      entry: sharedEntry,
      output: {
        ...options.output,
        path: devDir,
        filename: 'shared.js',
      },
      mode: 'development',
      devtool: 'eval-source-map',
    });
    const sharedProdCompiler = webpack({
      ...options,
      entry: sharedEntry,
      output: {
        ...options.output,
        path: variationDir,
        filename: 'shared.js',
      },
      optimization: {
        minimize: false,
      },
      mode: 'production',
    });

    sharedDevCompiler.watch({}, (devError, devInfo) => {
      if (devError || devInfo.hasErrors()) {
        return console.error('TS (dev) compilation error', devError || devInfo.compilation.errors);
      }

      sharedProdCompiler.run((prodError, prodInfo) => {
        if (prodError || prodInfo.hasErrors()) {
          return console.error('TS (dev) compilation error', prodError || prodInfo.compilation.errors);
        }
        handleCompilerOutput('shared', 'production', variationDir);

        console.log('-----');
        console.table({
          'TS (Shared) updated   ': {
            'Experience path': `${variationDir.replace(expRootDir, '')}`,
            'Dev compile time': `${devInfo.endTime - devInfo.startTime} ms`,
            'Prod compile time': `${prodInfo.endTime - prodInfo.startTime} ms`,
          },
        });
      });
    });
  }

  if (fs.existsSync(controlEntry)) {
    const controlCompiler = webpack({
      ...options,
      entry: controlEntry,
      output: {
        ...options.output,
        path: variationDir,
        filename: 'control.js',
      },
      optimization: {
        minimize: false,
      },
      mode: 'production',
    });

    controlCompiler.watch({}, (controlErr, controlInfo) => {
      if (controlErr || controlInfo.hasErrors()) {
        return console.error('TS (dev) compilation error', controlErr || controlInfo.compilation.errors);
      }
      handleCompilerOutput('control', 'production', variationDir);

      console.log('-----');
      console.table({
        'TS (Control) updated  ': {
          'Experience path': `${variationDir.replace(expRootDir, '')}`,
          'Prod compile time': `${controlInfo.endTime - controlInfo.startTime} ms`,
        },
      });
    });
  }
};

/** @argument sourceDir {string} */
/** @argument devDir {string} */
/** @argument variationDir {string} */
const compileSass = (sourceDir, devDir, variationDir) => {
  const package = resolvePackage();
  const { rootDir: expRootDir } = getPaths();
  const file = path.join(sourceDir, 'index.scss');
  const outFile = path.join(devDir, 'index.css');
  /** @type { sass.Options } */
  const options = { file, outFile };

  if (!fs.existsSync(file)) {
    return;
  }

  fs.ensureDirSync(devDir);
  const devStartTime = Date.now();
  const devInfo = sass.compile(file, {
    ...options,
    sourceMapContents: true,
    sourceMapEmbed: true,
    sourceMap: true,
  });

  fs.writeFileSync(outFile, devInfo.css);

  const prodStartTime = Date.now();
  const prodInfo = sass.compile(file, { ...options, style: 'expanded' });

  const endTime = Date.now();
  console.log('-----');
  console.table({
    'SCSS updated': {
      'Experience path': `${variationDir.replace(expRootDir, '')}`,
      'Dev compile time': `${endTime - devStartTime} ms`,
      'Prod compile time': `${endTime - prodStartTime} ms`,
    },
  });

  const prodFileCssPath = path.join(variationDir, 'variation.css');
  postcss([postcssPresetEnv({ browsers: ['iOS 8', 'not dead'] })])
    .process(prodInfo.css, { from: file, to: prodFileCssPath })
    .then(({ css }) => {
      const template = package?.conversiondev && getCodeInConversionTemplate(css, 'css', 'production', variationDir);
      if (template?.type === 'html') {
        const variationPath = path.join(variationDir, 'variation.html');
        fs.writeFileSync(variationPath, template.code);

        if (fs.existsSync(prodFileCssPath)) {
          fs.unlinkSync(prodFileCssPath);
        }
      } else {
        fs.writeFileSync(prodFileCssPath, css);
      }
    });
};

module.exports = { compileTS, compileSass, getCodeInConversionTemplate, resolvePackage };
