'use strict';
let mongoose = require('mongoose'),
    // debug = require('debug')('currency:markets'),
    // request = require('request'),
    async = require('async');

let Market = mongoose.model('Exchange');
/*
// TODO: globals are bad ?
const timeout = 15; // data is stall after X minutes
const exchangeParams = [
    {
        exchangeName: 'CoinMarketCap',
        url: 'https://api.coinmarketcap.com/v1/ticker/dash',
        updating: false
    },
    {
        exchangeName: 'worldcoinindex',
        key: 'ePSl8tl8dsFhLyReZ6aIwCQNw',
        url: 'https://www.worldcoinindex.com/apiservice/json?key=ePSl8tl8dsFhLyReZ6aIwCQNw',
        updating: false
    }
];
*/

/*
// get json data at url
function getMarketData(url, cb) {
    request.get(url, function (err, response, body) {
        if (err) {
            return cb('ERROR: getting data from ' + url + ' : ' + err);
        }
        try {
            let parsedJSON = JSON.parse(body);
            cb(null, parsedJSON);
        }
        catch (ex) {
            return cb('ERROR parsing json: ' + ex + '\nData = ' + body, null);
        }
    });
}
// get data from external api exchange, swith/case for parse & save
function updateMarketInfo(exchangeParam, cb) {
    if (!exchangeParam || !exchangeParam.url || !exchangeParam.exchangeName) {
        return cb('ERROR cannot update marketDb: must have exchangeName and url !', null);
    }
    // check already updating
    if (exchangeParam.updating) {
        return cb('Already updating ' + exchangeParam.exchangeName, null);

    }
    // set updating lock now
    exchangeParam.updating = true;
    // 1) get json data
    getMarketData(exchangeParam.url, function (err, jsonData) {
        if (err) {
            return cb('ERROR cannot get data at ' + exchangeParam.url + ' \n ' + err, null);
        }

        // 2) Parse
        switch (exchangeParam.exchangeName.toLowerCase()) {
            case 'coinmarketcap':
                updateCoinMarketCap(jsonData, function (err, ret) {
                    // remove updating lock   
                    exchangeParam.updating = false;
                    return cb(err, ret);
                });
                break;
            case 'worldcoinindex':
                updateWorldCoinIndex(jsonData, function (err, ret) {
                    // remove updating lock   
                    exchangeParam.updating = false;
                    return cb(err, ret);
                });
                break;
            default:
                return cb('ERROR cannot parse data from ' + exchangeParam.exchangeName + ' don\'t now that exhange', null);
        }

    });
}
// check if exchange data isn't stall, update if needed
function checkUpdateNeeded(exchange) {
    let validUntil = new Date(exchange.updateDate.getTime() + timeout * 60 * 1000);
    debug(exchange.exchangeName + ' data is valid until ' + validUntil.toString());

    if (validUntil < new Date().getTime()) {
        debug('--> ' + exchange.exchangeName + ' needs updating');
        // find exchange parameters
        let exchangeParam = exchangeParams.find(function (parm) {
            return parm.exchangeName.toLowerCase() === exchange.exchangeName.toLowerCase();
        });
        if (!exchangeParam) {
            debug('ERROR unknown exchange ' + exchange.exchangeName);
            return;
        }
        // debug(exchangeParam.exchangeName + ' at ' + exchangeParam.url);
        updateMarketInfo(exchangeParam, function (err, ret) {
            if (err) { debug(err); return; }
            debug(ret);
        });
    }
}
// get data for exchange from db, if stall of unknow get it from external api
function getExchangeData(thisExchange, cb) {
    Exchanges.find({ exchangeName: thisExchange.exchangeName }, function (err, exchangeData) {
        if (err) {
            cb('ERROR reading from db: ' + err, null);
        }
        // is there data in the db?
        if (exchangeData.length > 0) {
            // check each stall date
            for (let exchangeNR in exchangeData) {
                checkUpdateNeeded(exchangeData[exchangeNR]);
            }
            return cb(null, exchangeData);
        } else {
            debug('No data found for exchange ' + thisExchange.exchangeName);
            return cb('No data found', null);
        }
    });
}

// get data for all defined exchanges
function readAll(cb) {
    let allExchanges = [];

    // let count = exchangeParams.length;

    // read data for each exchange
    async.forEach(exchangeParams,
        function (thisExchange, callback) {
            getExchangeData(thisExchange, function (err, exchangeData) {
                if (err) {
                    debug('Update ' + thisExchange.exchangeName + ' now');
                    // update db with new data
                    updateMarketInfo(thisExchange, function (err, ret) {
                        if (err) {
                            debug(err);
                            return cb(err);
                        }
                        debug(ret);
                        // get newly data that's now in the db
                        getExchangeData(thisExchange, function (err2, exchangeData) {
                            if (err2) { return cb(err2, null); }
                            allExchanges = allExchanges.concat(exchangeData);
                            callback();
                        });
                    });
                } else {
                    allExchanges = allExchanges.concat(exchangeData);
                    callback();
                }
            });
        },
        // everything is done
        function (err) {
            cb(err, allExchanges);
        });
}
*/

