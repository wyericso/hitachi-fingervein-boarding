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

app.use(express.static('views'));

app.get('/', function (req, res) {
    fs.readFile('templates/index.html', 'utf8', (err, data) => {
        if (err) throw err;
        res.send(data.replace('{THIS_URL}', THIS_URL));
    });
});

app.get('/login', (req, resp) => {
    http.get(FINGER_VEIN_API + '/api/verification_1toN', (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            let verifiedTemplateNumber = JSON.parse(data).verifiedTemplateNumber;
            const client = new MongoClient(DB_URL, { useNewUrlParser: true});
            client.connect((err) => {
                console.log('DB server connected.');
                const db = client.db(DB_NAME);
                const collection = db.collection(COLLECTION_NAME);
                collection.findOne({'verifiedTemplateNumber': verifiedTemplateNumber}, (err, result) => {
                    console.log(result);
                    let flightDateObj = new Date(result.time);
                    let boardingDateObj = new Date(flightDateObj - 1000 * 60 * 30);     // flight time minus 30 mins
                    fs.readFile('templates/boarding.html', 'utf8', (err, data) => {
                        if (err) throw err;
                        resp.send(data
                            .replace(/{THIS_URL}/g, THIS_URL)
                            .replace(/{GREETING}/g, result.name)
                            .replace(/{NAME}/g, result.name.toUpperCase())
                            .replace(/{FROM-LONG}/g, result.fromLong.toUpperCase())
                            .replace(/{FLIGHT}/g, result.flight)
                            .replace(/{TO-LONG}/g, result.toLong.toUpperCase())
                            .replace(/{MMM}/g, MONTH[flightDateObj.getMonth()])
                            .replace(/{DD}/g, flightDateObj.getDate().toString().padStart(2, '0'))
                            .replace(/{YYYY}/g, flightDateObj.getFullYear())
                            .replace(/{HH}/g, flightDateObj.getHours().toString().padStart(2, '0'))
                            .replace(/{MM}/g, flightDateObj.getMinutes().toString().padStart(2, '0'))
                            .replace(/{GATE}/g, result.gate)
                            .replace(/{BHH}/g, boardingDateObj.getHours().toString().padStart(2, '0'))
                            .replace(/{BMM}/g, boardingDateObj.getMinutes().toString().padStart(2, '0'))
                            .replace(/{FROM-SHORT}/g, result.fromShort)
                            .replace(/{TO-SHORT}/g, result.toShort)
                            .replace(/{SEAT}/g, result.seat)
                        );
                        client.close();
                    });
                });
            });
        });
    });
});

app.get('/logout', function (req, res) {
    fs.readFile('templates/index.html', 'utf8', (err, data) => {
        if (err) throw err;
        res.send(data.replace('{THIS_URL}', THIS_URL));
    });
});

const listener = app.listen(80, function() {
    console.log('Listening on port ' + listener.address().port);
});
