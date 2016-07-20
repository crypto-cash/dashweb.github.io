'use strict';
let mongoose = require('mongoose'),
    async = require('async');

let Masternode = mongoose.model('Masternode');

function saveMasternodeData(protocol, ActiveMasternodesCount, cb) {
    Masternode.findOneAndUpdate(
        { 'procotolVersion': protocol },
        {
            ActiveMasternodesCount: ActiveMasternodesCount,
        },
        { // insert new, update existing
            upsert: true
        },
        function (err) {// callback saving
            cb(err);
        });
}

// save global masternode info / protocol
function save(data, cb) {
    // all masternode data
    let masternodeData = data.data.MasternodeStatsPerProtocolVersion;
    // get protocols
    let protocols = Object.keys(masternodeData);
    // for each protocol
    async.forEach(protocols,
        (protocol, callback ) => {
            let mnDataForProtocol = masternodeData[protocol];
            saveMasternodeData(protocol, mnDataForProtocol.ActiveMasternodesCount,
                (err, result) => {
                    callback(err, result);
                });
        },
        // all saved
        (err, result) => { cb(err, result); }
    );
}

// read data for all protocols
function readDb(cb) {
    Masternode.find((err, data) => cb(err, data));
}

module.exports = { readDb, save };