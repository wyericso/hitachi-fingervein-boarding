'use strict';

const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const urlencodedParser = require('body-parser').urlencoded({extended: true});
const templateHtml = fs.readFileSync(__dirname + '/templates/template.html', 'utf8');
const boardingHtml = fs.readFileSync(__dirname + '/templates/boarding.html_', 'utf8');
const registerHtml = fs.readFileSync(__dirname + '/templates/register.html_', 'utf8');
const MONTH = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];
require('dotenv').config({path: __dirname + '/.env'});

const ledGreenBlink = function () {
    return new Promise((resolve) => {
        http.get(process.env.FINGER_VEIN_API + '/api/ledgreenblink', (res) => {
            res.resume();
            resolve();
        });
    });
};

const ledGreenOn = function () {
    return new Promise((resolve) => {
        http.get(process.env.FINGER_VEIN_API + '/api/ledgreenon', (res) => {
            res.resume();
            resolve();
        });
    });
};

const mongoClient = new MongoClient(process.env.DB_URL, { useNewUrlParser: true});
let dB_Collection;

(async () => {
    try {
        await mongoClient.connect();
        process.stdout.write('DB server connected.\n');
        dB_Collection = mongoClient.db(process.env.DB_NAME).collection(process.env.COLLECTION_NAME);
        await (() => {
            return new Promise((resolve) => {
                http.get(process.env.FINGER_VEIN_API + '/api/send_encryption_key', (res) => {
                    res.resume();
                    resolve();
                });
            });
        })();
        await ledGreenOn();
        process.stdout.write('Application ready.\n');
    }
    catch (err) {
        process.stdout.write('Error: ' + err + '\n');
    }
})();

app.use(express.static(__dirname + '/views'));

app.get('/', function (req, res) {
    res.send(templateHtml
        .replace(/{THIS_URL}/g, process.env.THIS_URL)
        .replace(/{NAV_PLACEHOLDER}/, `
            <li onclick="register()">Register</li>
            <li onclick="logIn()">Login</li>
        `)
        .replace(/{MAIN_PLACEHOLDER}/, '<figure><img id="cover-img" src="https://res.cloudinary.com/woooanet/image/upload/v1540199193/hitachi-fingervein-fe/brandingimg_vid_e.jpg" /></figure>')
    );
});

