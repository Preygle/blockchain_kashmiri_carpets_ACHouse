const { ethers } = require("hardhat");

async function main() {
  const [deployer, verifier, seller] = await ethers.getSigners();

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const FAKEBTC = await ethers.getContractFactory("FAKEBTC");
  const CarpetNFT = await ethers.getContractFactory("CarpetNFT");
  const AuctionHouse = await ethers.getContractFactory("AuctionHouse");

  const registry = await UserRegistry.deploy();
  await registry.waitForDeployment();
  const token = await FAKEBTC.deploy();
  await token.waitForDeployment();
  const nft = await CarpetNFT.deploy();
  await nft.waitForDeployment();
  const auction = await AuctionHouse.deploy(await registry.getAddress());
  await auction.waitForDeployment();

  // fund seller and a few bidders on l2 as well
  const oneHundred = ethers.parseUnits("1000", 18);
  const accounts = await ethers.getSigners();
  for (let i = 1; i < Math.min(accounts.length, 6); i++) {
    await (await token.faucet(accounts[i].address, oneHundred)).wait();
  }

  console.log(JSON.stringify({
    network: "l2",
    deployer: deployer.address,
    verifier: verifier.address,
    seller: seller.address,
    registry: await registry.getAddress(),
    token: await token.getAddress(),
    nft: await nft.getAddress(),
    auctionHouse: await auction.getAddress()
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

