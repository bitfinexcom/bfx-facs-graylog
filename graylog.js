'use strict'

const async = require('async')

const Facility = require('./base')

const Gelf = require('gelf')

class LogFacility extends Facility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'log-graylog'
    this._hasConf = true

    this.customFormatter = opts.customFormatter

    this.init()
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      next => {
        this.gelf = new Gelf(this.conf)

        next()
      },
      next => {
        if (!this.conf.registerUncaughtErrorHandlers) {
          return next()
        }

        this.conf.registerUncaughtErrorHandlers.forEach((key) => {
          process.on(key, (err) => {
            if (this.customFormatter) {
              const msg = this.customFormatter(err, this)
              return this.gelf.emit('gelf.log', msg)
            }

            const msg = {
              full_message: JSON.stringify(err, Object.getOwnPropertyNames(err)),
              short_message: err.message,
              facility: process.title
            }

            this.gelf.emit('gelf.log', msg)
          })
        })

        next()
      }
    ], cb)
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      next => {
        this.gelf.closeSocket()
        next()
      }
    ], cb)
  }
}

module.exports = LogFacility
