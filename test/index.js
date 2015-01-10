var assert = require('chai').assert,
    Proxy = require('..');

describe('Proxy', function() {
  it('can be created', function(done) {
    var proxy = new Proxy();
    done();
  });

  it('uses /tmp if no cache directory given', function(done) {
  });
});
