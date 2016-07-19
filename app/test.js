'use strict';

let  config = require('../config/config'),
  glob = require('glob'),
  mongoose = require('mongoose');



mongoose.connect(config.db);
let db = mongoose.connection;
db.on('error', function () {
  throw new Error('unable to connect to database at ' + config.db.test);
});

let models = glob.sync(config.root + '/app/models/*.js');
models.forEach(function (model) {
  require(model);
});
// let app = express();

// require('./config/express')(app, config);

var getData = require('./data/readData');
var debug=require('debug')('currency:test');

getData.read('blockchain',(err,result)=>{
    if (err) {debug('------ ' + err); }
    else{debug('++++ ' + result);}
});