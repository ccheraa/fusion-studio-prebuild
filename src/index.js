const build = require('./build');
const { updatePackageJson: updatePackagejson, getModules} = require('./modules');

function buildPackages() {
  build().then(console.log);
}
function getModules() {
  modules()
    .then(console.log).catch(err => console.log('ERROR:', err));
}
function updatePackage() {
  updatePackagejson()
    .then(console.log).catch(err => console.log('ERROR:', err));
}
buildPackages();