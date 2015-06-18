var sinon = require('sinon');
var expect = require('expect.js');
var proxyquire = require('proxyquire');

describe('lib/keystone/index', function () {
    var config = {};
    var router;
    var express;
    var useFn;

    function keystoneAuth(req, res, next) {
    } // some dummy object

    beforeEach(function () {
        useFn = sinon.spy();
        express = {
            Router: sinon.stub().returns({
                use: useFn
            })
        };
    });

    afterEach(function () {

    });

    it('should return keystone auth module if config.keystone is set', function (done) {
        config.keystone = { // affect configuration to
            admin_port  : 6666,
            user_port   : 5555,
            keystone_url: 'http://keystone.com'
        };
        router = proxyquire('../../../../../src/server/lib/keystone', {
            './auth'      : keystoneAuth,
            'express'     : express,
            '../../config': config
        });

        expect(express.Router.called).to.be(true);
        expect(useFn.callCount).to.eql(2);
        expect(useFn.calledWith(keystoneAuth)).to.be(true);

        done();
    });

    it('should not return keystone auth module if config.keystone is not set', function (done) {
        config.keystone = undefined;
        router = proxyquire('../../../../../src/server/lib/keystone', {
            './auth'      : keystoneAuth,
            'express'     : express,
            '../../config': config
        });

        expect(express.Router.called).to.be(true);
        expect(useFn.callCount).to.eql(1);
        expect(useFn.calledWith(keystoneAuth)).to.be(false);

        done();
    });

});
