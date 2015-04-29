var config = require('../../config').keystone,
  _ = require('lodash'),
  KeystoneClient = require('keystone-client').KeystoneClient;

module.exports.getKeystoneClient = getKeystoneClient;
module.exports.parseKeystoneError = parseKeystoneError;

function parseKeystoneError(error) {
  return {
    status : error.status || error.code || 403,
    message: error.message || 'Not authorized to access Kibana'
  };
}

function getKeystoneClient(port) {
  if (!port || port < 0) {
    throw new Error('port is undefined');
  }
  var keystone_url = _.template(getUrl());
  return new KeystoneClient(keystone_url({port: port}));
}

function getUrl() {
  return config.keystone_url;
}
