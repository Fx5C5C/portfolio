
var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')

exports.getCurrentPosition = function (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  navigator.geolocation.getCurrentPosition(function (position) {
    callback(null, position)
  }, function (error) {
    callback(error)
  }, options)
}

exports.createWatcher = function (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  var watcher = new Watcher(options)

  if (callback) {
    watcher.on('change', callback)
  }

  watcher.start()

  return watcher
}

function Watcher(options) {
  EventEmitter.call(this)

  this.watching = false
  this.options = options || {}
  this.handle = null
}
inherits(Watcher, EventEmitter)
exports.Watcher = Watcher

Watcher.prototype.start = function () {
  if (this.watching) return
  this.watching = true
  var self = this
  this.handle = navigator.geolocation.watchPosition(function (position) {
    self.emit('change', position)
  }, function (error) {
    self.emit('error', error)
  }, this.options)
}

Watcher.prototype.stop = function () {
  if (!this.watching) return
  this.watching = false
  navigator.geolocation.clearWatch(this.handle)
}
