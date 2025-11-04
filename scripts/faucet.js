const { ethers } = require('hardhat');

async function main() {
  const [deployer, ...rest] = await ethers.getSigners();
  const tokenAddr = process.env.TOKEN;
  if (!tokenAddr) throw new Error('Set TOKEN env var');
  const Token = await ethers.getContractFactory('FAKEBTC');
  const token = Token.attach(tokenAddr);
  const amount = ethers.parseUnits(process.env.AMOUNT || '1000', 18);
  for (const s of rest.slice(0, 8)) {
    const tx = await token.faucet(s.address, amount);
    await tx.wait();
    console.log('Minted', amount.toString(), 'to', s.address);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


