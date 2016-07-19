'use strict';
let mongoose = require('mongoose'),
    async = require('async');

let Blockchain = mongoose.model('blockchain');

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