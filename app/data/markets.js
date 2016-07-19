'use strict';
let mongoose = require('mongoose'),
    async = require('async');

let Market = mongoose.model('Exchange');

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