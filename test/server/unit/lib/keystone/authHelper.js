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

        it('should not ignore / and /elasticsearch/* requests', function () {
            var paths = [
                '/',
                '/elasticsearch/',
                '/elasticsearch/a',
                '/elasticsearch/a/b',
                '/elasticsearch/a/b/c',
                '/elasticsearch/a/b/c/d'
            ];
            var request;

            paths.forEach(function (path) {
                request = {
                    path: path,
                    is  : sinon
                        .stub()
                        .returns(false)
                };
                expect(authHelper.canIgnoreRequest(request)).to.be(false);
            });
        });
    }

    function handleToken() {
        it('should throw error if token not in header or session', function () {
            var request = {
                session: {},
                header : sinon.stub().returns(undefined)
            };

            expect(authHelper.handleToken)
                .withArgs(request, KeystoneHeader)
                .to
                .throwException('Token hasn\'t been located, looked in headers and session');
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
