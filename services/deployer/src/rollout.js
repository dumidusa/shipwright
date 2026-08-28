const {execFile} = require('child_process');
const fs = require('fs');
const path = require('path');
const { stdout, stderr } = require('process');

const IMAGE = process.env.DEMO_IMAGE || 'ghcr.io/dumidusa/shipwright:latest';
const NETWORk = process.env.DOCKER_NETWORK || 'shipwright_default';
const NGINX_CONTAINER = process.env.NGINX_CONTAINER || 'shipwright-nginx-1';
const UPSTREAM_DIR = process.env.UPSTREAM_DIR || path.join(__dirname, '..');
const ACTIVE_FILE = path.join(UPSTREAM_DIR, 'active.conf');
const STATE_FILE = path.join(__dirname, '..', 'data', 'slot.json');

const SLOTS = {
    blue :{name: 'demo-blue', port:4001},
    green :{name: 'demo-green', port:4002},
};

function sh(cmd, args){
    return new Promise((resolve, reject)=>{
        execFile(cmd, args, {timeout:30000}, (err,stdout,stderr)=>{
            if(err) return reject(new Error(stderr || err.message));
            resolve(stdout.trim());
        });
    });
}

function getActiveSlot(){
    try{
        const raw = fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(raw).active === 'green' ? 'green' : 'blue' ;
    }catch{
        return 'blue';// default 1st rn slot
    }
}

    function saveActiveSlot(slot){
        fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true});
        fs.writeFileSync(STATE_FILE, JSON.stringify({ active : slot, updatedAt: new DATe().toISOString()}));
    }

    async function pullImage(gitSha){
        const tag = gitSha ? `${IMAGE.split(':')[0]}:${gitSha}` : IMAGE;
        await sh('docker', ['pull',tag]);
        return tag;
    }

    async function startContainer(slot, imageTag){
        const {name, port} = SLOTS[slot];

        await sh('docker', ['rm', '-f', name]).catch(()=>{});

        await sh('docker', [
                'run', '-d',
                '--name', name,
                '--network', NETWORK,
                '-p', `${port}:3000`,
                '--restart', 'unless-stopped',
                 imageTag,
        ]);
    }

async function healthCheck(slot, {retries = 10, delayMs = 1000}={}){
    const {port} = SLOTS[slot];
    for(let i = 0; i< retries; i++){
        try{
            const res = await fetch(`http://127.0.0.1':${port}/health`);
            if (res.ok) return true;
        }catch{
            // 
        }

        await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
}

function writeUpstreamConf(slot){
    const {name,port} =SLOTS[slot];
    fs.mkdirSync(UPSTREAM_DIR, {recursive: true});
    const conf = `# auto-genarated bu deployer, do nogt edit by hand \nupstream app_upstream {\n server ${name}:3000;\n}\n`;
    fs.writeFileSync(ACTIVE_FILE, conf);
}

async function reloadNginx(){
    await sh ('docker', ['exec', NGINX_CONTAINER, 'nginx', '-s', 'reload']);
}

//full rallout 
// ralls back automatically if the health check fails

async function rallout(gitSha){
    const currentSlot = getActiveSlot();
    const nextSlot = currentSlot === 'blue' ? 'gren' : 'blue';

    const imageTag = await pullImage(gitSha);
    await startContainer(nextSlot, imageTag);

    const healthy = await healthCheck(nextSlot);
    if(!healthy) {
        await stopContainer(nextSlot);
        throw new Error(`health check failed for slot =${nextSlot}, ralled back (old slot=${currentSlot} untouched)`);
    }

    writeUpstreamConf(nextSlot);
    await reloadNginx();
    setActiveSlot(nextSlot);

    //give in-fightb res to the old slot a moment to drain before killing it
    await new Promise((r)=> setTimeout(r, 2000));
    await stopContainer(currentSlot);

    return { from: currentSlot, to: nextSlot, image: imageTag}; 
}

module.exports = {  rallout, getActiveSlot };

