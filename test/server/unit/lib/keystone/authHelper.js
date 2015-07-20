/*
 *
 *  * Copyright 2015 FUJITSU LIMITED
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
    expect = require('expect.js');

describe('lib/keystone/authHelper', function () {
    var authHelper;
    var KeystoneHeader = 'X-Auth-Token';

    beforeEach(function () {
        authHelper = require('../../../../../src/server/lib/keystone/authHelper');
    });

    context('handleToken', handleToken);
    context('canIgnoreRequest', canIgnoreRequest);

    function canIgnoreRequest() {
        ['text/css', 'text/js', 'text/javascript'].forEach(function (ignoreCT) {
            it('should ignore request of contentType=' + ignoreCT, function () {
                var request = {
                    path: '/elasticsearch/a/b',
                    is  : sinon
                        .stub()
                        .withArgs(ignoreCT)
                        .returns(true)
                };

                expect(authHelper.canIgnoreRequest(request)).to.be(true);
            });
        });

        it('should by default allow every request [ignore=false]', function () {
            var request;

            ['/', '/test', '/shall', '/ignore'].forEach(function (path) {
                request = {
                    path: path,
                    is  : sinon
                        .stub()
                        .returns(false) // false corresponds to non-ignores content-type value
                };
                expect(authHelper.canIgnoreRequest(request)).to.be(false);
            });

        });
    }

    function handleToken() {
        it('should throw error if token not in header or session', function () {
            var expectedMsg = /You're not logged into the OpenStack. Please login via Horizon Dashboard/,
                request = {
                    session: {},
                    header : sinon.stub().returns(undefined)
                };

            expect(authHelper.handleToken)
                .withArgs(request, KeystoneHeader)
                .to
                .throwException(expectedMsg);
        });

        it('should use session token if requested does not have it', function () {
            var expectedToken = 'SOME_RANDOM_TOKEN';
            var token;
            var request = {
                session: {
                    token: expectedToken
                },
                header : sinon.stub().returns(undefined)
            };

            token = authHelper.handleToken(request, KeystoneHeader);

            expect(token).not.to.be(undefined);
            expect(token).to.be.eql(expectedToken);
        });

        it('should set token in session if not there and request has it', function () {
            var expectedToken = 'SOME_RANDOM_TOKEN';
            var token;
            var request = {
                session: {},
                header : sinon
                    .stub()
                    .withArgs(KeystoneHeader)
                    .returns(expectedToken)
            };

            token = authHelper.handleToken(request, KeystoneHeader);

            expect(token).not.to.be(undefined);
            expect(token).to.be.eql(expectedToken);

            expect(request.session.token).not.to.be(undefined);
            expect(request.session.token).to.be.eql(expectedToken);
        });

        it('should update token in session if request\'s token is different', function () {
            var expectedToken = 'SOME_RANDOM_TOKEN';
            var token;
            var request = {
                session: {
                    token: 'I_AM_VERY_OLD_TOKEN'
                },
                header : sinon
                    .stub()
                    .withArgs(KeystoneHeader)
                    .returns(expectedToken)
            };

            token = authHelper.handleToken(request, KeystoneHeader);

            expect(token).not.to.be(undefined);
            expect(token).to.be.eql(expectedToken);

            expect(request.session.token).not.to.be(undefined);
            expect(request.session.token).to.be.eql(expectedToken);
        });
    }
});
