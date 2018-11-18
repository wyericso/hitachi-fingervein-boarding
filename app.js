'use strict';

const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const DB_URL = 'mongodb://hitachi:hitachi123@ds151463.mlab.com:51463/hitachi-fingervein';
const DB_NAME = 'hitachi-fingervein';
const COLLECTION_NAME = 'boarding-pass';
const THIS_URL = 'http://10.211.55.14';
const FINGER_VEIN_API = 'http://10.211.55.14:8080';
const MONTH = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

http.get(FINGER_VEIN_API + '/api/ledredon', (res) => {
    res.resume();
});

app.use(express.static('views'));

app.get('/', function (req, res) {
    fs.readFile('templates/index.html', 'utf8', (err, data) => {
        if (err) throw err;
        res.send(data.replace('{THIS_URL}', THIS_URL));
    });
});

app.get('/login', (req, resp) => {
    let ledRedToGreen = function () {
        return new Promise((resolve) => {
            http.get(FINGER_VEIN_API + '/api/ledredoff', (res) => {
                res.resume();
                http.get(FINGER_VEIN_API + '/api/ledgreenon', (res) => {
                    res.resume();
                    resolve();
                });
            });
        });
    }

    let ledGreenToRed = function () {
        return new Promise((resolve) => {
            http.get(FINGER_VEIN_API + '/api/ledgreenoff', (res) => {
                res.resume();
                http.get(FINGER_VEIN_API + '/api/ledredon', (res) => {
                    res.resume();
                    resolve();
                });
            });
        });
    };

    let verification_1toN = function () {
        return new Promise(async (resolve) => {
            await ledRedToGreen();
            console.log('Calling finger vein API.');
            let data = '';

            http.get(FINGER_VEIN_API + '/api/verification_1toN', (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', async () => {
                    await ledGreenToRed();
                    resolve(JSON.parse(data).verifiedTemplateNumber);
                });
            });
        });
    };

    let connectDB = function () {
        return new Promise((resolve) => {
            console.log('Connecting DB.');
            const mongoClient = new MongoClient(DB_URL, { useNewUrlParser: true});
            mongoClient.connect((err) => {
                console.log('DB server connected.');
                resolve(mongoClient);
            });
        });
    };

    let loadBoardingPass = function ([verifiedTemplateNumber, mongoClient]) {
        return new Promise((resolve) => {
            console.log('Loading boarding pass.');
            mongoClient.db(DB_NAME).collection(COLLECTION_NAME).findOne({'verifiedTemplateNumber': verifiedTemplateNumber}, (err, boardingPass) => {
                mongoClient.close();
                resolve(boardingPass);
            });
        });
    };

    let readHtml = function () {
        return new Promise((resolve) => {
            console.log('Reading HTML.');
            fs.readFile('templates/boarding.html', 'utf8', (err, html) => {
                resolve(html);
            });
        });
    };

    (async () => {
        const [verifiedTemplateNumber, mongoClient] = await Promise.all([verification_1toN(), connectDB()]);
        const [boardingPass, html] = await Promise.all([loadBoardingPass([verifiedTemplateNumber, mongoClient]), readHtml()]);
        console.log('Showing boarding pass.');
        let flightDateObj = new Date(boardingPass.time);
        let boardingDateObj = new Date(flightDateObj - 1000 * 60 * 30);     // flight time minus 30 mins
        resp.send(html
            .replace(/{THIS_URL}/g, THIS_URL)
            .replace(/{GREETING}/g, boardingPass.name)
            .replace(/{NAME}/g, boardingPass.name.toUpperCase())
            .replace(/{FROM-LONG}/g, boardingPass.fromLong.toUpperCase())
            .replace(/{FLIGHT}/g, boardingPass.flight)
            .replace(/{TO-LONG}/g, boardingPass.toLong.toUpperCase())
            .replace(/{MMM}/g, MONTH[flightDateObj.getMonth()])
            .replace(/{DD}/g, flightDateObj.getDate().toString().padStart(2, '0'))
            .replace(/{YYYY}/g, flightDateObj.getFullYear())
            .replace(/{HH}/g, flightDateObj.getHours().toString().padStart(2, '0'))
            .replace(/{MM}/g, flightDateObj.getMinutes().toString().padStart(2, '0'))
            .replace(/{GATE}/g, boardingPass.gate)
            .replace(/{BHH}/g, boardingDateObj.getHours().toString().padStart(2, '0'))
            .replace(/{BMM}/g, boardingDateObj.getMinutes().toString().padStart(2, '0'))
            .replace(/{FROM-SHORT}/g, boardingPass.fromShort)
            .replace(/{TO-SHORT}/g, boardingPass.toShort)
            .replace(/{SEAT}/g, boardingPass.seat)
        );
    })();
});

app.get('/logout', function (req, res) {
    fs.readFile('templates/index.html', 'utf8', (err, data) => {
        if (err) throw err;
        res.send(data.replace('{THIS_URL}', THIS_URL));
    });
});

process.on('SIGINT', () => {
    http.get(FINGER_VEIN_API + '/api/ledredoff', (res) => {
        res.resume();
        process.exit();
    });
});

const listener = app.listen(80, function() {
    console.log('Listening on port ' + listener.address().port);
});
