'use strict';
let mongoose = require('mongoose'),
    async = require('async');

let Budgets = mongoose.model('Budget');
let Proposals = mongoose.model('Proposal');



// write all proposals data in Db (insert or update)
function saveProposalsData(proposalsData, cb) {
    // async save all proposals
    async.forEach(proposalsData,
        function (data, callback) {
            Proposals.findOneAndUpdate(
                { 'Hash': data.hash },   // find Proposal on it's hash
                {
                    Title: data.title,
                    Url: data.dw_url,
                    Owner: data.owner_username,
                    VotesYes: data.yes,
                    VotesNo: data.no,
                    //   VotePercent: data.VotePercent,
                    Amount: data.monthly_amount,   // TODO: watchout for multiple months
                    WillBeFunded: data.will_be_funded,
                    Hash: data.hash
                },
                { // insert new, update existing
                    upsert: true
                },
                function (err) {// callback of findOneAndUpdateŸ
                    // if (err) {
                    //     debug('ERROR updating db: ' + err);
                    // } else {
                    //     debug('Proposal ' + data.name + ' (' + data.hash + ')updated.');
                    // }
                    callback(err); // let async know saveing of this one is done
                });
        },
        // all proposals are saved
        function (err) {
            cb(err);
        });
}

function saveBudgetData(data, cb) {
    Budgets.findOneAndUpdate(
        { 'superblock': data.superblock },   // find budgets unique superblock
        {
            totalAmount: data.total_amount,
            allotedAmount: data.alloted_amount,
            paymentDueDays: data.payment_date_human,
            paymentDate: data.payment_date,
            superblock: data.superblock,
            //   updateDate: new Date()
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback
            // if (err) {
            //     return cb('ERROR updating db: ' + err, null);
            // } else {
            //     return cb(null, 'Budget data for superblock ' + data.superblock + ' updated.');
            // }
            cb(err);
        });
}


// save budget & proposals data to db
function save(data, cb) {
    // TODO: add locking ?

    //  parse budget json data 
    let budgetData = data.budget;
    // parse proposal json data
    let proposalData = data.proposals;

    // save budget & proposals data to db via async task
    async.parallel(
        // array of tasks
        [
            // save budget data to db
            callback => { saveBudgetData(budgetData, err => { callback(err); }); },
            //  save proposals data to db
            callback => { saveProposalsData(proposalData, err => { callback(err); }); }
        ],
        //  callback when all tasts are done
        function (err) {
            if (err) { cb('ERROR saving budget / proposals : ' + err); }
            else { cb(null, 'Budget and proposals are updated and saved.'); }
        }
    );
}

function readDb(cb) {
    Budgets.findOne((err, BudgetData) => {
        if (err) {
            cb('ERROR reading budget from db: ' + err, null);
        } else {
            Proposals.find((err, ProposalsData) => {
                if (err) {
                    cb('ERROR reading proposals from db: ' + err, null);
                    return;
                }
                // concat Budget and Proposals data
                let data = [BudgetData, ProposalsData];
                cb(null, data);
            });
        }
    });
}

module.exports = { readDb, save };