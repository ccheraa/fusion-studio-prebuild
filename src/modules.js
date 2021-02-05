const { readFileSync, existsSync, writeFileSync } = require('fs');
const { join } = require('path');
const { get } = require('https');
const { build } = require('prebuild');
const forEachSeries = require('./series');
const sources = require('./sources');

async function request(url) {
  // console.log('GET:', url);
  try {
    return new Promise((resolve, reject) => {
      get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          res.setEncoding('utf8');
          let result = '';
          res.on('data', chunk => result += chunk);
          res.on('end', () => resolve(result));
        } else {
          reject(res);
        }
      });
    });
  } catch (err) {
    reject(err);
  }
}

async function getModuleVersion(module, theiaQueryVersion, params) {
  return new Promise(async (resolve, reject) => {
    let path = params.path;
    let packageContent;
    if (path) {
      if (!existsSync(path)) {
        reject('path not found: ' + path);
        return;
      }
      try {
        const packageFilename = join(path, 'node_modules', module, 'package.json');
        if (!existsSync(packageFilename)) {
          reject('packag.json not found: ' + packageFilename);
          return;
        }
        packageContent = await readFileSync(packageFilename, { encoding: 'utf-8' });
      } catch (err) {
        reject(err);
        return;
      }
    } else {
      try {
        const url = sources[module];
        if (url) {
          packageContent = await request(url.replace('%%version%%', theiaQueryVersion));
        } else {
          reject('source for package "' + module + '" not found.');
          return;
        }
      } catch (err) {
        reject(err);
        return;
      }
    }
    const package = JSON.parse(packageContent);
    resolve(path ? package.version : package.dependencies[module]);
  });
}
async function getTheiaVersion(params) {
  return new Promise(async (resolve, reject) => {
    let path = params.path;
    let packageContent;
    if (path) {
      if (!existsSync(path)) {
        reject('path not found: ' + path);
      }
      try {
        const packageFilename = join(path, 'package.json');
        if (!existsSync(packageFilename)) {
          reject('packag.json not found: ' + packageFilename);
        }
        packageContent = await readFileSync(packageFilename, { encoding: 'utf-8' });
      } catch (err) {
        reject(err);
      }
    } else {
      let version = params.version;
      queryVersion = version || 'master';
      version = version || 'latest';
      console.log('Fusion Studio: ' + version);
      const fusionStudioPackageUrl = 'https://raw.githubusercontent.com/evolvedbinary/fusion-studio/' + queryVersion + '/package.json';
      packageContent = await request(fusionStudioPackageUrl);
    }
    const package = JSON.parse(packageContent);
    resolve(package.dependencies['@theia/core']);
  });
}

async function getModules(params) {
  params = params || {};
  return new Promise(async (resolve, reject) => {
    try {
      const theiaVersion = await getTheiaVersion(params);
      console.log('Theia: ' + theiaVersion);
      let theiaQueryVersion = theiaVersion.replace(/^[^\.0-9]*/, '');
      theiaQueryVersion = theiaQueryVersion ? 'v' + theiaQueryVersion : 'master'
      const buildSrcUrl = 'https://raw.githubusercontent.com/eclipse-theia/theia/' + theiaQueryVersion + '/dev-packages/application-manager/src/rebuild.ts';
      const buildSrc = await request(buildSrcUrl);
      const modulesNames = buildSrc.match(/modulesToProcess\s*=.*\[\s*['"]([^\]]*)['"]\s*\]/)[1].split(/',\s*'/);
      const modules = {};
      forEachSeries(modulesNames, async (module, next) => {
        try {
          modules[module] = await getModuleVersion(module, theiaQueryVersion, params);
          next();
        } catch(err) {
          next(err);
        }
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve(modules);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
async function updatePackageJson(params) {
  return new Promise(async (resolve, reject) => {
    const modules = await getModules(params);
    const packageFilename = join(__dirname, '..', 'package.json');
    if (!existsSync(packageFilename)) {
      reject('packag.json not found: ' + packageFilename);
    }
    packageContent = await readFileSync(packageFilename, { encoding: 'utf-8' });
    const package = JSON.parse(packageContent);
    Object.keys(modules).forEach(module => package.dependencies[module] = modules[module]);
    writeFileSync(packageFilename, JSON.stringify(package, null, 2), { encoding: 'utf-8' });
  });
}
module.exports = {
  getModules,
  updatePackageJson,
}