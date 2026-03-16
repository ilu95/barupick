const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./AuthKey_VL484SZT54.p8');
const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: '6K46PNWCCH',
    subject: 'com.barusa.barupick.web',
    keyid: 'VL484SZT54',
});
console.log(token);
