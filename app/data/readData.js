'use strict';
let mongoose = require('mongoose'),
    debug = require('debug')('currency:readData'),
    request = require('request'),
    async = require('async');

let source = mongoose.model('Source');

let markets = require('./markets');
let blockchain = require('./blockchain');
let budgets = require('./budgets');

let initDone = false;

function init(cb) {
    debug('=== START  INIT');

    let blockchainSource = {
        name: 'blockchain',
        url: 'https://insight.dash.siampm.com/api/blocks?limit=10',
        refreshEveryMinutes: 2.5
    };
    let budgetSource = {
        name: 'budgets',
        url: 'https://www.dashwhale.org/api/v1/budget',
        refreshEveryMinutes: 30
    };
    let coinMarketCapSource = {
        name: 'market.CoinMarketCap',
        url: 'https://api.coinmarketcap.com/v1/ticker/dash',
        refreshEveryMinutes: 15
    };
    let worldCoinIndexSource = {
        name: 'market.WorldCoinIndex',
        url: 'https://www.worldcoinindex.com/apiservice/json?key=ePSl8tl8dsFhLyReZ6aIwCQNw',
        refreshEveryMinutes: 15
    };

    async.parallel(
        [
            (callback) => {
                source.findOneAndUpdate(
                    { name: blockchainSource.name },
                    blockchainSource,
                    { upsert: true },
                    (err) => { debug(err ? err : 'blockchainSource ok'); callback(err); }
                );
            },
            (callback) => {
                source.findOneAndUpdate(
                    { name: budgetSource.name },
                    budgetSource,
                    { upsert: true },
                    (err) => { debug(err ? err : 'budgetSource ok'); callback(err); }
                );
            },
            (callback) => {
                source.findOneAndUpdate(
                    { name: coinMarketCapSource.name },
                    coinMarketCapSource,
                    { upsert: true },
                    (err) => { debug(err ? err : 'coinMarketCapSource ok'); callback(err); }
                );
            },
            (callback) => {

                source.findOneAndUpdate(
                    { name: worldCoinIndexSource.name },
                    worldCoinIndexSource,
                    { upsert: true },
                    (err) => { debug(err ? err : 'worldCoinIndexSource ok'); callback(err); }
                );
            }
        ],
        (err) => {
            debug('INIT DONE');
            cb(err);
        }
    );


    /*
       //MARKETS
       // TODO: globals are bad ?
       const timeout = 15; // data is stall after X minutes
       const exchangeParams = [
           {
               exchangeName: 'CoinMarketCap',
               url: 'https://api.coinmarketcap.com/v1/ticker/dash',
               updating: false
           },
           {
               exchangeName: 'WorldCoinIndex',
               key: 'ePSl8tl8dsFhLyReZ6aIwCQNw',
               url: 'https://www.worldcoinindex.com/apiservice/json?key=ePSl8tl8dsFhLyReZ6aIwCQNw',
               updating: false
           }
       ];
       
       // BUDGETS
       // TODO: apply for partner api key with dashwhale
       // https://www.dashwhale.org/dbin#partner
       // const url = 'https://www.dashwhale.org/api/v1/budget';
       // const timeout = 30; // minutes
       
       // BLOCKCHAIN
       // const url = 'https://insight.dash.siampm.com/api/blocks?limit=10';
       // const timeout = 2.5; // minutes
       
    */
}

