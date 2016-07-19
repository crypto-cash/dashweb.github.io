'use strict';
var mongoose = require('mongoose'),
    debug = require('debug')('currency:blockchains'),
    request = require('request');

var Blockchain = mongoose.model('blockchain');


var url = 'https://insight.dash.siampm.com/api/blocks?limit=10';

var timeout = 2.5; // minutes

// write all proposals data in Db (insert or update)
function saveBlockchainData(data, cb) {
    Blockchain.findOneAndUpdate(
        { 'hash': data.hash },   // find blockchains unique superblock
        {
            height: data.height,
            size: data.size,
            hash: data.hash,
            time: data.time,
            txlength: data.txlength,
            difficulty: data.difficulty,
            cbvalue: data.cbvalue,

            updateDate: new Date()
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback
            if (err) {
                return cb('ERROR updating db: ' + err, null);
            } else {
                return cb(null, 'blockchain data for block time ' + data.time + ' updated.');
            }
        });
}


// block data: only last 10 block are needed, so on each update remove all (old) block in db
function updateBlockchainData(cb) {
    var parsedJSON;
    // 1) remove all blocks in db
    Blockchain.remove({}, function (err, res) {
        if (err) {cb('ERROR removing old blocks: ' + err); return;}
        // 2) get json data
        request.get(url, function (err, response, body) {
            if (err) {
                cb('ERROR: getting data from ' + url + ' : ' + err);
                return;
            }
            //  3) parse blockchain json data 
            try {
                parsedJSON = JSON.parse(body);
            }
            catch (ex) {
                cb('ERROR parsing json: ' + ex + '\nData = ' + body, null);
                return;
            }
            // 4) save blockchain data
            parsedJSON.blocks.forEach(function (block) {
                saveBlockchainData(block, function (err, resp) {
                    debug(err, resp);
                    cb(err, resp);
                });
            }, this);

        });
    });

}


//aiet data for blockchain form db, if stall of unknow get it from external api
function getBlockchainsData(cb) {
    Blockchain.find(function (err, blockchainData) {
        if (err) {
            cb('ERROR reading from db: ' + err, null);
        }
        if (blockchainData.length > 0) {
            // have data, check if isn't stall by checking first block
            var validUntil = new Date(blockchainData[0].updateDate.getTime() + timeout * 60 * 1000);
            debug('blockchain data is valid until ' + validUntil.toString());
            if (validUntil < new Date().getTime()) {
                debug('--> blockchain data needs updating');
                updateBlockchainData(function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        getBlockchainsData(cb);
                    }
                });
            } else {
                cb(null, blockchainData);
            }
        } else {
            // don't have data, get it now
            debug('No blockchain data found, get data now.');
            updateBlockchainData(function (err) {
                if (err) {
                    cb(err);
                } else {
                    getBlockchainsData(cb);
                }
            });
        }
    });
}

// return array with blockchain and Proposals
function read(cb) {
    getBlockchainsData(function (err, data) {
        cb(err, data);
    });
}

module.exports = { read };