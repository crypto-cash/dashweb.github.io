'use strict';
let mongoose = require('mongoose'),
   // debug = require('debug')('currency:budgets'),
    //  request = require('request'),
    async = require('async');

let Budgets = mongoose.model('Budget');
let Proposals = mongoose.model('Proposal');

// TODO: apply for partner api key with dashwhale
// https://www.dashwhale.org/dbin#partner
// const url = 'https://www.dashwhale.org/api/v1/budget';
// const timeout = 30; // minutes


/*
    // get json data at url
    function updateBudgetAndProposalData(cb) {
        let parsedJSON;
        // 1) get json data
        request.get(url, function (err, response, body) {
            if (err) {
                cb('ERROR: getting data from ' + url + ' : ' + err);
                return;
            }
            try {
                parsedJSON = JSON.parse(body);
                // cb(null, parsedJSON);
            }
            catch (ex) {
                cb('ERROR parsing json: ' + ex + '\nData = ' + body, null);
                return;
            }

            //  parse budget json data 
            let budgetData = parsedJSON.budget;
            // parse proposal json data
            let proposalData = parsedJSON.proposals;

            // save budget & proposals data to db via async task
            async.parallel(
                // array of tasks
                [
                    // save budget data to db
                    function (callback) {
                        saveBudgetData(budgetData, function (err, resp) {
                            debug(err, resp);
                            callback(); // so async knows this task is don
                        });
                    },
                    //  save proposals data to db
                    function (callback) {
                        saveProposalsData(proposalData, function (err, resp) {
                            debug(err, resp);
                            callback(); // so async knows this task is don
                        });
                    }
                ],
                //  callback when all tasts are done
                function (err) {
                    if (err) { debug(err); }
                    cb(err);
                }
            );
        });
    }


    // get data for Budget form db, if stall of unknow get it from external api
    function getBudgetsData(cb) {
        Budgets.findOne(function (err, BudgetData) {
            if (err) {
                cb('ERROR reading from db: ' + err, null);
            }
            if (BudgetData) {
                // have data, check if isn't stall
                let validUntil = new Date(BudgetData.updateDate.getTime() + timeout * 60 * 1000);
                debug('Budget data is valid until ' + validUntil.toString());
                if (validUntil < new Date().getTime()) {
                    debug('--> Budget data needs updating');
                    updateBudgetAndProposalData(function (err) {
                        if (err) {
                            cb(err);
                        } else {
                            getBudgetsData(cb);
                        }
                    });
                } else {
                    // budget data is ok, get all proposals and  return both
                    Proposals.find(function (err, ProposalsData) {
                        if (err) {
                            cb('ERROR cannot load proposals.' + err, null);
                            return;
                        }
                        // concat Budget and Proposals
                        let data = [BudgetData, ProposalsData];
                        cb(null, data);
                    });
                }
            } else {
                // don't have data, get it now
                debug('No Budget data found, get data now.');
                updateBudgetAndProposalData(function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        getBudgetsData(cb);
                    }
                });
            }
        });
    }

    // return array with Budget and Proposals
    function read(cb) {
        getBudgetsData(function (err, data) {
            cb(err, data);
        });
    }
*/

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
            function (callback) {
                saveBudgetData(budgetData, function (err) {
                    // debug(err, resp);
                    callback(err); // so async knows this task is done
                });
            },
            //  save proposals data to db
            function (callback) {
                saveProposalsData(proposalData, function (err) {
                    //    debug(err, resp);
                    callback(err); // so async knows this task is done
                });
            }
        ],
        //  callback when all tasts are done
        function (err) {
            if (err) { cb('ERROR saving budget / proposals : ' + err); }
            else { cb(null, 'Budget and proposals are updated and saved.'); }
        }
    );
}

function readDb(cb) {
    Budgets.findOne(function (err, BudgetData) {
        if (err) {
            cb('ERROR reading budget from db: ' + err, null);
        } else {
            Proposals.find(function (err, ProposalsData) {
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