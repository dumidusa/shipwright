const express = require('express');

const app=express();
const PORT = 3000;
const GIT_SHA = 'dev';
const STARTED_AT = new Date().toISOString();

app.get('/health', (req,res) =>{
    res.status(200).json({ status: 'ok'});
});

app.get('/version', (req,res)=>{
    res.status(200).json({sha:GIT_SHA, startedAt: STARTED_AT});
});

app.get('/',(req,res)=>{
    res.status(200).send(`demo-app running, sha=${GIT_SHA} PORT=${PORT}`);
})

app.listen(PORT, ()=>{
    console.log(`demo-app listenning on ${PORT}`);
});