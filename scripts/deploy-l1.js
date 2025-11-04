const { ethers } = require("hardhat");

async function main() {
  const [deployer, verifier, seller, buyer1, buyer2, buyer3, buyer4] = await ethers.getSigners();

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const FAKEBTC = await ethers.getContractFactory("FAKEBTC");
  const CarpetNFT = await ethers.getContractFactory("CarpetNFT");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const Bridge = await ethers.getContractFactory("Bridge");

  const registry = await UserRegistry.deploy();
  await registry.waitForDeployment();
  const token = await FAKEBTC.deploy();
  await token.waitForDeployment();
  const nft = await CarpetNFT.deploy();
  await nft.waitForDeployment();
  const marketplace = await Marketplace.deploy(await registry.getAddress(), verifier.address);
  await marketplace.waitForDeployment();
  const bridge = await Bridge.deploy(await token.getAddress(), verifier.address);
  await bridge.waitForDeployment();
  await bridge.setMarketplace(await marketplace.getAddress());

  // Faucet some tokens to demo accounts
  const oneHundred = ethers.parseUnits("1000", 18);
  const airdrops = [seller, buyer1, buyer2, buyer3, buyer4];
  for (const s of airdrops) {
    await (await token.faucet(s.address, oneHundred)).wait();
  }

  console.log(JSON.stringify({
    network: "l1",
    deployer: deployer.address,
    verifier: verifier.address,
    seller: seller.address,
    buyers: [buyer1.address, buyer2.address, buyer3.address, buyer4.address],
    registry: await registry.getAddress(),
    token: await token.getAddress(),
    nft: await nft.getAddress(),
    marketplace: await marketplace.getAddress(),
    bridge: await bridge.getAddress()
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

