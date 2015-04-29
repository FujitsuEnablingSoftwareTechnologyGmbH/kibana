var Promise = require('bluebird'),
  _ = require('lodash'),
  config = require('../../config').keystone,
  keystoneUtil = require('./util');

/**
 * Token key expected to be found among headers of the kibana request
 * @type {string}
 */
var tokenKey = 'X-Keystone-Token',
  resHeaderKey = 'X-Keystone-Ok',
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
    console.log('Ignored request for ' + req.path);
    return next();
  }

  var session = req.session,
    token = getToken(req);

  /*
   TODO 1 - how can we know that retrieving token yet again is not good idea
   TODO 2 - how to get information about token [expiration date for instance]
   */

  keystoneUtil.getKeystoneClient(config.admin_port).validateToken(token, validateTokenCb);

  function validateTokenCb(err, data) {
    if (err) {
      console.log('Keystone authentication not ok');

      res.header('X-Keystone-Ok', false);
      res.status(403).json(err);

    } else {
      console.log('Keystone authentication ok');

      session.tenants = data.tenants;

      if (!res.headersSent) {
        // add header informing that accepted request has been authenticated
        res.header('X-Keystone-Ok', true);
      }
      next();
    }

  }

};

module.exports.tokenKey = tokenKey;
module.exports.resHeaderKey = resHeaderKey;

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
    var accept = req.accepts(), // array here
      ignore = false;

    _.forEachRight(accept, function (act) {
      // iterate over accept values from request
      ignore = _.findIndex(ignoredAccepts, function (val) {
          return act.indexOf(val) >= 0;
        }) >= 0;
      if (ignore) {
        // stop loop
        return false;
      }
    });

    return ignore;
  }

  function ignorePath() {
    var path = req.path;
    return _.indexOf(acceptedPaths, path) < 0;
  }
}


/**
 * Retrieves the token. Note that token shoule be passed
 * @param req
 */
function getToken(req) {
  var session = req.session,
    tokenSession = session.token,
    token = req.header(tokenKey) || req.query.token;

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
