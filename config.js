const pkg = require('./package.json');

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
    'port': 4277,
    'lines': 5,
  })
  .version()
  .help('help')
  .argv;
