## Kashmiri Carpets Marketplace & Auction (Local Demo)

Runs entirely on localhost using two Hardhat nodes to simulate L1 and L2. Carpets are ERC-721, payments FAKEBTC ERC-20. Direct sale on L1, auctions on L2, relayed to L1. A third-party verifier confirms delivery to release escrowed funds.

### Prerequisites
- Node.js 18+
- Two terminals
- MetaMask configured to:
  - L1: http://127.0.0.1:8545 chainId 31337
  - L2: http://127.0.0.1:9545 chainId 31338

### Install
```
npm install
```

### Start local chains
```
# Terminal 1 (L1)
npx hardhat node --port 8545

# Terminal 2 (L2)
npx hardhat node --port 9545 --hostname 127.0.0.1
```

### Deploy to L2 then L1 and save addresses
```
node scripts/deploy-both.js
```
This creates `deploy-addresses.json` and a copy at `frontend/public/deploy-addresses.json` (copy it manually if needed).

### Seed demo data
Copy your images into `frontend/public/images/`:
- `frontend/public/images/img1.jpg` ... `img6.jpg`

Then seed:
```
node scripts/seed-l1-l2.js
```

This will:
- Register the seller on L1 and L2 (phone/address)
- Mint 6 NFTs on L1, list 3 for sale on Marketplace (L1)
- Mint 3 NFTs on L2 and create 3 auctions (L2)

### Frontend
```
cd frontend
npm run dev
```
Open http://localhost:5173. Use wallet panel to connect L1/L2, faucet FAKEBTC, mint, list, create auctions, bid.

### Relay watcher
```
node scripts/relay-watch-l2.js
```
Keeps watching L2 `AuctionEnded` and calls L1 Bridge.

### Verifier App
```
cd verifier
npm start
```
Open http://localhost:4000 to confirm deliveries for Direct Sales (saleId) or Auctions (auctionId). This uses the verifier account (first Hardhat account) to sign.

### Accounts (example)
After `scripts/deploy-both.js`, the console prints:
- Seller: account[2]
- Buyers: account[3..6] (4 buyers) — pre-funded with 1000 FAKEBTC on L1 and L2
- Verifier: account[1]

You can import these accounts to MetaMask from the Hardhat node list if needed.

### Registration rules
- Sellers MUST register on each network they use (L1 Marketplace and L2 AuctionHouse enforce registry)
  - Seller provides phone number and physical address on-chain (`UserRegistry`)
- Buyers do NOT register on-chain; they provide their details only to the third-party verifier app upon purchase (off-chain)

### Typical flows
1) Direct Sale (L1)
- Buyer faucets FAKEBTC, approves Marketplace, clicks Buy (via custom call or add to UI later)
- Marketplace escrows FAKEBTC and NFT
- Verifier confirms delivery -> funds released to seller and NFT to buyer

2) Auction (L2 → L1)
- Bidders faucet FAKEBTC on L2 and place bids
- After duration, call `endAuction` (not yet wired in UI)
- Relay detects event and calls L1 Bridge
- Verifier confirms auction delivery on Bridge
- Bridge releases FAKEBTC on L1 to seller

### Tests
`npm test` runs minimal Hardhat tests (to be added if needed).

## Kashmiri Carpets Demo (Local)

### Quick Start

1) Install deps

```
npm install
```

2) Start two local nodes in two terminals

```
npm run node:l1
```

```
npm run node:l2
```

3) Seed L1 with contracts, a seller, 4 buyers, FAKEBTC, and mint 6 NFTs using images in `images/`

```
npx hardhat run --network l1 scripts/seed.js
```

This writes `addresses.json` with deployed addresses and the seller/buyer accounts.

4) Deploy L2 (for auctions)

```
npm run deploy:l2
```

5) Start the relay watcher (optional for auction flow)

```
npm run relay
```

### Notes

- Seller must register before listing or creating auctions (enforced in contracts via `UserRegistry`).
- Buyers do not need to pre-register to bid/buy in this demo; their delivery details are collected by the third-party verifier app during confirmation.
- Metadata for the 6 carpets is embedded as on-chain data URIs referencing local image paths `/images/img*.jpg`.


