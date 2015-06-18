var _ = require('lodash');

// variables
/**
 * List of content types that will be ignored (i.e. such request wont be candidate for keystone authentication).
 *
 * @type {string[]}
 * @name ignoredContentTypes
 * @private
 */
var ignoredContentTypes = [
    'text/css',
    'text/js',
    'text/javascript'
];

/** @module */
module.exports = {
    /**
     * Retrieves token from the response header using key <b>X-Keystone-Token</b>.
     * If token is found there following actions are taken:
     * - if token is not in session, it is set there
     * - if token is in session but it differs from the one in request's header, session's token is replaced with new one
     * If token is not found in request following actions are taken:
     * - if token is also not available in session, error is produced
     * - if token is available in session it is used
     *
     * @param {object} req current request
     * @param {string} name of the request's header, it is used to lookup the token value
     *
     * @returns {string} current token value
     */
    handleToken     : handleToken,
    /**
     * Evaluates if given <b>request</b> should be ignored thus that request
     * does not require keystone authentication. Such request would concern
     * static resources, for instance.
     *
     * @param {object} req current request
     *
     * @returns {boolean} true to ignore, false otherwise
     */
    canIgnoreRequest: canIgnoreRequest
};

function canIgnoreRequest(req) {
    // iterate from back, so most important fn should be at the end
    var ignoreFn = [ignoreAccept];
    var len = ignoreFn.length;

    while (len--) {
        if (ignoreFn[len].call(this)) {
            return true;
        }
    }

    // if non of functions return true (i.e. ignore request), return false
    return false;

    // private impl
    function ignoreAccept() {
        return req.is(ignoredContentTypes);
    }
}

function handleToken(req, headerTokenKey) {
    var session = req.session;
    var tokenSession = session.token;
    var token = req.header(headerTokenKey);

    if (!token && !tokenSession) {
        var error = new Error('Token hasn\'t been located, looked in headers and session');
        error.status = 400; // bad request :(
        throw error;
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
