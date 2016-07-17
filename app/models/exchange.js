// Exchange model
'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ExchangeSchema = new Schema({
  exchangeName: String,
  currency: String,
  rate: Number,
  ratePercent: {type :Number, default: 0},
  volume: {type :Number, default: 0},
  volumePercent: {type :Number, default: 0},
  updateDate: Date
});

ExchangeSchema.virtual('date')
  .get(function(){
    return this._id.getTimestamp();
  });

mongoose.model('Exchange', ExchangeSchema);

