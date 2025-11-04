// Watches L2 AuctionHouse for AuctionEnded and calls L1 Bridge.submitAuctionResult
const { ethers } = require("ethers");
const fs = require('fs');

async function main() {
  const l2Provider = new ethers.JsonRpcProvider('http://127.0.0.1:9545');
  const l1Provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  const mnemonic = process.env.MNEMONIC || 'test test test test test test test test test test test junk';
  const l2Wallet = ethers.Wallet.fromPhrase(mnemonic).connect(l2Provider);
  const l1Wallet = ethers.Wallet.fromPhrase(mnemonic).connect(l1Provider);

  // Load addresses
  const addressesPath = './deploy-addresses.json';
  if (!fs.existsSync(addressesPath)) {
    console.error('deploy-addresses.json not found. Run deploy scripts first.');
    process.exit(1);
  }
  const addrs = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
  const l2 = addrs.l2; const l1 = addrs.l1;

  const auctionAbi = [
    'event AuctionEnded(uint256 indexed auctionId, address winner, address seller, uint256 amount)'
  ];
  const bridgeAbi = [
    'function submitAuctionResult(bytes l2Payload) external'
  ];

  const auction = new ethers.Contract(l2.auctionHouse, auctionAbi, l2Wallet);
  const bridge = new ethers.Contract(l1.bridge, bridgeAbi, l1Wallet);

  console.log('Relay watching L2 AuctionEnded...');
  auction.on('AuctionEnded', async (auctionId, winner, seller, amount, evt) => {
    try {
      console.log('AuctionEnded on L2:', { auctionId: auctionId.toString(), winner, seller, amount: amount.toString(), blockNumber: evt.log.blockNumber });
      const payload = ethers.AbiCoder.defaultAbiCoder().encode([
        'uint256','address','address','uint256','uint256'
      ], [auctionId, winner, seller, amount, evt.log.blockNumber]);
      const tx = await bridge.submitAuctionResult(payload);
      await tx.wait();
      console.log('Relayed to L1 Bridge.submitAuctionResult:', tx.hash);
    } catch (e) {
      console.error('Relay error', e);
    }
  });
}

main().catch(e => { console.error(e); process.exit(1); });