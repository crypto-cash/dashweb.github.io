'use strict';
let mongoose = require('mongoose'),
    debug = require('debug')('currency:blockchains'),
    request = require('request'),
    async = require('async');

let source = mongoose.model('Source');

let markets = require('./markets');
let blockchain = require('./blockchain');
let budgets = require('./budgets');

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

// update the updateDate 
function updateLastUpdateDate(name) {
    source.updateOne(
        { "name": name },
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
            case new RegExp('^market.*'):
                markets.save(source.name.toLowerCase(),jsonData, (err, result) => {
                    if (!err) { updateLastUpdateDate(source.name); }
                    cb(err, result);
                });
                break;
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
                cb('ERROR don\'t know how to parse data for ' + source.name);
                return;
        }
    });
}
// read from db
function readFromDb(source, cb) {
    switch (source.name.toLowerCase()) {
        // all exchange markets
        case new RegExp('^market.*'):
            markets.readDb(source.name.toLowerCase(),(err, result) => {
                cb(err, result);
            });
            break;
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
            cb('ERROR don\'t know how to read data for ' + source.name);
            return;
    }
}


// if data is still valid return it from db, else update it via external api call
function read(sourceName, cb) {
 
    // get information of source data
    source.findOne({ name: sourceName }, (err, sourceData) => {
        if (err) {
            cb('ERROR reading source sourceData ' + err);
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
            updateNow(sourceData, (err, data) => {
                cb(err, data);
            });

        } else {
            // got a last update date, check if still valid
            let validUntil = new Date(sourceData.updateDate.getTime() + sourceData.refreshEveryMinutes * 60 * 1000);
            debug(sourceName + ' data is valid until ' + validUntil);
            if (validUntil < new Date().getTime()) {
                debug('--> ' + sourceName + ' data needs updating.');
                updateNow(sourceData, (err, data) => {
                    cb(err, data);
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


function readMultiple(sourceName, multiple, cb){
        // get all multiple, not just one
        source.find({name: { $regex : '/^'+ multiple +'/' }}, (err, multipleSourceData) => {
            if (err) {
                cb('ERROR cannot read db: ' + err);
                return;
            }
            if (multipleSourceData.lenght = 0) {
                cb('ERROR cannot find multiples for ' + sourceName);
                return;
            }
            // read all multiples async
            async.forEach(multipleSourceData,
            function(sourceName, callback) {
                read(sourceName, (err,result) =>{
                    callback(err,result);
                });
            },
            // done reading all
            function(err,result){
                cb(err,result);
            });
        });
}

module.exports = { read, readMultiple };