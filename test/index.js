var assert = require('chai').assert;
var Proxy = require('..');
var request = require('request');

request.defaults({proxy: 'http://localhost:8080'});

describe('Proxy', function() {
  var testServer;
  var proxy;

  before(function() {
    testServer = require('./fixtures/test-server.js')(8081);
  });

  after(function() {
    testServer.close();
  });

  describe('basic config', function() {
    beforeEach(function() {
      proxy = new Proxy();
      proxy.listen(8080);
    });

    it('acts as a proxy in the simple case', function(done) {
      proxy.listen(8080);

      request('http://localhost:8081/random', function(err, resp, body) {
        assert(!err, err);
        assert.equal(resp.statusCode, 200); 
        done();
      });
    });
  });
});
