// scripts/seed-l1-l2.js
const { ethers } = require("hardhat");

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function safeSend(wallet, txPromise, label) {
  const tx = await txPromise;
  const rc = await tx.wait();
  console.log(`✅ ${label} mined at block ${rc.blockNumber}`);
  // wait a bit and refresh nonce cache
  await wait(600);
  await wallet.getNonce(); // force refresh
}

async function main() {
  const l1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const l2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:9545");

  // Use different accounts for L1 and L2
  const wallet1 = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    l1Provider
  );
  const wallet2 = new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    l2Provider
  );

  console.log("Seller L1:", wallet1.address);
  console.log("Seller L2:", wallet2.address);

  // Deploy L1
  console.log("\nDeploying UserRegistry on L1...");
  const L1Registry = await ethers.getContractFactory("UserRegistry", wallet1);
  const l1Registry = await L1Registry.deploy();
  await l1Registry.waitForDeployment();
  console.log("✅ L1 UserRegistry deployed at:", await l1Registry.getAddress());
  await wait(800);

  // Deploy L2
  console.log("\nDeploying UserRegistry on L2...");
  const L2Registry = await ethers.getContractFactory("UserRegistry", wallet2);
  const l2Registry = await L2Registry.deploy();
  await l2Registry.waitForDeployment();
  console.log("✅ L2 UserRegistry deployed at:", await l2Registry.getAddress());
  await wait(800);

  // Register sellers
  await safeSend(wallet1, l1Registry.registerSeller("111-222-3333", "L1 Main St"), "L1 seller registered");
  await safeSend(wallet2, l2Registry.registerSeller("444-555-6666", "L2 Side St"), "L2 seller registered");

  console.log("\n🎉 Both networks seeded successfully without nonce conflicts!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
