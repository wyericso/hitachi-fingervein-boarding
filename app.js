'use strict';

const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const THIS_URL = 'http://10.211.55.12';
const FINGER_VEIN_API = 'http://10.211.55.12:8080';
const fingers = {
    '0': 'Index',
    '1': 'Middle',
    '2': 'Ring',
    '3': 'Pinky'
};

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
            fs.readFile('templates/boarding.html', 'utf8', (err, data) => {
                if (err) throw err;
                resp.send(data.replace('{THIS_URL}', THIS_URL).replace('{GREETING}', fingers[verifiedTemplateNumber]));
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
