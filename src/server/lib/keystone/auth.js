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

var Promise = require('bluebird'),
    _ = require('lodash'),
    config = require('../../config').keystone,
    keystoneUtil = require('./util'),
    authHelper = require('./authHelper'),
    logger = require('../logger');

/**
 * Name of the header under which keystone auth token is carried.
 *
 * @type {string}
 * @name KEYSTONE_AUTH_HEADER
 * @private
 */
var KEYSTONE_AUTH_HEADER = 'X-Auth-Token';
/**
 * Header added to processed response notifying that keystone authentication
 * was successful (true) or failed (false).
 *
 * @type {string}
 * @name RESPONSE_HEADER
 * @private
 */
var RESPONSE_HEADER = 'X-Auth-Ok';

/** @module */
module.exports = function (req, res, next) {
    if (authHelper.canIgnoreRequest(req)) {
        return next();
    } else {
        logger.debug('Accepted request [' + req.path + ']');
    }

    var session = req.session;
    var port = config.admin_port;
    var token;
    var keystoneHeader;
    try {
        token = authHelper.handleToken(req, KEYSTONE_AUTH_HEADER);
        keystoneHeader = {
            headers: {
                'X-Auth-Token'   : token,
                'X-Subject-Token': token
            }
        };
    } catch (err) {
        return next(err);
    }

    /*
     TODO - caching token locally as long as it is valid to prevent kibana
     requesting keystone to authenticate over and over again with keystone
     */
    keystoneUtil
        .getKeystoneTokens(port)
        .check(keystoneHeader) // lean method to verify if token is valid
        .then(tokenValid, tokenInvalid);

    function tokenValid() {
        res.header(RESPONSE_HEADER, true);

        keystoneUtil
            .getKeystoneProjects(port)
            .all(keystoneHeader) // retrieve all possible tenants
            .then(projectsOk, projectsFail);

        function projectsOk(response) {
            session.tenants = getTenants(response.data.projects);
            next();
        }

        function projectsFail(response) {
            next(asError(response, 'Failed to retrieve projects'));
        }

        function getTenants(tenants) {
            return _.pluck(tenants || [], 'name'); // pick names only
        }
    }

    function tokenInvalid(response) {
        res.header(RESPONSE_HEADER, false);

        delete session.tenants;
        delete session.token;

        next(asError(response, 'Token ' + token + ' not valid'));
    }
};

/**
 * Creates Error instance with passed message
 * and assign statusCode as error.code .
 *
 * @param err error object
 * @param msg error message
 * @returns {Error} instance error
 * @private
 */
function asError(err, msg) {
    var responseError = new Error(msg);
    responseError.status = err.statusCode;
    return responseError;
}
