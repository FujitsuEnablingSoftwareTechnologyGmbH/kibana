var sinon = require('sinon'),
    expect = require('expect.js'),
    proxyquire = require('proxyquire'),
    Promise = require('bluebird'),
    _ = require('lodash');

describe('lib/keystone/auth', function () {
    var token = 'SOME_TOKEN';
    var request;
    var response;
    var auth;
    var stubbedUtil = {
        projects: undefined,
        tokens  : undefined
    };

    beforeEach(setUp);
    afterEach(tearDown);

    it('should authenticate with keystone and retrieve tenants', authenticateAndRetrieveProjects);
    it('should authenticate with keystone but fail to retrieve tenants', authenticateButNotRetrieveProjects);
    it('should not authenticate with keystone', notAuthenticateWithKeystone);

    function notAuthenticateWithKeystone(done) {
        var error = {
            statusCode: 666
        };

        stubbedUtil.tokens.returns({
            check: sinon.stub().returns(Promise.reject(error))
        });

        request = {session: {}};
        response = {header: sinon.spy()};

        auth(request, response, function (err) {

            expect(response.header.calledWith('X-Auth-Ok', false)).to.be(true);
            expect(request.session.tenants).to.be(undefined);

            expect(err.status).to.eql(error.statusCode);

            expect(stubbedUtil.projects.called).to.be(false);

            done();
        });
    }

    function authenticateAndRetrieveProjects(done) {
        var expectedProjects = [{
            name: 'Project'
        }];

        stubbedUtil.tokens.returns({
            check: sinon.stub().returns(Promise.resolve())
        });
        stubbedUtil.projects.returns({
            all: sinon.stub().returns(Promise.resolve({
                data: {
                    projects: expectedProjects
                }
            }))
        });

        request = {session: {}};
        response = {header: sinon.spy()};

        auth(request, response, function () {
            expect(response.header.calledWith('X-Auth-Ok', true)).to.be(true);
            expect(request.session.tenants).to.eql(_.pluck(expectedProjects, 'name'));

            done();
        });

    }

    function authenticateButNotRetrieveProjects(done) {
        var error = {
            statusCode: 666
        };

        stubbedUtil.tokens.returns({
            check: sinon.stub().returns(Promise.resolve())
        });
        stubbedUtil.projects.returns({
            all: sinon.stub().returns(Promise.reject(error))
        });

        request = {session: {}};
        response = {header: sinon.spy()};

        auth(request, response, function (err) {

            expect(response.header.calledWith('X-Auth-Ok', true)).to.be(true);
            expect(request.session.tenants).to.be(undefined);

            expect(err.status).to.eql(error.statusCode);

            done();
        });

    }

    function setUp() {
        var keystoneUtil = require('../../../../../src/server/lib/keystone/util');
        stubbedUtil.tokens = sinon.stub(keystoneUtil, 'getKeystoneTokens');
        stubbedUtil.projects = sinon.stub(keystoneUtil, 'getKeystoneProjects');

        auth = proxyquire('../../../../../src/server/lib/keystone/auth', {
            './authHelper': {
                // turn off auth helper
                handleToken     : sinon.stub().returns(token),
                canIgnoreRequest: sinon.stub().returns(false)
            },
            './util'      : {
                getKeystoneTokens  : stubbedUtil.tokens,
                getKeystoneProjects: stubbedUtil.projects
            }
        });
    }

    function tearDown() {
        stubbedUtil.projects.restore();
        stubbedUtil.tokens.restore();
    }

});
