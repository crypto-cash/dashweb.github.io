'use strict';
let mongoose = require('mongoose'),
    debug = require('debug')('currency:readData'),
    request = require('request'),
    async = require('async');


let Source = mongoose.model('Source');

let Markets = require('./markets');
let Blockchain = require('./blockchain');
let Budgets = require('./budgets');
let Masternodes = require('./masternodes');

let initDone = false;

function init(cb) {
    debug('=== START  INIT');

    let blockchainSource = {
        name: 'blockchain',
        url: 'https://insight.dash.siampm.com/api/blocks?limit=10',
        refreshEveryMinutes: 2.5
    };
    // TODO: apply for partner api key with dashwhale    https://www.dashwhale.org/dbin#partner
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
    let masternodeSource = {
        name: 'masternodes',
        url: 'https://dashninja.pl/api/masternodes/stats',
        refreshEveryMinutes: 30
    };

    async.parallel(
        [
            callback => {
                Source.findOneAndUpdate(
                    { name: masternodeSource.name },
                    masternodeSource,
                    { upsert: true },
                    err => { debug(err ? err : 'masternodeSource ok'); callback(err); }
                );
            },
            callback => {
                Source.findOneAndUpdate(
                    { name: blockchainSource.name },
                    blockchainSource,
                    { upsert: true },
                    err => { debug(err ? err : 'blockchainSource ok'); callback(err); }
                );
            },
            callback => {
                Source.findOneAndUpdate(
                    { name: budgetSource.name },
                    budgetSource,
                    { upsert: true },
                    err => { debug(err ? err : 'budgetSource ok'); callback(err); }
                );
            },
            callback => {
                Source.findOneAndUpdate(
                    { name: coinMarketCapSource.name },
                    coinMarketCapSource,
                    { upsert: true },
                    err => { debug(err ? err : 'coinMarketCapSource ok'); callback(err); }
                );
            },
            callback => {
                Source.findOneAndUpdate(
                    { name: worldCoinIndexSource.name },
                    worldCoinIndexSource,
                    { upsert: true },
                    err => { debug(err ? err : 'worldCoinIndexSource ok'); callback(err); }
                );
            }
        ],
        err => { debug('INIT DONE'); cb(err); }
    );
}

function checkAlreadyUpdating(sourceData) {
    Source.findOne({ name: sourceData.name }, (err, souceData) => {
        if (err) { debug('ERROR cannot find sourceData for ' + sourceData.name); return true; }
        return souceData.updating;
    });
}
function updateLock(sourceData, set) {
    Source.update(
        { name: sourceData.name },
        { $set: { updating: true } },
        err => {
            if (err) {
                throw new Error('ERROR: cannot set updating lock for ' + sourceData.name + ' to: ' + set);
            }
        });
}
// update the updateDate 
function updateLastUpdateDate(name) {
    Source.update(
        { name: name },
        { $set: { updateDate: new Date() } },
        err => {
            if (err) { debug('ERROR cannot update date for ' + name + '\n' + err); }
        });
}
// update now from external api
function updateNow(sourceData, cb) {

    if (!sourceData.url) { cb('ERROR not url know for ' + sourceData.name + ', cannot update it.'); return; }

    // prevent multiple updates at same time
    if (checkAlreadyUpdating(sourceData)) { cb('Already updating ' + sourceData.name); return; }
    // set updating lock now
    updateLock(sourceData, true);

    // get json data
    let jsonData;
    request.get(sourceData.url, function (err, response, body) {
        if (err) {
            updateLock(sourceData, false);
            cb('ERROR: not getting data for ' + sourceData.name + ' at ' + sourceData.url + ' : ' + err);
            return;
        }
        //  parse blockchain json data 
        try {
            jsonData = JSON.parse(body);
        }
        catch (ex) {
            updateLock(sourceData, false);
            cb('ERROR parsing json for ' + sourceData.name + ': ' + ex + '\nData = ' + body, null);
            return;
        }
        // parse & save data
        switch (sourceData.name.toLowerCase()) {

            case 'budgets':
                Budgets.save(jsonData, (err, result) => {
                    // update succesfull = set new updateDate
                    if (!err) { updateLastUpdateDate(sourceData.name); }
                    updateLock(sourceData, false);
                    cb(err, result);
                });
                break;

            case 'blockchain':
                Blockchain.save(jsonData, (err, result) => {
                    // update succesfull = set new updateDate
                    if (!err) { updateLastUpdateDate(sourceData.name); }
                    updateLock(sourceData, false);
                    cb(err, result);
                });
                break;

            case 'masternodes':
                Masternodes.save(jsonData, (err, result) => {
                    // update succesfull = set new updateDate
                    if (!err) { updateLastUpdateDate(sourceData.name); }
                    updateLock(sourceData, false);
                    cb(err, result);
                });
                break;


            default:
                // cannot use regulair expresion in case, fallthrought to default and check it here
                if (sourceData.name.toLowerCase().startsWith('market.')) {
                    Markets.save(sourceData.name.toLowerCase(), jsonData, (err, result) => {
                        // update succesfull = set new updateDate
                        if (!err) { updateLastUpdateDate(sourceData.name); }
                        updateLock(sourceData, false);
                        cb(err, result);
                    });
                    break;
                } else {
                    updateLock(sourceData, false);
                    cb('ERROR don\'t know how to parse data for ' + sourceData.name);
                    return;
                }
        }
    });
}
// read from db
function readFromDb(sourceData, cb) {
    switch (sourceData.name.toLowerCase()) {
        case 'budgets':
            Budgets.readDb((err, result) => { cb(err, result); });
            break;
        case 'blockchain':
            Blockchain.readDb((err, result) => { cb(err, result); });
            break;
        case 'masternodes':
            Masternodes.readDb((err, result) => { cb(err, result); });
            break;
        default:
            // cannot use regulair expresion in case, fallthrought to default and check it here
            if (sourceData.name.toLowerCase().startsWith('market.')) {
                Markets.readDb(sourceData.name.toLowerCase(),
                    (err, result) => { cb(err, result); });
            } else {
                cb('ERROR don\'t know how to read data for ' + sourceData.name);
                return;
            }
    }
}

// PUBLIC //
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
    Source.findOne({ name: sourceName }, (err, sourceData) => {
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
                    readFromDb(sourceData,
                        (err, data) => { cb(err, data); });
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
                readFromDb(sourceData,
                    (err, data) => { cb(err, data); });
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
    Source.find({ name: { $regex: regExp } }, (err, multipleSourceData) => {
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
                    resultData = resultData.concat(result);
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

module.exports = { read, readAll };