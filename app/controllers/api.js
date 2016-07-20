'use strict';
let express = require('express'),
    router = express.Router();

let readData = require('../data/readData');

router.get('/api',(req,res) => {
    res.render('apiHelp');
});

router.get('/api/budget', function (req, res) {
    readData.read('budgets', (err, data) => {
        if (err) { res.send('BUDGETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/markets', function (req, res) {
    readData.readAll('market',(err, data) => {
        if (err) { res.send('MARKETS: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/blockchain', function (req, res) {
    readData.read('blockchain', (err, data)=> {
        if (err) { res.send('BLOCKCHAIN: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

router.get('/api/masternodes', function (req, res) {
    readData.read('masternodes', (err, data)=> {
        if (err) { res.send('MASTERNODES: ' + err); }
        else {
           res.render('api',{api:JSON.stringify(data)});
        }
    });
});

module.exports = function (app) {
    app.use('/', router);
};