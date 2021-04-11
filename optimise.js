/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require('path');

const fs = require('fs-extra');
const FileType = require('file-type');
const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const svgo = require('svgo');

const webpMimes = ['image/png', 'image/jpeg'];
/**
 * @arg {fs.Stats} file1
 * @arg {fs.Stats} file2
 * */
const getStats = (oldFile, newFile) => {
  const diff = Math.round(100 - (newFile.size * 100) / oldFile.size);

  return {
    'Old size (kB)': +(oldFile.size / 1024).toFixed(2),
    'New size (kB)': +(newFile.size / 1024).toFixed(2),
    Savings: `${diff}%`,
  };
};

const optimise = (experiment, quality = 80, optimiseAll = false) =>
  new Promise(resolve => {
    const optimisationInfo = {};
    const expDirectory = path.join(process.cwd(), experiment);
    const traverse = folder => {
      const files = fs.readdirSync(folder);

      return (async function checkFile(index) {
        const fileName = files[index];

        if (fileName) {
          const filePath = path.join(folder, fileName);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory(filePath)) {
            await traverse(filePath);
          } else {
            const info = await FileType.fromFile(filePath);
            const dirName = path.dirname(filePath);

            if (webpMimes.includes(info?.mime)) {
              const destination = path.join(dirName, 'webp');
              const destinationFilePath = path.join(destination, `${fileName.split('.')[0]}.webp`);

              if (optimiseAll || !fs.existsSync(destinationFilePath)) {
                await imagemin([filePath], {
                  plugins: [imageminWebp({ quality: +quality })],
                  destination,
                });

                if (/\.jpg$/.test(fileName)) {
                  fs.renameSync(filePath, path.join(folder, fileName.replace(/\.jpg$/, '.jpeg')));
                }

                const postStats = fs.statSync(destinationFilePath);
                optimisationInfo[fileName] = getStats(stats, postStats);
              }
            } else if (/\.svg$/.test(filePath) && !/\/min$/.test(dirName)) {
              const destination = path.join(dirName, 'min');
              const destinationFilePath = path.join(destination, fileName);

              if (optimiseAll || !fs.existsSync(destinationFilePath)) {
                const source = fs.readFileSync(filePath, 'utf-8');
                const optimised = svgo.optimize(source, {
                  plugins: svgo.extendDefaultPlugins([{ name: 'removeViewBox', active: false }]),
                  path: filePath,
                  multipass: true,
                });

                fs.ensureDirSync(destination);

                fs.writeFileSync(destinationFilePath, optimised.data);
                const postStats = fs.statSync(destinationFilePath);
                optimisationInfo[fileName] = getStats(stats, postStats);
              }
            }
          }

          return checkFile(index + 1);
        }

        if (folder === expDirectory) {
          if (Object.keys(optimisationInfo).length) {
            console.table(optimisationInfo);
          } else {
            console.log('Nothing to optimize 👌');
          }

          return resolve();
        }
      })(0);
    };

    traverse(expDirectory);
  });

module.exports = { optimise };
