/*
 *
 *  * Copyright ${year} FUJITSU LIMITED
 *  *
 *  * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  * in compliance with the License. You may obtain a copy of the License at
 *  *
 *  * http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the License
 *  * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 *  * or implied. See the License for the specific language governing permissions and limitations under
 *  * the License.
 *
 */

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
