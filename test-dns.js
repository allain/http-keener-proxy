// This gist is helpful in determining if the dns resolution is the bottleneck when making
// outbound http request
var dns = require('dns');

// enter the hostname and it's ip of the service you are making requests against below
var host = 'digg.com';
var iphost = '50.18.188.137';

function testLookupSpeed(host, label, count) {
  console.time(label);
  dns.lookup(host, function(err, address, family) {
    if (err) throw err;
    console.timeEnd(label);
    if (--count) {
      testLookupSpeed(host, label, count);
    }
  });
}

testLookupSpeed(iphost, 'lookup of ' + iphost, 3);
testLookupSpeed(host, 'lookup of ' + host, 3);
