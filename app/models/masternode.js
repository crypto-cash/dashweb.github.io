
// masternode  model
'use strict';

let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let MasternodeSchema = new Schema({
    procotolVersion:  Number,
    ActiveMasternodesCount: Number,
    
  //  updateDate: { type: Date, default: new Date() }
});

MasternodeSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('Masternode', MasternodeSchema);

