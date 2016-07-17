'use strict';
var Markets = require('./controllers/Markets');
// var debug = require('debug')('currency:test');


$(function () {

    var dashMarkets = new Markets();

    dashMarkets.readAll(function (err, data) {
        if (err) {
            debug(err);
        } else {
            data.forEach(function (element, index) {
                var jq = '<tr><td>' + index + '</td><td>' + element.exchangeName + '</td> <td>DASH/' + element.currency + '</td><td>' + element.rate + '</td><td>' + element.ratePercent + '</td></tr>';
                //debug(jq);

                $("#exchangeRow").append(jq);
            }, this);
        }

    });

})