NFT Marketplace (thirdweb + Sepolia)

## Getting Started

Setup

1) Create `.env.local` in the project root:

```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=YOUR_CLIENT_ID
NEXT_PUBLIC_COLLECTION_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_CHAIN=sepolia
```

2) Install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Pages

- `/` Collection grid and wallet connect
- `/sell` Create a fixed-price listing for a token ID
- `/listings` View listings and buy
- `/auctions` Create auctions, view, and bid

Notes

- Ensure your wallet owns the NFT and approves the marketplace when prompted.

Security

- Do not commit `.env.local`. Never expose secret keys on the client.

## References

- thirdweb Typescript SDK: https://portal.thirdweb.com/references/typescript/v5
