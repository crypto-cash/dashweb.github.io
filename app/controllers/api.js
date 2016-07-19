'use strict';
var express = require('express'),
    router = express.Router();

var markets = require('../data/markets');
var budgets = require('../data/budgets');

router.get('/api',(req,res) => {
    res.render('apiHelp');
});

router.get('/api/budget', function (req, res) {
    budgets.read(function (err, data) {
        if (err) { res.send('BUDGETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/markets', function (req, res) {
    markets.readAll(function (err, data) {
        if (err) { res.send('MARKETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

module.exports = function (app) {
    app.use('/', router);
};