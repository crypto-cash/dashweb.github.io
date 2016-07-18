'use strict';
var express = require('express'),
    router = express.Router(),
    debug = require('debug')('currency:markets'),
    async = require('async');

// var Exchanges = mongoose.model('Exchange');
var markets = require('../data/markets');
var budgets = require('../data/budgets');


// show data for exchanges on currency page
router.get('/', function (req, res, next) {
    var marketData, marketAvg, BPdata;
    async.parallel(
        [
            // get market data
            function (callback) {
                markets.readAll(function (err, data) {
                    if (err) { debug('MARKETS: ' + err); }
                    else {
                        // TODO: calaculate averages 
                        marketAvg = {
                            btcVolume: 0,
                            usdVolume: 0,
                            usdRate: 0,
                            usdPrecent: 0,
                            btcRate: 0,
                            btcPrecent: 0,
                            usdVolumePrecent: 0,
                            btcVolumePrecent: 0
                        };
                        marketData = data;
                        callback();
                    }
                });
            },
            // get Budget & propusal data
            function (callback) {
                budgets.read(function (err, data) {
                    if (err) { debug('BUDGETS: ' + err); }
                    else {
                        BPdata = data;
                        callback();
                    }
                });
            }
        ],
        // all tasks are done
        function (err) {
            if (marketData && marketAvg && BPdata && !err) {
                res.render('currency', { Exchanges: marketData, marketAvg: marketAvg, BudgetData: BPdata[0], Proposals: BPdata[1] });
            } else {
                res.send('Didn\'t get all the data I needed ' + err);
            }
        }
    );
});
            // var output = '<h2>BUDGET</h2>';
            // var BudgetData = data[0];
            // output += 'budget amount: ' + BudgetData.totalAmount + '</br>';
            // output += 'budget allotted: ' + BudgetData.allotedAmount + '</br>';
            // output += 'paymont date : ' + BudgetData.paymentDate + '</br>';
            // output += 'paymont due days: ' + BudgetData.paymentDueDays + '</br>';

            // output += '<h2>PROPOSALS</h2>'
            // var ProposalsData = data[1];
            // ProposalsData.forEach(function (proposal) {
            //     output += 'Proposal title: ' + proposal.Title + '</br>';
            //     output += 'Owner: ' + proposal.Owner + '</br>';
            //     output += 'Votes (yes/no): ' + proposal.VotesYes + '/' + proposal.VotesNO + '</br>';
            //     // output += 'Votes % :' + proposal.VotePercent);
            //     output += 'Will be funded :' + proposal.WillBeFunded + '</br>';
            //     output += 'Amount :' + proposal.Amount + ' Dash' + '</br>';
            //     //  output += 'Update time: ' + Proposal.updateDate.toString());
            //     output += '<br><br>';
            // }, this);

            // res.send(output);

// test page
router.get('/test', function (req, res, next) {
    var WorldCoinParams = exchangeParams.find(function (f) { return f.exchangeName === 'worldcoinindex'; });

    updateMarketInfo(WorldCoinParams, function (err, ret) {
        debug(err, ret);
    });
});

module.exports = function (app) {
    app.use('/', router);
};