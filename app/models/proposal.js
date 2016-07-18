// Proposal propusal model
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ProposalSchema = new Schema({
    Hash: String,
    Title: String,
    Url: String,
    Owner: String,
    VotesYes: { type: Number, default: 0 },
    VotesNo: { type: Number, default: 0 },
   // VotePercent: { type: Number, default: 0 },
    WillBeFunded : Boolean,
    Amount: { type: Number, default: 0 },
    updateDate: { type: Date, default: new Date() }
});

ProposalSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('Proposal', ProposalSchema);

