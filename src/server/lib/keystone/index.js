var config = require('../../config');
var express = require('express');

var router = module.exports = express.Router();

if (config.keystone) {
    router.use(require('./auth'));
    /* istanbul ignore next */
    // copied from src/server/app.js to properly display error in Kibana error view
    router.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send({message: err.message});
    });
} else {
    /* istanbul ignore next */
    // use empty middleware if config.keystone not set, no need to test
    router.use(function (req, res, next) {
        next();
    });
}
