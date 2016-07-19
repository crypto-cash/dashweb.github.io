let path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    root: rootPath,
    app: {
      name: 'dashweb'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/dashweb-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'dashweb'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/dashweb-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'dashweb'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/dashweb-production'
  }
};

module.exports = config[env];
