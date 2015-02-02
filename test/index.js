var assert = require('chai').assert;
var KeenerProxy = require('..');
var request = require('request');
var fs = require('fs-extra');
var rmdir = require('rimraf');
var debug = require('debug')('keener-proxy-test');

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

    afterEach(function(done) {
      proxyServer.close();
      rmdir.sync('/tmp/proxy-cache'); 
      done();
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

    it('does not significantly increase time of execution', function(done) {
      this.timeout(60000);
      var startUnproxied = Date.now(); 
      debug('querying unproxied');
      request({
        url: 'http://digg.com'
      }, function(err, resp, body) {
        assert(!err, err);
        assert.equal(resp.statusCode, 200);
        var unproxiedTime = Date.now() - startUnproxied;
        debug('unproxied took %d', unproxiedTime);

        debug('querying proxied');
				var startProxied= Date.now(); 
				request({
					url: 'http://digg.com',
          proxy: 'http://localhost:8080'
				}, function(err, resp, body) {
					assert(!err, err);
					assert.equal(resp.statusCode, 200);
					var proxiedTime = Date.now() - startProxied;
          debug('proxied took %d', proxiedTime);
          
          assert(proxiedTime / unproxiedTime < 2, 'should not take twice as long but took ' + proxiedTime + 'ms compared to ' + unproxiedTime);
          done();
				});
      }); 
		});

    it('caches requests ms apart', function(done) {
      request({
        url: 'http://localhost:8081/time',
        proxy: 'http://localhost:8080'
      }, function(err, resp, body1) {
        assert(!err, err);

        assert(body1.match(/^\d+/g), 'body1 should be number but is ' + body1);

        setTimeout(function() {
          request({
            url: 'http://localhost:8081/time',
            proxy: 'http://localhost:8080'
          }, function(err, resp, body2) {
            assert(!err, err);
            
            assert(body2.match(/^\d+/g), 'body2 should be number but is ' + body2);

            assert.equal(body1, body2);
            done();
          });
        }, 2);
      });
    });
    
    it('sends the same headers when returning cached pages', function(done) {
      request({
        url: 'http://localhost:8081/time',
        proxy: 'http://localhost:8080'
      }, function(err, resp, body1) {
        assert(!err, err);
        var headers1 = resp.headers;

        setTimeout(function() {
          request({
            url: 'http://localhost:8081/time',
            proxy: 'http://localhost:8080'
          }, function(err, resp, body2) {
            assert(!err, err);

            var headers2 = resp.headers;

            assert.deepEqual(headers1, headers2);
            done();
          });
        }, 2);
      });
    });
  });
});
