
// blockchain  model
'use strict';

let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let blockchainSchema = new Schema({
 //   {"height":505536,"size":933,"hash":"","time":"1468913642","txlength":2,"difficulty":16880.88293557,"cbvalue":3.91666454},
    height:  Number,
    size: Number,
    hash:String,
    time:  Number,
    txlength: Number,
    difficulty: Number,
    cbvalue: Number,
    
  //  updateDate: { type: Date, default: new Date() }
});

blockchainSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('blockchain', blockchainSchema);

