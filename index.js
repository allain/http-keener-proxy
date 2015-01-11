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

      fs.exists(cacheFile, function(exists) {
        if (exists) {
          serveFromCache();
        } else {
          proxyAndCache();
        }
      });

      function serveFromCache() {
        fs.readFile(cacheFileHeaders, function(err, json) {
          if (json) {
            var headers = JSON.parse(json);
            Object.keys(headers).forEach(function(key) {
              res.setHeader(key, headers[key]);
            });
          }
          fs.createReadStream(cacheFile).pipe(res);
	});
      }
 
      function proxyAndCache() {
        var urlParts = url.parse(req.url);

        var target = urlParts.protocol + '//' + urlParts.host;

        proxy.on('proxyRes', function (proxyRes, req, res) {
          proxyRes.pipe(fs.createWriteStream(cacheFile));
          fs.writeFile(cacheFileHeaders, JSON.stringify(proxyRes.headers), function(err) {
          });
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
