var assert = require('assert');
var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');
var fs = require('fs-extra');
var crypto = require('crypto');
var debug = require('debug')('keeper-proxy');
var async = require('async');

var dns = require('./dns.js');

module.exports = KeenerProxy;

function KeenerProxy(options) {
  options = options || {};
      
  var cacheDir = options.cacheDir || '/tmp/proxy-cache/';
  debug('using cache dir %s', cacheDir);
  
  var proxy = httpProxy.createProxyServer({});

  proxy.on('connection', function (socket) {
    socket.setNoDelay(true);
	});
  
  proxy.on('error', function(err) {
    console.error(err);
	});
  
  proxy.on('open', function() {
    debug('open', arguments);
	});

  fs.mkdirsSync(cacheDir); 
  var responseWaiters = {};
 
  var proxyQueue = async.queue(function(task, cb) {
    var urlParts = url.parse(task.req.url);
    var portPart = urlParts.port ? ':' + urlParts.port : '';

    dns(urlParts.hostname, function(err, addresses) {
      assert(!err, err);
      assert(addresses.length > 0);
			var target = urlParts.protocol + '//' + addresses[0] + portPart;
			debug('proxying to %s', task.req.method + " " + target);
			
			responseWaiters[task.cacheKey] = [cb, Date.now()];
			proxy.web(task.req, task.res, { target: target });
		});
  }, 100);

  
  proxy.on('proxyRes', function (proxyRes, req, res) {
    var cacheKey = buildCacheKey(req);
    var cacheFile = cacheDir + crypto.createHash('sha256').update(cacheKey).digest('hex');

    var cacheFileMeta = cacheFile + '.meta';
		var writeStream = proxyRes.pipe(fs.createWriteStream(cacheFile));
		writeStream.on('finish', function() {
			debug('proxied ' + req.method + ' ' + req.url);
      debug('writing out meta for %s', cacheKey, proxyRes.headers); 
			fs.outputJSON(cacheFileMeta, {
				headers: proxyRes.headers
			}, function(err) {
				if (err) {
					console.error(err);
				}

        var rw = responseWaiters[cacheKey];

				rw[0]();
        debug('time taken to ' + req.method + ' ' + req.url + ': ' + (Date.now() -  rw[1]) + 'ms');
			});
		});
		
		writeStream.on('error', function(err) {
			debug('ERROR: ' + req.method + ' ' + req.url);
		});
    
  });

  function createServer() {
    return http.createServer(function (req, res) {
      var cacheKey = buildCacheKey(req);
      var cacheFile = cacheDir + crypto.createHash('sha256').update(cacheKey).digest('hex');

      var cacheFileMeta = cacheFile + '.meta';

      fs.exists(cacheFile, function(cached) {
        if (cached) {
          serveFromCache();
        } else {
          proxyQueue.push({
            req: req,
            res: res,
            cacheKey: cacheKey
          });
        }
      });

      function serveFromCache() {
        debug('serving from cache ' + req.method + ' ' + req.url);
        
        fs.readJSON(cacheFileMeta, function(err, meta) {
          if (err) {
            debug('ERROR', err);
            res.end('unable to load from cache');
            return;
					}
          var headers = meta.headers;

          Object.keys(headers).forEach(function(key) {
            res.setHeader(key, headers[key]);
          });

          fs.createReadStream(cacheFile).pipe(res).on('error', function(err) {
            debug(err);
					});
        });
      }
    });
  }

  function buildCacheKey(req) {
    return [
      req.method,
      req.headers.host,
      req.url,
      req.headers.authorization
    ].filter(Boolean).join('-');
  }

  return {
    createServer: createServer
  };
}

if (!module.parent) {
  var proxy = new KeenerProxy({});
  var server = proxy.createServer();

  server.listen(8080, function(err) {
    if (err) return console.error(err);
    console.log('Proxy listening on port ' + 8080);
  });
}
