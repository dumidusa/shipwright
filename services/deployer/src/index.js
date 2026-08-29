const express = require('express');
const { verifySignature } = require('./webhook');
const { rollout, getActiveSlot } = require('./rollout');
const { createDeploy, finishDeploy, listDeploys } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', activeSlot: getActiveSlot() });
});

app.get('/deploys', (req, res) => {
  res.status(200).json(listDeploys());
});

app.post('/deploy', verifySignature, async (req, res) => {
  const gitSha = (req.body && req.body.gitSha) || 'latest';
  const deployId = createDeploy(gitSha);

  res.status(202).json({ accepted: true, deployId, gitSha });

  try {
    const result = await rollout(gitSha);
    finishDeploy(deployId, 'success', JSON.stringify(result));
    console.log(`deploy ${deployId} succeeded:`, result);
  } catch (err) {
    finishDeploy(deployId, 'rolled_back', err.message);
    console.error(`deploy ${deployId} failed:`, err.message);
  }
});

app.listen(PORT, () => {
  console.log(`deployer listening on ${PORT}`);
});