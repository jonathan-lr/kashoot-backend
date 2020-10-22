var express = require("express");
var router = express.Router();
const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

router.get('/', (req, res) => {
    if (process.env.API_ENVIRONMENT === "live"){
        res.status(200).send('Welcome To The Live API');
    } else {
        res.status(200).send('Welcome To Thy Dev API');
    }
});

router.get('/jsonTest', (req, res) => {
    res.json({
        "items": [
            { "id": 1, "firstName": "Red", "lastName": "Boi" },
            { "id": 1, "firstName": "Blue", "lastName": "Boi" },
            { "id": 1, "firstName": "Green", "lastName": "Boi" },
        ]
    })
});

module.exports = router;