const prebuild = require('prebuild/prebuild');
const { join, basename } = require('path');
const { readFileSync, copyFileSync, existsSync, mkdirSync } = require('fs');
const log = require('npmlog');
const forEachSeries = require('./series');

let files;
const basePath = join(__dirname, '..');

function mkdir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir);
  }
}

function prebuildPackage(package, done) {
  const packagePath = join(basePath, 'node_modules', package);
  process.chdir(packagePath);
  const argv = process.argv = [process.execPath, __filename, '-s', '-t', '9.4.2', '-r', 'electron', '-p', 'node_modules/' + package];
  const pkg = JSON.parse(readFileSync(join(packagePath, 'package.json'), { encoding: 'utf-8' }));
  const rc = require('prebuild/rc');

  const options = Object.assign({}, rc, { log, pkg, argv });

  console.log('building "' + package + '"...');
  const packageDirname = pkg.name.split('/').pop();
  console.log(pkg);
  console.log(packageDirname);
  console.log(join(basePath, 'prebuild', packageDirname));
  mkdir(join(basePath, 'prebuild', packageDirname));
  mkdir(join(basePath, 'prebuild', packageDirname, 'v' + pkg.version));
  forEachSeries(options.prebuild, function (entry, next) {
    console.log(' - building for v' + entry.target + ' for ' + entry.runtime);
    prebuild(options, entry.target, entry.runtime, function (err, tarGz) {
      if (err) {
        return next(err);
      }
      copyFileSync(join(packagePath, tarGz), join(basePath, 'prebuild', packageDirname, 'v' + pkg.version, basename(tarGz)));
      files.push(join(packagePath, tarGz));
      next();
    })
  }, done);
}

module.exports = async function() {
  return new Promise((resolve, reject) => {
    files = [];
    const destination = join(basePath, 'prebuild');
    mkdir(destination);
    const package = JSON.parse(readFileSync(join(basePath, 'package.json'), { encoding: 'utf-8' }));
    const packages = Object.keys(package.dependencies); //.filter(module => ['prebuild'].indexOf(module) < 0);
    
    forEachSeries(packages, prebuildPackage,
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(files.map(filename => {
            const newFilename = join(destination, basename(filename));
            // copyFileSync(filename, newFilename);
            return newFilename;
          }));
        }
      },
    );
  });
}