var config = require('../config'),
  logger = require('./logger'),
  _ = require('lodash'),
  proxyMiddleware = require('kibana-multitenancy').proxyMiddleware;

/*
WIP >>> requires work later, this is multi-tenancy here
 */

module.exports = function(router){
 configureMiddleware(router);
};

/**
 * Configure middleware using embedded router
 */
function configureMiddleware(router){
  logger.debug('Configuring proxy middleware');
  try{

    router.use(function (req, res, next) {
      var uri = _.defaults({}, target),
        path = (/\/$/.test(uri.path)) ? uri.path : uri.path + '/',
        segments,
        esQuery;

      path = url.resolve(path, '.' + req.url);
      segments = path.split('?');
      esQuery = segments[0];

      if (proxyMiddleware.hasQueryHandler(esQuery)) {
        proxyMiddleware
          .usingElasticSearch(require('./elasticsearch_client'))
          .callQueryHandler(esQuery, req)
          .then(next) // call next for to go to actual proxy
          .catch(function(err){
            res
              .status(err.code || 500)
              .message(err.message || 'Query handler for path ' + esQuery + ' caused en error')
          })
      } else {
        // no way to handle current request and modify it
        next();
      }

    });

  }catch(err){
    logger.error('Failed to configure proxy middleware');
    logger.error(err.message);

    throw err;
  }
  logger.debug('Configuring proxy middleware completed')
}
