'use strict';
let mongoose = require('mongoose'),
    async = require('async');
// debug = require('debug')('currency:blockchains'),
// request = require('request');

let Blockchain = mongoose.model('blockchain');


// const url = 'https://insight.dash.siampm.com/api/blocks?limit=10';
// const timeout = 2.5; // minutes


/*
    // block data: only last 10 block are needed, so on each update remove all (old) block in db
    function updateBlockchainData(cb) {
        let parsedJSON;
        // 1) remove all blocks in db
        Blockchain.remove({}, function (err, res) {
            if (err) { cb('ERROR removing old blocks: ' + err); return; }
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
                let validUntil = new Date(blockchainData[0].updateDate.getTime() + timeout * 60 * 1000);
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
*/

// insert or update 1 block in db
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

         //   updateDate: new Date()
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback saving
            cb(err);
            // if (err) {
            //     cb('ERROR updating db: ' + err, null);
            // } else {
            //     cb(null, 'blockchain data for block time ' + data.time + ' updated.');
            // }
        });
}

// save each blockinfo
function save(data, cb) {
    // TODO: add locking ?

    // async save each block
    async.forEach(data.blocks,
        function (block, callback) {
            saveBlockchainData(block, function (err) {
                callback(err);
            });
        },
        // if all blocks are saved..
        function (err) {
            if (err) {cb('ERROR saving blockchain: ' + err);}
            else {cb(null, 'Blockchain info is updated and saved.');}
        }
    );
}

function readDb(cb) {
    Blockchain.find((err, data) => {
        cb(err, data);
    });
}

module.exports = { readDb, save };