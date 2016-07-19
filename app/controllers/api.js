'use strict';
let express = require('express'),
    router = express.Router();

let markets = require('../data/markets');
let budgets = require('../data/budgets');
let blockchain = require('../data/blockchain');

router.get('/api',(req,res) => {
    res.render('apiHelp');
});

router.get('/api/budget', function (req, res,next) {
    budgets.read(function (err, data) {
        if (err) { res.send('BUDGETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/markets', function (req, res,next) {
    markets.readAll(function (err, data) {
        if (err) { res.send('MARKETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/blockchain', function (req, res,next) {
    blockchain.read(function (err, data) {
        if (err) { res.send('BLOCKCHAIN: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

module.exports = function (app) {
    app.use('/', router);
};