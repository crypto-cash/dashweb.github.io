
// Budget propusal model
'use strict';

let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let BudgetSchema = new Schema({
    totalAmount: { type: Number, default: 0 },
    allotedAmount: { type: Number, default: 0 },

    paymentDueDays: String,
    paymentDate: Date,

    superblock: Number,
    
//    updateDate: { type: Date, default: new Date() }
});

BudgetSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('Budget', BudgetSchema);

