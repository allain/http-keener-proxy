var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');
var fs = require('fs-extra');
var crypto = require('crypto');

module.exports = Proxy;

function Proxy(options) {
  options = options || {};
      
  var cacheDir = options.cacheDir || '/tmp/proxy-cache/';

  var proxy = httpProxy.createProxyServer({});

  fs.mkdirsSync(cacheDir); 

  function createServer() {
    var server = http.createServer(function (req, res) {
      var cacheKey = buildCacheKey(req);
      var cacheFile = cacheDir + crypto.createHash('sha256').update(cacheKey).digest('hex');
      var cacheFileMeta = cacheFile + '.meta';

      var cached = fs.existsSync(cacheFile);
      if (cached) {
        serveFromCache();
      } else {
        proxyAndCache();
      }

      function serveFromCache() {
        var meta = fs.readJSONSync(cacheFileMeta);
        var headers = meta.headers;
        Object.keys(headers).forEach(function(key) {
          res.setHeader(key, headers[key]);
        });
          
        fs.createReadStream(cacheFile).pipe(res);
      }
 
      function proxyAndCache() {
        var urlParts = url.parse(req.url);

        var target = urlParts.protocol + '//' + urlParts.host;

        proxy.on('proxyRes', function (proxyRes, req, res) {
          proxyRes.pipe(fs.createWriteStream(cacheFile));
          fs.outputJSONSync(cacheFileMeta, {
            headers: proxyRes.headers
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
