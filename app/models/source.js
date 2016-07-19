
// source  model
'use strict';

let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let sourceSchema = new Schema({
    name:  String,
    url: String,    
    refreshEveryMinutes: Number,
    updating: {type: Boolean,default: false},

    updateDate: Date
});

sourceSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('Source', sourceSchema);

