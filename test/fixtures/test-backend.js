var async = require('async');
var express = require('express');

var app = express();

function nextTick(fn, that) {
  return function() {
    var args = Array.slice(arguments);
    process.nextTick(function() {
    val.apply(obj, args);
  }.bind(that || this);
}

app.get('/echo', function(req, res) {
  res.send(req.query.input);
});

app.get('/echo/chunked', function(req, res) {
  res.write = nextTick(res.write, res);
  res.end = nextTick(res.end, res);

  var parts = req.query.input.split('');

  async.eachSeries(parts, function(part, next) {
    res.write(part);
    next();
  }, function() {
    res.end('');
  });
});

app.get('/random', function(req, res) {
  res.send = nextTick(res.send, res);

  res.send(Math.random().toString());
});

app.listen(8081);
