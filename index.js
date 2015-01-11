var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');
var fs = require('fs');
var crypto = require('crypto');

module.exports = Proxy;

function Proxy() {
  var proxy = httpProxy.createProxyServer({});

  var cache = {};

  function createServer() {
    var server = http.createServer(function (req, res) {
      var cacheKey = buildCacheKey(req);


      var cacheFile = '/tmp/' + crypto.createHash('sha256').update(cacheKey).digest('hex');
      var cacheFileHeaders = cacheFile + '.headers';

      if (fs.existsSync(cacheFile)) {
        fs.createReadStream(cacheFile).pipe(res);
      } else {
        var urlParts = url.parse(req.url);

        var target = urlParts.protocol + '//' + urlParts.host;

        proxy.on('proxyRes', function (proxyRes, req, res) {
          //console.log(proxyRes);
          proxyRes.pipe(fs.createWriteStream(cacheFile));
          //console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
        });

        proxy.web(req, res, { target: target });
      }
    });

    return server;
  }

  function buildCacheKey(req) {
    return [
      req.method,
      req.headers.host,
      req.url,
      req.headers.authorization
    ].join('-');
  }

  return {
    createServer: createServer
  };
}