// write data in Db (insert or update)
function saveMarketData(data, cb) {
    Market.findOneAndUpdate(
        { 'exchangeName': data.exchangeName, 'currency': data.currency },
        {
            rate: data.rate,
            volume: data.volume === undefined ? 0 : data.volume,
            ratePercent: data.ratePercent === undefined ? 0 : data.ratePercent,
            volumePercent: data.volumePercent === undefined ? 0 : data.volumePercent,
            //   updateDate: new Date()
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback
            cb(err);
            // if (err) {
            //     cb('ERROR updating db: ' + err, null);
            // } else {
            //     cb(null, '-- Market ' + data.exchangeName + ' updated for ' + data.currency);
            // }
        });
}
// parse CoinMarketCap data & save to db
function updateCoinMarketCap(data, cb) {
    let jsonData = data[0];
    async.parallel(
        [// USD pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'coinmarketcap',
                        rate: jsonData.price_usd,
                        currency: 'USD',
                        volume: jsonData['24h_volume_usd'],
                        ratePercent: jsonData.precent_change_24h
                    }, function (err) {
                        callback(err);
                    });
            },
            // BTC pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'coinmarketcap',
                        rate: jsonData.price_btc,
                        currency: 'BTC'
                    }, function (err) {
                        callback(err);
                    });
            }
        ],
        function (err) {
            if (err) { cb(err); }
            else {
                cb(null, 'CoinMarketCap data is  updated and saved.');
            }
        }
    );
}
// parse worldcoinindex data & save to db
function updateWorldCoinIndex(data, cb) {
    let jsonData = data.Markets.find(function (findDash) {
        return findDash.Name === 'Dash';
    });
    let error, returnData;
    async.parallel(
        [   // USD pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'worldcoinindex',
                        rate: jsonData.Price_usd,
                        currency: 'USD',
                        volume: jsonData['Volume_24h']
                    }, function (err, ret) {
                        error += err; returnData += ret + '\n'; callback();
                    });
            },
            // EUR pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'worldcoinindex',
                        rate: jsonData.Price_eur,
                        currency: 'EUR'
                    }, function (err, ret) {
                        error += err; returnData += ret + '\n'; callback();
                    });
            },
            // BTC pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'worldcoinindex',
                        rate: jsonData.Price_btc,
                        currency: 'BTC'
                    }, function (err, ret) {
                        error += err; returnData += ret + '\n'; callback();
                    });
            },
            // CNY pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'worldcoinindex',
                        rate: jsonData.Price_cny,
                        currency: 'CNY'
                    }, function (err, ret) {
                        error += err; returnData += ret + '\n'; callback();
                    });
            },
            // GBP pair
            function (callback) {
                saveMarketData(
                    {
                        exchangeName: 'worldcoinindex',
                        rate: jsonData.Price_gbp,
                        currency: 'GBP'
                    }, function (err, ret) {
                        error += err; returnData += ret + '\n'; callback();
                    });
            },
        ],
        function (err) {
            if (err) {cb(err); }
            else {
                cb(null, 'worldcoinindex data is updated and saved.');
            }
        }
    );
}

function save(exchangeName, data, cb) {
    // Parse
    switch (exchangeName.split('market.')[1]) {
        case 'coinmarketcap':
            updateCoinMarketCap(data, function (err, ret) {
                cb(err, ret);
            });
            break;
        case 'worldcoinindex':
            updateWorldCoinIndex(data, function (err, ret) {
                cb(err, ret);
            });
            break;
        default:
            cb('ERROR cannot parse data from ' + exchangeName.split('market.')[1] + ' don\'t now that exhange', null);
            break;
    }
}

function readDb(exchangeName, cb) {
    // every exchange can have multple record (each coin pair is a record)
    Market.find({ exchangeName: exchangeName.split('market.')[1]},
        function (err, marketData) {
            if (err) {
                cb('ERROR reading ' + exchangeName.split('market.')[1] + ' from db: ' + err, null);
            } else {
                cb(null, marketData);
            }
        });
}

module.exports = { readDb, save };