const crypto = require('crypto');

const SECRET = process.env.DEPLOY_WEBHOOK_SECRET;

if(!SECRET){
    console.warn('WARNING: DEPLOY_WEBHOOK_SECRET is not set!, Webhook is UNPROTECTED!... ');
}

function verifySignature(req, res, next){
    if (!SECRET) return next();//temp

    const signature = req.headers['x-signature'];
    if(!signature || !signature.startsWith('sha256=')) {
        return res.status(401).json({ error: 'missing or malformed signature ' });
    }

    const expected = crypto
        .createHmac('sha256', SECRET)
        .update(req.rawBody || '')
        .digest('hex');

    const provided = signature.replace('sha256=', '');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if(a.length !== b.length || !crypto.timingSafeEqual(a,b)) {
        return res.status(401).json({
            error: 'invalid signature'
        });
    }
    next();
}

module.exports = {verifySignature};