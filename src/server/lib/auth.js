var config = require('../config');

module.exports = function () {

  if (config.htpasswd) {
    var httpAuth = require('http-auth'),
        backend = httpAuth.basic({file: config.htpasswd});
    return httpAuth.connect(backend);
  } else if (config.keystone) {
    return require('./keystone/auth');
  }

  return function (req, res, next) {
    return next();
  };

};
