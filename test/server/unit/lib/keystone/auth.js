/*
 *
 *  * Copyright ${year} FUJITSU LIMITED
 *  *
 *  * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  * in compliance with the License. You may obtain a copy of the License at
 *  *
 *  * http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the License
 *  * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 *  * or implied. See the License for the specific language governing permissions and limitations under
 *  * the License.
 *
 */

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
