var sinon = require('sinon'),
    expect = require('expect.js'),
    proxyquire = require('proxyquire'),
    _ = require('lodash');

describe('lib/keystone/util', function () {
    var util;
    var config = {};

    function MockKeystoneClient(settings) {
        this.settings = settings;
        this.projects = {};
        this.tokens = {};
    }

    beforeEach(function () {
        util = proxyquire('../../../../../src/server/lib/keystone/util', {
            'keystone-v3-client': MockKeystoneClient,
            '../../config'      : config
        });
    });

    context('getKeystoneClient', checkGeneral);
    context('check endpoints', checkEndpoints);

    function checkGeneral() {

        [-1, undefined].forEach(function (port) {
            it('should fail for invalid port ' + port, shouldFailInvalidPort(port));
        });
        [400, 1].forEach(function (port) {
            it('should succeeded for valid port ' + port, shouldPassValidPort(port));
        });

        function shouldPassValidPort(port) {
            return function (done) {
                var instance;
                var settingsObj = {
                    url: undefined
                };

                config.keystone_url = 'http://192.168.10.5:${port}';
                settingsObj.url = _.template(config.keystone_url)({
                    port: port
                });

                instance = util.getKeystoneClient(port);

                expect(instance.settings).not.to.be(undefined);
                expect(instance.settings).to.eql(settingsObj);

                done();
            };
        }

        function shouldFailInvalidPort(port) {
            return function (done) {
                expect(util.getKeystoneClient)
                    .withArgs(port)
                    .to
                    .throwException(function (err) {
                        expect(err.message).to.eql('Invalid port value, value was=' + port);
                    });
                done();
            };
        }
    }

    function checkEndpoints() {
        var instance;

        it('should return tokens endpoint', function (done) {
            instance = util.getKeystoneTokens(666);
            expect(instance).not.to.be(undefined);
            done();
        });

        it('should return tokens project', function (done) {
            instance = util.getKeystoneProjects(666);
            expect(instance).not.to.be(undefined);
            done();
        });
    }

});
