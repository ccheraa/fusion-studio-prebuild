const build = require('./build');
const { updatePackageJson, getModules} = require('./modules');

function buildPackages() {
  build().then(console.log);
}
function doGetModules() {
  getModules()
    .then(console.log).catch(err => console.log('ERROR:', err));
}
function doUpdatePackageJson() {
  updatePackageJson()
    .then(console.log).catch(err => console.log('ERROR:', err));
}
buildPackages();