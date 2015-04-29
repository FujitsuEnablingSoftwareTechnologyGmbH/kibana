var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');
var keystoneHeaderOkKey = require('../lib/keystone/auth').resHeaderKey;

router.get('/config', function (req, res, next) {
    var keys = [
        'kibana_index',
        'default_app_id',
        'shard_timeout'
    ];
    var data = _.pick(config.kibana, keys);
    data.plugins = config.plugins;
    res.json(data);
});

// on / make sure that request was authenticated with keystone authenticate with keystone
router.get('/', function (req, res, next) {
    if (res.header(keystoneHeaderOkKey)) {
        return res.render('index');
    }
    return next();
});


module.exports = router;
