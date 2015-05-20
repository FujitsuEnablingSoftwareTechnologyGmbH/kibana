var config = require('../../config').keystone,
  _ = require('lodash'),
  KeystoneClient = require('keystone-v3-client'),
  cache = {};

module.exports.getKeystoneTokens = getKeystoneTokens;
module.exports.getKeystoneProjects = getKeystoneProjects;
module.exports.parseKeystoneError = parseKeystoneError;

function parseKeystoneError(error) {
  return {
    status : error.status || error.code || 403,
    message: error.message || 'Not authorized to access Kibana'
  };
}

function getKeystoneProjects(port) {
  return getKeystoneClient(port).projects;
}

function getKeystoneTokens(port) {
  return getKeystoneClient(port).tokens;
}

function getKeystoneClient(port) {
  var keystoneUrlFn;
  if (cache[port]) {
    // client has been already created for given port
    return cache[port];
  }
  if (!port || port < 0) {
    throw new Error('port is undefined');
  }

  keystoneUrlFn = _.template(getUrl());
  return cache[port] = new KeystoneClient({
    url: keystoneUrlFn({port: port})
  });
}

function getUrl() {
  return config.keystone_url;
}
