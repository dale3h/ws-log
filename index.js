#!/usr/bin/env node

// Default debug level
process.env['DEBUG'] = '*,-send,-express:*';

// Module includes
const express = require('express');
const basicAuth = require('express-basic-auth');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Tail = require('tail').Tail;
const Debug = require('debug');
const config = require('./config.js');

// Express instances
const app = express();

// Debug instances
const debug = Debug('logview:debug');
const info = Debug('logview:info');
const warn = Debug('logview:warn');
const error = Debug('logview:error');

// Tail options
const logFile = config._[0];
const tailOpts = {
  follow: true,
  fromBeginning: false,
};

var logLines = [];

// User authentication
if (config.user && config.password) {
  users = {};
  users[config.user] = config.password;

  app.use(basicAuth({
    users: users,
    challenge: true,
    realm: 'Secure Area',
  }));
}

// Webserver
var server;

if (config.ssl) {
  try {
    var sslOptions = {
      cert: fs.readFileSync(config.certfile),
      key: fs.readFileSync(config.keyfile)
    };

    server = https.createServer(sslOptions, app);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
} else {
  server = http.createServer(app);
}

// Websocket server
const expressWs = require('express-ws')(app, server);
const wss = expressWs.getWss();

// Setup webserver and websocket server
app.use(express.static(path.join(__dirname, 'public')));

server.listen(config.port, () => info('listening on port %i (%s)', config.port, 'HTTP' + (config.ssl ? 'S' : '')));

app.ws('/', (ws, req) => {
  info('client connected from %s', req.connection.remoteAddress);

  ws.sendFrame = (frame) => {
    frame.timestamp = Date.now();

    if (typeof frame.id === 'undefined') {
      frame.id = frame.timestamp;
    }

    if (typeof frame.type !== 'undefined' && frame.type === 'result') {
      if (typeof frame.error !== 'undefined') {
        frame.success = false;
      } else {
        frame.success = true;
      }
    }

    if (typeof frame.error !== 'undefined') {
      error(frame.error.message);
    }

    ws.send(JSON.stringify(frame))
  };

  ws.parseFrame = (frame) => {
    try {
      frame = JSON.parse(frame);
    } catch (err) {
      ws.sendFrame({
        type: 'result',
        error: {
          message: err.message,
        },
      });
      return false;
    }

    if (typeof frame.type === 'undefined') {
      ws.sendFrame({
        id: typeof frame.id !== 'undefined' ? frame.id : undefined,
        type: 'result',
        error: {
          message: "Frame type must be set",
        },
      });
      return false;
    }

    if (typeof frame.timestamp === 'undefined') {
      frame.timestamp = Date.now();
    }

    if (typeof frame.id === 'undefined') {
      frame.id = frame.timestamp;
    }

    return frame;
  };

  ws.on('message', (msg) => {
    var frame = ws.parseFrame(msg);

    if (frame === false) {
      return;
    }

    switch (frame.type) {
      case 'getConfig':
        try {
          var {key} = frame.data;
        } catch (err) {
          error(err.message);
          ws.sendFrame({
            id: frame.id,
            type: 'result',
            error: {
              message: err.message
            },
          });
          return;
        }

        if (!config.hasOwnProperty(key)) {
          ws.sendFrame({
            id: frame.id,
            type: 'result',
            error: {
              message: "Config key not found: " + key,
            },
          });
          return;
        }

        var value = config[key];

        try {
          value = JSON.parse(value);
        } catch (err) {
          // Do nothing
        }

        ws.sendFrame({
          id: frame.id,
          type: 'result',
          result: {
            key: key,
            value: value
          }
        });

        break;

      case 'setConfig':
        var allowKeys = ['lines'];
        var {key, value} = frame.data;

        if (!config.hasOwnProperty(key)) {
          warn("Config key %o not found", key);
          return;
        } else if (!allowKeys.includes(key)) {
          warn("Setting config key %o not allowed", key);
          return;
        }

        debug("Set config key %o = %o", key, value);
        config[key] = value;

        if (key === 'lines') {
          if (config.lines > 0) {
            logLines = logLines.slice(config.lines * -1);
          } else {
            logLines = [];
          }
        }

        break;

      case 'getLines':
        try {
          var {lines} = frame.data;
        } catch (err) {
          var lines = logLines.length;
        }

        lines = Math.min(lines, logLines.length);

        if (lines) {
          for (var i = 0; i < lines; i++) {
            ws.sendFrame({
              type: 'log',
              data: {
                line: logLines[i]
              }
            });
          }
        }

        break;

      default:
        ws.sendFrame({
          id: frame.id,
          type: 'result',
          error: {
            message: "Unknown frame type: " + frame.type,
          },
        });
        break;
    }
  });
});

// Broadcast to all clients
wss.broadcast = (frame) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.sendFrame(frame);
    }
  });
};

// Start tailing log file
debug('start tailing %s', logFile);
var tail = new Tail(logFile, tailOpts);

tail.on('line', (line) => {
  if (config.lines > 0) {
    logLines.push(line);
    logLines = logLines.slice(config.lines * -1);
  } else {
    logLines = [];
  }

  if (!wss.clients.size) {
    return;
  }

  wss.broadcast({
    type: 'log',
    data: {
      line: line
    }
  });
});

tail.on('error', (err) => error(err));
