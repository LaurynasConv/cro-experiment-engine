/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const fs = require('fs-extra');
const webpack = require('webpack');
const sass = require('node-sass');

const { sourceDir, devDir, expDir } = require('./paths');

const compileTS = () => {
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
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              ['@babel/plugin-transform-template-literals', { loose: true }],
            ],
          },
        },
        {
          test: /\.tsx?$/,
          loader: path.resolve(__dirname, 'loaders/html.js'),
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
    if (devErr) {
      return console.error(devErr);
    }

    console.log('Done TS (dev) compilation...');
    console.log(`  Compile time: ${devInfo.endTime - devInfo.startTime} ms`);

    prodCompiler.run((prodErr, prodInfo) => {
      if (prodErr || prodInfo.hasErrors()) {
        return console.error(prodErr || prodInfo.compilation.errors);
      }

      console.log('Done TS (prod) compilation...');
      console.log(`  Compile time: ${prodInfo.endTime - prodInfo.startTime} ms`);
    });
  });
};
const compileSass = () => {
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

      console.log('Done SCSS (dev) compilation...');
      console.log(`  Compile time: ${devInfo.stats.end - devInfo.stats.start} ms`);

      fs.writeFileSync(outFile, devInfo.css);

      sass.render({ ...options, outputStyle: 'expanded' }, (prodErr, prodInfo) => {
        if (prodErr) {
          throw prodErr;
        }

        console.log('Done SCSS (prod) compilation...');
        console.log(`  Compile time: ${prodInfo.stats.end - prodInfo.stats.start} ms`);

        fs.writeFileSync(path.join(expDir, 'index.css'), prodInfo.css);
      });
    },
  );
};

module.exports = { compileTS, compileSass };
