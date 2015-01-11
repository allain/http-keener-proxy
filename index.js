var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');

module.exports = Proxy;

function Proxy() {
  var proxy = httpProxy.createProxyServer({});

  function createServer() {
    var server = http.createServer(function (req, res) {
      var urlParts = url.parse(req.url);

      var target = urlParts.protocol + '//' + urlParts.host;

      proxy.web(req, res, {
        target: target
      });
    });

    return server;
  }

  return {
    createServer: createServer
  };
}
