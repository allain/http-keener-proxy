var dns = require('native-dns');
var util = require('util');
var debug = require('debug')('dns');

module.exports = function(hostname, cb) {
  debug('looking up %s', hostname);

  if (hostname === 'localhost') {
		return cb(null, ['127.0.0.1']);
	}
  var addresses = [];
  var error = null;

	var question = dns.Question({
		name: hostname,
		type: 'A',
	});


	var req = dns.Request({
		question: question,
		server: { address: '8.8.8.8', port: 53, type: 'udp' },
		timeout: 1000,
	});

	req.on('timeout', function () {
    error = new Error('DNS timeout');
	});

	req.on('message', function (err, response) {
    debug('received message', response);
		response.answer.forEach(function (a) {
			addresses.push(a.address);
		});
	});

	req.on('end', function () {
    cb(error, addresses);	
  });
}
