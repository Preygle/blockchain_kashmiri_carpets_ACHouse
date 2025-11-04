const express = require('express');
const { ethers } = require('ethers');
const fs = require('fs');

const app = express();
app.use(express.json());

const mnemonic = process.env.MNEMONIC || 'test test test test test test test test test test test junk';
const l1Provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(l1Provider); // account[0] as verifier (matches deploy-l1 order)

const marketAbi = ['function thirdPartyConfirmDelivery(uint256,bool) external'];
const bridgeAbi = ['function thirdPartyConfirmAuction(uint256,bool) external'];

const addresses = JSON.parse(fs.readFileSync('../deploy-addresses.json', 'utf-8'));
const market = new ethers.Contract(addresses.l1.marketplace, marketAbi, wallet);
const bridge = new ethers.Contract(addresses.l1.bridge, bridgeAbi, wallet);

app.get('/', (_req, res) => {
  res.type('html').send(`
    <h2>Third-Party Verifier</h2>
    <div>
      <h3>Confirm Direct Sale Delivery</h3>
      <form method="POST" action="/confirm-sale" onsubmit="event.preventDefault(); fetch('/confirm-sale',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({saleId:document.getElementById('saleId').value, verified:true})}).then(r=>r.text()).then(alert)">
        <input id="saleId" placeholder="saleId" />
        <button type="submit">Confirm Delivered</button>
      </form>
    </div>
    <div>
      <h3>Confirm Auction Delivery</h3>
      <form method="POST" action="/confirm-auction" onsubmit="event.preventDefault(); fetch('/confirm-auction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({auctionId:document.getElementById('auctionId').value, verified:true})}).then(r=>r.text()).then(alert)">
        <input id="auctionId" placeholder="auctionId" />
        <button type="submit">Confirm Delivered</button>
      </form>
    </div>
  `);
});

app.post('/confirm-sale', async (req, res) => {
  try {
    const { saleId, verified } = req.body;
    const tx = await market.thirdPartyConfirmDelivery(Number(saleId), !!verified);
    await tx.wait();
    res.send('Sale confirmed: ' + tx.hash);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.post('/confirm-auction', async (req, res) => {
  try {
    const { auctionId, verified } = req.body;
    const tx = await bridge.thirdPartyConfirmAuction(Number(auctionId), !!verified);
    await tx.wait();
    res.send('Auction confirmed: ' + tx.hash);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Verifier running on http://localhost:' + port));


