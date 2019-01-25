const pkg = require('./package.json');
const LINES = process.env.WS_LINES || 5;

module.exports = require('yargs')
  .env('LOGVIEWER')
  .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nusage: $0 [options] filename')
  .describe('user', 'username for HTTP authentication')
  .describe('password', 'password for HTTP authentication')
  .describe('port', 'webserver port')
  .describe('ssl', 'enable SSL')
  .describe('certfile', 'SSL certificate file')
  .describe('keyfile', 'SSL key file')
  .describe('filters', 'initial log filters in JSON format')
  .describe('lines', 'number of lines to preserve')
  .describe('help', 'show help')
  .required(1, 'A filename must be specified')
  .alias({
    f: 'filters',
    h: 'help',
    l: 'lines',
    p: 'password',
    P: 'port',
    u: 'user',
    v: 'version',
  })
  .default({
    'user': process.env.WS_USER,
    'password': process.env.WS_PASSWORD,
    'ssl': process.env.WS_SSL,
    'certfile': process.env.WS_CERTFILE,
    'keyfile': process.env.WS_KEYFILE,
    'filters': process.env.WS_FILTERS,
    'port': 4277,
    'lines': LINES,
  })
  .version()
  .help('help')
  .argv;
