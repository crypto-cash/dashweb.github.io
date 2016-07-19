'use strict';
let express = require('express'),
    router = express.Router(),
//    debug = require('debug')('currency:markets'),
    async = require('async');


let readData = require('../data/readData');

// show data for exchanges on currency page
router.get('/', function (req, res) {
    let marketData, marketAvg, BPdata, blockChainData;
    async.parallel(
        [
            // get market data
            function (callback) {
                readData.readAll('market',function (err, data) {
                    if (err) { res.send('MARKETS: ' + err); }
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
                readData.read('budgets', function (err, data) {
                    if (err) { res.send('BUDGETS: ' + err); }
                    else {
                        BPdata = data;
                        callback();
                    }
                });
            },
            // get blockchain data
            function (callback) {
                readData.read('blockchain', function (err, data) {
                    if (err) { res.rend('BLOCKCHAIN: ' + err); }
                    else {
                        blockChainData = data;
                        callback();
                    }
                });
            }
        ],
        // all tasks are done
        function (err) {
            if (marketData && marketAvg && BPdata && !err) {
                res.render('currency',
                    {
                        Exchanges: marketData, marketAvg: marketAvg,
                        BudgetData: BPdata[0], Proposals: BPdata[1],
                        Blockchain: blockChainData
                    });
            } else {
                res.send('Didn\'t get all the data I needed ' + err);
            }
        }
    );
});

// test page
router.get('/test', function (req, res, next) {

});


module.exports = function (app) {
    app.use('/', router);
};