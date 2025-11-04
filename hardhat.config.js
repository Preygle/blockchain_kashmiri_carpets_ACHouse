require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const DEFAULT_MNEMONIC = 'test test test test test test test test test test test junk';
const L1_CHAIN_ID = 31337; // default Hardhat
const L2_CHAIN_ID = 31338; // unique chain ID for second node

// Allows switching the Hardhat internal node chain ID dynamically
const hardhatChainId = process.env.HARDHAT_CHAIN_ID
  ? parseInt(process.env.HARDHAT_CHAIN_ID)
  : L1_CHAIN_ID;

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Used when you run: npx hardhat node
    hardhat: {
      chainId: hardhatChainId,
      accounts: { mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC },
    },

    // Layer 1 network (Main simulation)
    l1: {
      url: 'http://127.0.0.1:8545',
      chainId: L1_CHAIN_ID,
      accounts: { mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC },
    },

    // Layer 2 network (Low-gas simulation)
    l2: {
      url: 'http://127.0.0.1:9545',
      chainId: L2_CHAIN_ID,
      accounts: { mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC },
    },
  },
  mocha: {
    timeout: 120000,
  },
};
