var _ = require('lodash');
var morgan = require('morgan');
var env = process.env.NODE_ENV || 'development';
var bunyan = require('bunyan');
var StdOutStream = require('./StdOutStream');
var JSONStream = require('./JSONStream');
var config = require('../config');
var stream = { stream: new JSONStream() };
var streams = [];

if (env === 'development') {
  stream.stream = new StdOutStream();
}

if (!config.quiet) {
  streams.push(stream);
}

if(config.logging && env !== 'development'){
  streams.push({
    type: 'rotating-file',
    name: 'kibana-log-file-stream',
    path: config.logging.path || '/var/log/kibana.log',
    level: bunyan.resolveLevel(config.logging.level) || (config.quiet ? bunyan.ERROR : bunyan.DEBUG),
    period: config.logging.rotatePeriod || '1w',
    count: config.logging.logFileCount || 10
  });
}

var logger = module.exports = bunyan.createLogger({
  name: 'Kibana',
  streams: streams,
  serializers: _.assign(bunyan.stdSerializers, {
    res: function (res) {
      if (!res) return res;
      return {
        statusCode: res.statusCode,
        responseTime: res.responseTime,
        contentLength: res.contentLength
      };
    }
  })
});

