const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, seller, buyer1, buyer2, buyer3, buyer4] = await ethers.getSigners();

  const FAKEBTC = await ethers.getContractFactory("FAKEBTC");
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const CarpetNFT = await ethers.getContractFactory("CarpetNFT");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const BridgeL1 = await ethers.getContractFactory("BridgeL1");

  // Assume previously deployed in the same process (hardhat network) => get most recent
  const fakebtc = await FAKEBTC.deploy(); await fakebtc.waitForDeployment();
  const registry = await UserRegistry.deploy(); await registry.waitForDeployment();
  const nft = await CarpetNFT.deploy(); await nft.waitForDeployment();
  const market = await Marketplace.deploy(await registry.getAddress()); await market.waitForDeployment();
  const bridge = await BridgeL1.deploy(); await bridge.waitForDeployment();

  const addresses = {
    l1: {
      FAKEBTC: await fakebtc.getAddress(),
      UserRegistry: await registry.getAddress(),
      CarpetNFT: await nft.getAddress(),
      Marketplace: await market.getAddress(),
      BridgeL1: await bridge.getAddress()
    },
    l2: {},
    seed: {
      seller: seller.address,
      buyers: [buyer1.address, buyer2.address, buyer3.address, buyer4.address]
    }
  };
  fs.writeFileSync(path.join(__dirname, "../addresses.json"), JSON.stringify(addresses, null, 2));

  // Register seller with details
  await (await registry.connect(seller).registerSeller("+91-0000000000", "Srinagar, J&K")).wait();

  // Mint FAKEBTC to seller and buyers
  const mintAmt = ethers.parseUnits("50000", 18);
  for (const acc of [seller, buyer1, buyer2, buyer3, buyer4]) {
    await (await fakebtc.faucet(acc.address, mintAmt)).wait();
  }

  // Mint 6 NFTs using local images; store simple on-chain URI pointing to /images/imgX.jpg
  const imagesDir = path.resolve("C:/Users/moham/Documents/PROGRAMMING/AC-house-carpet NEW/images");
  const imageFiles = ["img1.jpg","img2.jpg","img3.jpg","img4.jpg","img5.jpg","img6.jpg"];

  const mintedIds = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const imgName = imageFiles[i];
    const meta = {
      name: `Kashmiri Carpet #${i+1}`,
      description: `Handmade Kashmiri carpet #${i+1}`,
      image: `/images/${imgName}`,
      origin: i % 3 === 0 ? "Srinagar" : i % 3 === 1 ? "Baramulla" : "Anantnag",
      weave: "Twill knot",
      producer: "Demo Producer",
      certificateId: `CERT1${i+1}`,
      dimensions: "9x6 ft"
    };
    const tokenURI = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(meta))}`;
    const tx = await nft.mint(seller.address, tokenURI);
    const rc = await tx.wait();
    const ev = rc.logs.find(l => l.fragment && l.fragment.name === 'Minted');
    const tokenId = ev ? Number(ev.args[0]) : (i+1);
    mintedIds.push(tokenId);
  }

  console.log("Seed complete:");
  console.log("Seller:", seller.address);
  console.log("Buyers:", buyer1.address, buyer2.address, buyer3.address, buyer4.address);
  console.log("NFT IDs:", mintedIds);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