app.get('/login', (req, resp) => {
    let verification_1toN = function () {
        return new Promise(async (resolve, reject) => {
            await ledGreenBlink();
            process.stdout.write('Calling finger vein verification 1 to N API.\n');
            let data = '';

            http.get(process.env.FINGER_VEIN_API + '/api/verification_1toN', (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', async () => {
                    await ledGreenOn();
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

    let loadBoardingPass = function (verifiedTemplateNumber) {
        return new Promise((resolve, reject) => {
            process.stdout.write('Loading boarding pass.\n');
            dB_Collection.findOne({'verifiedTemplateNumber': verifiedTemplateNumber}, (err, boardingPass) => {
                if (boardingPass) {
                    resolve(boardingPass);
                }
                else {
                    reject('Boarding pass not found.');
                }
            });
        });
    };

    (async () => {
        try {
            const verifiedTemplateNumber = await verification_1toN();
            const boardingPass = await loadBoardingPass(verifiedTemplateNumber);

            process.stdout.write('Showing boarding pass.\n');
            let flightDateObj = new Date(boardingPass.time);
            let boardingDateObj = new Date(flightDateObj - 30 * 60 * 1000);     // flight time minus 30 mins
            resp.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, '<li>Hello, ' + boardingPass.name + '!</li><li><a href="' + process.env.THIS_URL + '/logout">Logout</a></li>')
                .replace(/{MAIN_PLACEHOLDER}/, boardingHtml)
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
            process.stdout.write('Error: ' + err + '\n');
            resp.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, `
                    <li onclick="register()">Register</li>
                    <li onclick="logIn()">Login</li>
                `)
                .replace(/{MAIN_PLACEHOLDER}/, '<p id="error">Sorry, ' + err.toLowerCase() + '</p>')
            );
        }
    })();
});

app.get('/logout', function (req, res) {
    res.redirect('/');
});

app.get('/register', (req, resp) => {
    const receiveTemplate = function() {
        return new Promise(async (resolve, reject) => {
            await ledGreenBlink();
            process.stdout.write('Calling finger vein receive template API.\n');
            let data = '';

            http.get(process.env.FINGER_VEIN_API + '/api/receive_template', (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', async() => {
                    await ledGreenOn();
                    if (JSON.parse(data).response === 'ok') {
                        resolve({'template': JSON.parse(data).template});
                    }
                    else {
                        reject('Finger vein not recognized.');
                    }
                });
            });
        });
    };

    const sendTemplate = function(templateObj) {
        return new Promise(async (resolve, reject) => {
            process.stdout.write('Calling finger vein send template API.\n');
            let data = '';

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const requ = http.request(process.env.FINGER_VEIN_API + '/api/send_template', options, (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', async() => {
                    if (JSON.parse(data).response === 'ok') {
                        resolve(JSON.parse(data).templateNumber);
                    }
                    else {
                        reject('Finger vein not recognized.');
                    }
                });
            });

            requ.write(JSON.stringify(templateObj));
            requ.end();
        });
    };

    (async () => {
        try {
            const templateObj = await receiveTemplate();
            const templateNumber = await sendTemplate(templateObj);

            process.stdout.write('Showing registration page.\n');
            resp.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, `
                    <li onclick="register()">Register</li>
                    <li onclick="logIn()">Login</li>
                `)
                .replace(/{MAIN_PLACEHOLDER}/, registerHtml)
                .replace(/{TEMPLATE_NUMBER}/, templateNumber)
            );
        }
        catch (err) {
            process.stdout.write('Error: ' + err + '\n');
            resp.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, `
                    <li onclick="register()">Register</li>
                    <li onclick="logIn()">Login</li>
                `)
                .replace(/{MAIN_PLACEHOLDER}/, '<p id="error">Sorry, ' + err.toLowerCase() + '</p>')
            );
        }
    })();
});

app.post('/submit', urlencodedParser, (req, res) => {
    (async () => {
        try {
            await dB_Collection.findOneAndReplace({
                'verifiedTemplateNumber': parseInt(req.body['template-number-input'], 10)
            }, {
                'verifiedTemplateNumber': parseInt(req.body['template-number-input'], 10),
                'name': req.body['name-input'],
                'fromLong': req.body['from-long-input'],
                'fromShort': req.body['from-short-input'],
                'toLong': req.body['to-long-input'],
                'toShort': req.body['to-short-input'],
                'flight': req.body['flight-input'],
                'time': req.body['time-input'],
                'gate': req.body['gate-input'],
                'seat': req.body['seat-input']
            }, {
                'upsert': true
            });

            res.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, `
                    <li onclick="register()">Register</li>
                    <li onclick="logIn()">Login</li>
                `)
                .replace(/{MAIN_PLACEHOLDER}/, '<p id="register">Registration succeeded.</p>')
            );
        }
        catch (err) {
            process.stdout.write('Error: ' + err + '\n');
            res.send(templateHtml
                .replace(/{THIS_URL}/g, process.env.THIS_URL)
                .replace(/{NAV_PLACEHOLDER}/, `
                    <li onclick="register()">Register</li>
                    <li onclick="logIn()">Login</li>
                `)
                .replace(/{MAIN_PLACEHOLDER}/, '<p id="error">Sorry, ' + err.toLowerCase() + '</p>')
            );
        }
    })();
});

process.on('SIGINT', async () => {
    await mongoClient.close();
    await (() => {
        return new Promise((resolve) => {
            http.get(process.env.FINGER_VEIN_API + '/api/reset', (res) => {
                res.resume();
                resolve();
            });
        });
    })();
    http.get(process.env.FINGER_VEIN_API + '/api/ledgreenoff', (res) => {
        res.resume();
        process.exit();
    });
});

const listener = app.listen(process.env.PORT, function() {
    process.stdout.write('Listening on port ' + listener.address().port + '\n');
});
