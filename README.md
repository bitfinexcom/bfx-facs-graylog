# bfx-facs-graylog

## Development

```
git clone https://github.com/bitfinexcom/bfx-facs-graylog
cd bfx-facs-graylog
git remote add upstream https://github.com/bitfinexcom/bfx-facs-base

```

## Usage

In your service, run:

```
npm i --save https://github.com/bitfinexcom/bfx-facs-graylog
```

Add the example config to `config/facs/log-graylog.config.json`:

```
cp node_modules/bfx-facs-graylog/log-graylog.config.json.example config/facs/log-graylog.config.json
```

And edit your config:

```
vim config/facs/log-graylog.config.json
```

### Integration into service

In your main worker, load the facility. For the service `bfx-util-net-js`, the file would be `api.net.util.wrk.js`: https://github.com/bitfinexcom/bfx-util-net-js/blob/master/workers/api.net.util.wrk.js#L47

```js

  init () {
    super.init()

    this.setInitFacs([
      ['fac', 'bfx-facs-graylog', 'production', 'production', {}, 0]
    ])
  }

```

The first `production` string matches to the key `production` in our config.json and enables us to run with multiple Graylog servers and configurations. Internally it is called `ns`. The second `production` value is called `label`. Together `ns` and `label` are used internally to create the namespace for our current facility instance. This way we can run multiple facilities of the same type in one worker.

The `0` means the priority in which the facility is started and stopped. A facility with `0` is started very early, a facility with `100` gets started quite late. Negative values are also possible, some core functionalities run with a prio setting of `-10`.

The empty hash `{}` are options we can pass at runtime (instead via config file).

This facility supports custom message formatters. [The example is part of the config section.](#custom-formatters)

## Example Config

```js
{
  "production": {
    "graylogPort": 12201,
    "graylogHostname": "127.0.0.1",
    "connection": "wan",
    "maxChunkSizeWan": 1420,
    "maxChunkSizeLan": 8154,

    "registerUncaughtErrorHandlers": [
      "uncaughtException",
      "unhandledRejection",
      "warning"
    ]
  }
}

```

`registerUncaughtErrorHandlers` will register error handlers for Graylog.
Set to `false` to disable. To enable, pass an array, e.g.:

```
"registerUncaughtErrorHandlers": [
  "uncaughtException",
  "unhandledRejection",
  "warning"
]
```

**Internally** the configured error events then taking care to send the stack to Graylog:

```js
process.on('uncaughtException', sendStackToGraylog)
process.on('unhandledRejection', sendStackToGraylog)
process.on('warning', sendStackToGraylog)

```

### Custom formatters

To send custom messages with `registerUncaughtErrorHandlers` you can inject a custom formatter:

```js
const format = (err, self) => {
  return {
    full_message: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    short_message: err.message,
    facility: process.title
  }
}

const opts = { customFormatter: format }

this.setInitFacs([
  ['fac', 'bfx-facs-graylog', 'production', 'production', opts, 0]
])

```

## API

### event: gelf.log

Sends a message to Graylog

```js
// send just a shortmessage
const optionalCallback = () => { console.log('i am optional!') }
fac.emit('gelf.log', 'myshortmessage', optionalCallback)

// send a full message
const message = {
  "version": "1.0",
  "host": "www1",
  "short_message": "Short message",
  "full_message": "Backtrace here\n\nmore stuff",
  "timestamp": 1291899928.412,
  "level": 1,
  "facility": "payment-backend",
  "file": "/var/www/somefile.rb",
  "line": 356,
  "_user_id": 42,
  "_something_else": "foo"
}

fac.emit('gelf.log', message, optionalCallback)
```

### event: error

Emitted in an error case

```js
fac.on('error', (err) => { console.log('ouch!') })

```

### method: closeSocket

Closes the open socket (opened at instanciation time)

```js
fac.closeSocket()
```

### method: openSocket

(Re-)Opens the UDP socket

```js
fac.openSocket()
```
