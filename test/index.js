var assert = require('chai').assert;
var KeenerProxy = require('..');
var request = require('request');

request.defaults({proxy: 'http://localhost:8080'});

describe('KeenerProxy', function() {
  var testServer;
  var proxy;
  var proxyServer;

  before(function() {
    testServer = require('./fixtures/test-server.js')(8081);
  });

  after(function() {
    testServer.close();
  });

  describe('basic config', function() {
    beforeEach(function() {
      proxy = new KeenerProxy();
      proxyServer = proxy.createServer();
      proxyServer.listen(8080);
    });

    afterEach(function() {
      proxyServer.close();
    });

    it('acts as a proxy', function(done) {
      request({
        url: 'http://localhost:8081/test.txt',
        proxy: 'http://localhost:8080'
      }, function(err, resp, body) {
        assert(!err, err);
        assert.equal(resp.statusCode, 200);
        assert.equal(body, 'Hello World\n');
        done();
      });
    });

    it('caches requests ms apart', function(done) {
      request({
        url: 'http://localhost:8081/time',
        proxy: 'http://localhost:8080'
      }, function(err, resp, body1) {
        assert(!err, err);

        setTimeout(function() {
          request({
            url: 'http://localhost:8081/time',
            proxy: 'http://localhost:8080'
          }, function(err, resp, body2) {
            assert(!err, err);

            assert.equal(body1, body2);
            done();
          });
        }, 2);
      });
    });
  });
});