// update the updateDate 
function updateLastUpdateDate(name) {
    source.update(
        { name: name },
        { $set: { updateDate: new Date() } },
        (err) => {
            if (err) { debug('ERROR cannot update date for ' + name + '\n' + err); }
        });
}
// update now from external api
function updateNow(source, cb) {
    if (!source.url) {
        cb('ERROR not url know for ' + source.name + ', cannot update it.');
        return;
    }
    // get json data
    let jsonData;
    request.get(source.url, function (err, response, body) {
        if (err) {
            cb('ERROR: not getting data for ' + source.name + ' at ' + source.url + ' : ' + err);
            return;
        }
        //  parse blockchain json data 
        try {
            jsonData = JSON.parse(body);
        }
        catch (ex) {
            cb('ERROR parsing json for ' + source.name + ': ' + ex + '\nData = ' + body, null);
            return;
        }
        // parse & save data
        switch (source.name.toLowerCase()) {
            // all exchange markets
            case 'budgets':
                budgets.save(jsonData, (err, result) => {
                    if (!err) { updateLastUpdateDate(source.name); }
                    cb(err, result);
                });
                break;
            case 'blockchain':
                blockchain.save(jsonData, (err, result) => {
                    if (!err) { updateLastUpdateDate(source.name); }
                    cb(err, result);
                });
                break;

            default:
                // cannot use regulair expresion in case, fallthrought to default and check it here
                if (source.name.toLowerCase().startsWith('market.')) {
                    markets.save(source.name.toLowerCase(), jsonData, (err, result) => {
                        if (!err) { updateLastUpdateDate(source.name); }
                        cb(err, result);
                    });
                    break;
                } else {
                    cb('ERROR don\'t know how to parse data for ' + source.name);
                    return;
                }
        }
    });
}
// read from db
function readFromDb(source, cb) {
    switch (source.name.toLowerCase()) {
        case 'budgets':
            budgets.readDb((err, result) => {
                cb(err, result);
            });
            break;
        case 'blockchain':
            blockchain.readDb((err, result) => {
                cb(err, result);
            });
            break;

        default:
            // cannot use regulair expresion in case, fallthrought to default and check it here
            if (source.name.toLowerCase().startsWith('market.')) {
                markets.readDb(source.name.toLowerCase(), (err, result) => {
                    cb(err, result);
                });
            } else {
                cb('ERROR don\'t know how to read data for ' + source.name);
                return;
            }
    }
}


// if data is still valid return it from db, else update it via external api call
function read(sourceName, cb) {
    if (!initDone) {
        // insert/update source information
        init(err => {
            if (err) { cb(err); return; }
            initDone = true;
        });
    }

    // get information of source data
    source.findOne({ name: sourceName }, (err, sourceData) => {
        if (err) {
            cb('ERROR reading source sourceData ' + sourceName + ' : ' + err);
            return;
        }
        if (!sourceData) {
            cb('ERROR cannot find the information of ' + sourceName);
            return;
        }
        // check last update date
        let lastUpdateOn = sourceData.updateDate;
        if (!lastUpdateOn) {
            // no update date found = update now
            debug('--> No last update date found for ' + sourceName + ' data. Update it now.');
            updateNow(sourceData, (err, response) => {
                if (err) { cb(err); }
                else {// update was succesfull, read results from db
                    debug(response);
                    readFromDb(sourceData, (err, data) => {
                        cb(err, data);
                    });
                }
            });

        } else {
            // got a last update date, check if still valid
            if (!sourceData.refreshEveryMinutes) {
                cb('ERROR no refresh timeout know for ' + sourceData.name);
                return;
            }
            let validUntil = new Date(lastUpdateOn.getTime() + sourceData.refreshEveryMinutes * 60 * 1000);
            debug(sourceName + ' data is valid until ' + validUntil);
            if (validUntil < new Date().getTime()) {
                debug('--> ' + sourceName + ' data needs updating.');
                updateNow(sourceData, (err, response) => {
                    if (err) { cb(err); }
                    else {// update was succesfull, read results from db
                        debug(response);
                        readFromDb(sourceData, (err, data) => {
                            cb(err, data);
                        });
                    }
                });
            } else {
                debug(sourceName + ' data is still up to date.');
                readFromDb(sourceData, (err, data) => {
                    cb(err, data);
                });
            }
        }
    });
}


function readAll(multiple, cb) {
    let resultData = [];

    if (!initDone) {
        // insert/update source information
        init(err => {
            if (err) { cb(err); return; }
            initDone = true;
        });
        // TODO: as init was needed : also read (aka update) all external api's ?
    }
    // get all multiple, not just one
    var regExp = new RegExp('^' + multiple + '.');
    source.find({ name: { $regex: regExp }}, (err, multipleSourceData) => {
        if (err) {
            cb('ERROR cannot read db: ' + err);
            return;
        }
        if (multipleSourceData.length === 0) {
            cb('ERROR cannot find multiples for ' + multiple);
            return;
        }
        // read all multiples async
        async.forEach(multipleSourceData,
            function (sourceName, callback) {
                read(sourceName.name, (err, result) => {
                    resultData=resultData.concat(result);
                    callback(err, result);
                });
            },
            // done reading all
            function (err, result) {
                debug(result);
                cb(err, resultData);
            });
    });
}

module.exports = { read, readAll};