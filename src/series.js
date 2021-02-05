module.exports = function forEachSeries(arr, next, callback) {
  function invoke(index) {
    if (index === arr.length) {
      callback();
      return;
    }
    next(arr[index], function(err) {
      if (err) {
        callback(err);
        return;
      }
      invoke(index + 1);
    });
  }
  invoke(0);
};
