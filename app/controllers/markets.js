'use strict';
var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    debug = require('debug')('currency:markets'),
    request = require('request');

var Exchanges = mongoose.model('Exchange');

// TODO: globals are bad ?
var timeout = 5; // data is stall after X minutes
var exchangeParams = [
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

// write data in Db (insert or update)
function saveMarketData(data, cb) {
    Exchanges.findOneAndUpdate(
        { 'exchangeName': data.exchangeName, 'currency': data.currency },
        {
            rate: data.rate,
            volume: data.volume === undefined ? 0 : data.volume,
            ratePercent: data.ratePercent === undefined ? 0 : data.ratePercent,
            volumePercent: data.volumePercent === undefined ? 0 : data.volumePercent,
            updateDate: new Date()
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback
            if (err) {
                return cb('ERROR updating db: ' + err, null);
            } else {
                return cb(null, 'Market ' + data.exchangeName + ' updated for ' + data.currency);
            }
        });
}
// parse CoinMarketCap data & save to db
function updateCoinMarketCap(data, cb) {
    var jsonData = data[0];

    saveMarketData(
        { // USD pair
            exchangeName: 'CoinMarketCap',
            rate: jsonData.price_usd,
            currency: 'USD',
            volume: jsonData['24h_volume_usd'],
            ratePercent: jsonData.precent_change_24h
        }, function (err, ret) {
            if (err) {
                cb(err, null);
            }
            debug(ret);
            saveMarketData(
                // BTC pair
                {
                    exchangeName: 'CoinMarketCap',
                    rate: jsonData.price_btc,
                    currency: 'BTC'
                }, function (err, ret) {
                    if (err) {
                        cb(err, null);
                    }
                    debug(ret);
                    cb(null, 'CoinMarketCap data parsed & saved');
                });
        });
}
// parse WorldCoinIndex data & save to db
function updateWorldCoinIndex(data, cb) {
    //{"Label":"DASH/BTC","Name":"Dash","Price_btc":0.01221921,"Price_usd":8.16298359,"Price_cny":54.52139892,"Price_eur":7.41703365,"Price_gbp":6.25515177,"Price_rur":500.36158634,"Volume_24h":313.10166568,"Timestamp":1468766940},
    var jsonData = data.Markets.find(function (findDash) {
        return findDash.Name === "Dash";
    });
    //debug('WorldCoin: ' + JSON.stringify(jsonData));

    // TODO: needs async tasks
    var error, returnData;

    saveMarketData(
        { // USD pair
            exchangeName: 'WorldCoinIndex',
            rate: jsonData.Price_usd,
            currency: 'USD',
            volume: jsonData['Volume_24h']
        }, function (err, ret) { error += err; returnData += ret; });

    saveMarketData(
        { // EUR pair
            exchangeName: 'WorldCoinIndex',
            rate: jsonData.Price_eur,
            currency: 'EUR'
        }, function (err, ret) { error += err; returnData += ret; });

    saveMarketData(
        { // BTC pair
            exchangeName: 'WorldCoinIndex',
            rate: jsonData.Price_btc,
            currency: 'BTC'
        }, function (err, ret) { error += err; returnData += ret; });

    saveMarketData(
        { // CNY pair
            exchangeName: 'WorldCoinIndex',
            rate: jsonData.Price_cny,
            currency: 'CNY'
        }, function (err, ret) { error += err; returnData += ret; });


    saveMarketData(
        { // GBP pair
            exchangeName: 'WorldCoinIndex',
            rate: jsonData.Price_gbp,
            currency: 'GBP'
        }, function (err, ret) { error += err; returnData += ret; });


    cb(error, returnData);
}
// get json data at url
function getMarketData(url, cb) {
    request.get(url, function (err, response, body) {
        if (err) {
            return cb('ERROR: getting data from ' + url + ' : ' + err);
        }
        try {
            var parsedJSON = JSON.parse(body);
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
    var validUntil = new Date(exchange.updateDate.getTime() + timeout * 60 * 1000);
    debug(exchange.exchangeName + ' data is valid until ' + validUntil.toString());

    if (validUntil < new Date().getTime()) {
        debug('--> ' + exchange.exchangeName + ' needs updating');
        // find exchange parameters
        var exchangeParam = exchangeParams.find(function (parm) {
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
// get data for exchange form db, if stall of unknow get it from external api
function getExchangeData(thisExchange, cb) {
    Exchanges.find({ exchangeName: thisExchange.exchangeName }, function (err, exchangeData) {
        if (err) {
            cb('ERROR reading from db: ' + err, null);
        }

        if (exchangeData.length > 0) {
            for (var exchangeNR in exchangeData) {
                var exchange = exchangeData[exchangeNR];
                // debug('Exchange name: ' + exchange.exchangeName);
                // debug('Currency: ' + exchange.currency);
                // debug('Rate: ' + exchange.rate);
                // debug('% :' + exchange.ratePercent);
                // debug('Volume :' + exchange.volume);
                // debug('% :' + exchange.volumePercent);
                // debug('Time: ' + exchange.updateDate.toString());
                // debug('---------');

                checkUpdateNeeded(exchange);
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
    var allExchanges = [];
    // TODO: use async tasks instead of counter to know when done
    var count = exchangeParams.length;
    // read data for each exchange
    exchangeParams.forEach(function (thisExchange) {
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
                        count--; // check if all data of each exchanges is now know
                        if (count === 0)
                        { return cb(null, allExchanges); }
                    });
                });
            } else {
                allExchanges = allExchanges.concat(exchangeData);
                count--;// check if all data of each exchanges is now know
                if (count === 0)
                { return cb(null, allExchanges); }
            }
        });
    });

}

// show data for exchanges on currency page
router.get('/', function (req, res, next) {
    readAll(function (err, data) {
        if (err) { debug(err); }
        else {
            // TODO: calaculate averages 
            var avg = {
                btcVolume: 0,
                usdVolume: 0,
                usdRate: 0,
                usdPrecent: 0,
                btcRate: 0,
                btcPrecent: 0,
                usdVolumePrecent: 0,
                btcVolumePrecent: 0
            };
            res.render('currency', { Exchanges: data, marketAvg: avg });
        }
    });
});

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