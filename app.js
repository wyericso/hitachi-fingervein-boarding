'use strict';

const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const MONTH = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];
require('dotenv').config();

http.get(process.env.FINGER_VEIN_API + '/api/ledredon', (res) => {
    res.resume();
});

app.use(express.static('views'));

app.get('/', function (req, res) {
    let html = fs.readFileSync('templates/head.html', 'utf8');
    html += fs.readFileSync('templates/index.html', 'utf8');
    html += fs.readFileSync('templates/tail.html', 'utf8');
    res.send(html.replace('{THIS_URL}', process.env.THIS_URL));
});

app.get('/login', (req, resp) => {
    let ledRedToGreen = function () {
        return new Promise((resolve) => {
            http.get(process.env.FINGER_VEIN_API + '/api/ledredoff', (res) => {
                res.resume();
                http.get(process.env.FINGER_VEIN_API + '/api/ledgreenon', (res) => {
                    res.resume();
                    resolve();
                });
            });
        });
    }

    let ledGreenToRed = function () {
        return new Promise((resolve) => {
            http.get(process.env.FINGER_VEIN_API + '/api/ledgreenoff', (res) => {
                res.resume();
                http.get(process.env.FINGER_VEIN_API + '/api/ledredon', (res) => {
                    res.resume();
                    resolve();
                });
            });
        });
    };

    let verification_1toN = function () {
        return new Promise(async (resolve, reject) => {
            await ledRedToGreen();
            console.log('Calling finger vein API.');
            let data = '';

            http.get(process.env.FINGER_VEIN_API + '/api/verification_1toN', (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', async () => {
                    await ledGreenToRed();
                    if (JSON.parse(data).response === 'ok') {
                        resolve(JSON.parse(data).verifiedTemplateNumber);
                    }
                    else {
                        reject('Finger vein not recognized.');
                    }
                });
            });
        });
    };

    let connectDB = function () {
        return new Promise((resolve) => {
            console.log('Connecting DB.');
            const mongoClient = new MongoClient(process.env.DB_URL, { useNewUrlParser: true});
            mongoClient.connect((err) => {
                console.log('DB server connected.');
                resolve(mongoClient);
            });
        });
    };

    let loadBoardingPass = function ([verifiedTemplateNumber, mongoClient]) {
        return new Promise((resolve, reject) => {
            console.log('Loading boarding pass.');
            mongoClient.db(process.env.DB_NAME).collection(process.env.COLLECTION_NAME).findOne({'verifiedTemplateNumber': verifiedTemplateNumber}, (err, boardingPass) => {
                mongoClient.close();
                if (boardingPass) {
                    resolve(boardingPass);
                }
                else {
                    reject('Boarding pass not found.');
                }
            });
        });
    };

    let readHtml = function () {
        return new Promise((resolve) => {
            console.log('Reading HTML.');
            let html = fs.readFileSync('templates/head.html', 'utf8');
            html += fs.readFileSync('templates/boarding.html', 'utf8');
            html += fs.readFileSync('templates/tail.html', 'utf8');
            resolve(html);
        });
    };

    (async () => {
        try {
            const [verifiedTemplateNumber, mongoClient] = await Promise.all([verification_1toN(), connectDB()]);
            const [boardingPass, html] = await Promise.all([loadBoardingPass([verifiedTemplateNumber, mongoClient]), readHtml()]);

            console.log('Showing boarding pass.');
            let flightDateObj = new Date(boardingPass.time);
            let boardingDateObj = new Date(flightDateObj - 1000 * 60 * 30);     // flight time minus 30 mins
            resp.send(html
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
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
        }
        catch (err) {
            console.log('Error: ', err);
            let html = fs.readFileSync('templates/head.html', 'utf8');
            html += fs.readFileSync('templates/error.html', 'utf8');
            html += fs.readFileSync('templates/tail.html', 'utf8');
            resp.send(html
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{ERROR}/g, err.toLowerCase())
            );
        }
    })();
});

app.get('/logout', function (req, res) {
    res.redirect('/');
});

process.on('SIGINT', () => {
    http.get(process.env.FINGER_VEIN_API + '/api/ledredoff', (res) => {
        res.resume();
        process.exit();
    });
});

const listener = app.listen(process.env.PORT, function() {
    console.log('Listening on port ' + listener.address().port);
});
