var Promise = require('bluebird'),
  _ = require('lodash'),
  config = require('../../config').keystone,
  keystoneUtil = require('./util'),
  logger = require('../logger');

/**
 * Token key expected to be found among headers of the kibana request
 * @type {string}
 */
var keystoneHeaderName = 'X-Keystone-Token',
  responseHeaderKey = 'X-Keystone-Ok',
  ignoredAccepts = [
    'text/css',
    'text/js',
    'text/javascript'
  ],
  acceptedPaths = [
    '/',
    '/elasticsearch/' // TODO - requires tweaking, only /elasticsearch/ is validated, but /elasticsearch/_nodes is not
  ];

module.exports = function (req, res, next) {
  if (shouldIgnore(req)) {
    return next();
  } else {
    logger.debug('Accepted request [' + req.path + ']');
  }

  var session = req.session,
    token = handleToken(req),
    port = config.admin_port,
    keystoneHeader = {
      headers: {
        'X-Auth-Token'   : token,
        'X-Subject-Token': token
      }
    };

  /*
   TODO 1 - how can we know that retrieving token yet again is not good idea
   TODO 2 - how to get information about token [expiration date for instance]

   Following items will be covered in future releases of keystone-v3-client and handled
   automatically if possible
   */

  keystoneUtil
    .getKeystoneTokens(port)
    .check(keystoneHeader) // lean method to verify if token is valid
    .then(tokenValid, tokenInvalid);

  function tokenValid() {
    res.header(responseHeaderKey, true);

    // TODO check if is good, perhaps we should only call get all projects and check not_authorized, one request less ??
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
    res.header(responseHeaderKey, false);

    delete session.tenants;
    delete session.token;

    next(asError(response, 'Token ' + token + ' not valid'));
  }

  function asError(err, msg) {
    var responseError = new Error(msg);
    responseError.status = err.statusCode;
    return responseError;
  }

};

function shouldIgnore(req) {

  // iterate from back, so most important fn should be at the end
  var ignoreFn = [
      ignoreAccept,
      ignorePath
    ],
    len = ignoreFn.length;

  while (len--) {
    if (ignoreFn[len].call(this)) {
      return true;
    }
  }

  // if non of functions return true (i.e. ignore request), return false
  return false;

  function ignoreAccept() {
    return req.is(ignoredAccepts);
  }

  function ignorePath() {
    return _.indexOf(acceptedPaths, req.path) < 0;
  }
}


/**
 * Retrieves token from the response header using key <b>X-Keystone-Token</b>.
 * If token is found there following actions are taken:
 * - if token is not in session, it is set there
 * - if token is in session but it differs from the one in request's header, session's token is replaced with new one
 * If token is not found in request following actions are taken:
 * - if token is also not available in session, error is produced
 * - if token is available in session it is used
 *
 * @param req current request
 */
function handleToken(req) {
  var session = req.session,
    tokenSession = session.token,
    token = req.header(keystoneHeaderName) || req.query.token;

  if (!token && !tokenSession) {
    throw new Error('Token hasn\'t been located, looked in headers and session');
  }

  if (!token && tokenSession) {
    // token not in header but in session, use session token
    token = tokenSession;
  } else if ((token && !tokenSession) || (token !== tokenSession)) {
    // token located but not in session
    // or
    // token located <> token sesssion
    // update token in session
    session.token = token;
  }

  return token;
}
