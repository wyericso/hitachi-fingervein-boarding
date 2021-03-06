'use string';

const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

let docs = [];
const names = [
    'Left Index',
    'Left Middle',
    'Left Ring',
    'Left Pinky',
    'Piers Burgess',
    'Steven Vaughan',
    'Tim Morrison',
    'Piers Miller',
    'Deirdre Berry',
    'Nathan White',
    'Joe Black',
    'Sean Russell',
    'Lily Paige',
    'Keith Mills',
    'Nicola Paterson',
    'Isaac Clark',
    'Sean MacDonald',
    'Matt Metcalfe',
    'Dylan Glover',
    'Brandon Bower',
    'Piers Smith',
    'Heather Metcalfe',
    'Jessica Simpson',
    'Vanessa Gill',
    'Anthony Johnston',
    'Alison Allan',
    'Olivia Fraser',
    'Frank Clarkson',
    'Joan Churchill',
    'Claire Burgess',
    'Joshua Knox',
    'Jake Pullman',
    'Gabrielle Mackenzie',
    'Zoe Howard',
    'Leonard Metcalfe',
    'Sarah Jackson',
    'Gavin Skinner',
    'Victoria Berry',
    'Anna Nolan',
    'Wendy Hill',
    'Jacob Bailey',
    'Justin Clarkson',
    'Harry Ferguson',
    'Nathan Walsh',
    'Amy MacLeod',
    'Alexandra King',
    'Pippa Payne',
    'Abigail Lewis',
    'Rachel Hart',
    'Alison Russell',
    'Max Dyer',
    'Carl Davies',
    'Rose Nolan',
    'Alison Terry',
    'Zoe Murray',
    'Wendy Lawrence',
    'Boris Hardacre',
    'Kevin Alsop',
    'Neil Wallace',
    'David Hart',
    'Olivia Welch',
    'Anna Davies',
    'Michael Newman',
    'Rachel Davies',
    'Alexandra Wilson',
    'Natalie MacLeod',
    'Sebastian Reid',
    'Boris Sanderson',
    'Lily Blake',
    'Jasmine Ross',
    'Kevin Nolan',
    'Chloe Marshall',
    'Connor Thomson',
    'Natalie Hill',
    'Charles Manning',
    'Matt Sanderson',
    'Brandon Vaughan',
    'Stephanie Ferguson',
    'Sebastian Randall',
    'Madeleine Terry',
    'Frank Peters',
    'Colin Lewis',
    'Samantha Young',
    'Una Sharp',
    'Leah Ferguson',
    'Chloe Reid',
    'Lauren Rutherford',
    'Deirdre Paterson',
    'Ava Ogden',
    'Owen Fisher',
    'Keith James',
    'Nicola Black',
    'Charles Burgess',
    'Vanessa Piper',
    'Audrey Russell',
    'Pippa Slater',
    'Chloe Arnold',
    'Alan Taylor',
    'Ian Watson',
    'Alison Blake'
];

for (let i = 0; i < 100; i++) {
    docs.push({
        "verifiedTemplateNumber": i,
        "name": names[i],
        "fromLong": "Hong Kong",
        "fromShort": "HKG",
        "toLong": "Vancouver",
        "toShort": "YVR",
        "flight": "AC658",
        "time": "Wed, 09 Jan 2019 21:15:00 GMT+0800",
        "gate": "32",
        "seat": Math.trunc(i / 6) + 21 + ['A', 'B', 'C', 'D', 'E', 'F'][i % 6]
    });
}

const mongoClient = new MongoClient(process.env.DB_URL, { useNewUrlParser: true});
mongoClient.connect((err) => {
    console.log('DB server connected.');
    mongoClient.db(process.env.DB_NAME).collection(process.env.COLLECTION_NAME).insertMany(docs, (err, result) => {
        console.log('Insert done.');
        mongoClient.close();
    });
});
