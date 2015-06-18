var config = require('../../config').keystone;
var _ = require('lodash');
var KeystoneClient = require('keystone-v3-client');

/**
 * Holds references to keystone client created for different ports.
 *
 * @name cache
 * @type {{}}
 * @private
 */
var cache = {};

/** @module */
module.exports = {
    getKeystoneTokens  : getKeystoneTokens,
    getKeystoneProjects: getKeystoneProjects,
    getKeystoneClient  : getKeystoneClient
};

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
    } else if (!port || port < 0) {
        throw new Error('Invalid port value, value was=' + port);
    }

    keystoneUrlFn = _.template(config.keystone_url);
    return cache[port] = new KeystoneClient({
        url: keystoneUrlFn({port: port})
    });
}
