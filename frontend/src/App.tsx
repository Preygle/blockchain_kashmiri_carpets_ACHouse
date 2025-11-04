import React, { useEffect, useMemo, useState } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';

type Addresses = {
  l1: { registry: string; token: string; nft: string; marketplace: string; bridge: string; };
  l2: { registry: string; token: string; nft: string; auctionHouse: string; };
};

const marketplaceAbi = [
  'function listForSale(uint256,uint256,address,address) external returns(uint256)',
  'function buyNow(uint256) external returns(uint256)',
  'function sales(uint256) view returns(uint256 id,address buyer,uint256 listingId,uint256 amount,bool released,bool refunded)'
];
const registryAbi = ['function registerSeller(string,string) external', 'function isSellerRegistered(address) view returns (bool)'];
const nftAbi = ['function mint(address,string) external returns(uint256)','function setApprovalForAll(address,bool)','function approve(address,uint256)'];
const erc20Abi = ['function approve(address,uint256) external returns(bool)','function balanceOf(address) view returns (uint256)'];
const auctionAbi = ['function createAuction(uint256,address,uint256,uint256,address,address) external returns(uint256)','function placeBid(uint256,uint256) external'];

function useAddresses(): Addresses | null {
  const [a, setA] = useState<Addresses | null>(null);
  useEffect(() => {
    fetch('/deploy-addresses.json').then(r => r.json()).then(d => setA(d as any)).catch(() => setA(null));
  }, []);
  return a;
}

export default function App() {
  const addrs = useAddresses();
  const [account, setAccount] = useState<string>('');
  const [network, setNetwork] = useState<'l1' | 'l2'>('l1');
  const [status, setStatus] = useState<string>('');

  const provider = useMemo(() => new BrowserProvider((window as any).ethereum), []);

  async function connect(chain: 'l1' | 'l2') {
    setNetwork(chain);
    await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
  }

  async function registerSeller() {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const reg = new Contract(addrs[network].registry, registryAbi, signer);
    setStatus('Registering seller...');
    await (await reg.registerSeller('9999999999', 'Srinagar, J&K')).wait();
    setStatus('Seller registered.');
  }

  async function faucet() {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const token = new Contract(addrs[network].token, ['function faucet(address,uint256)','function balanceOf(address) view returns(uint256)'], signer);
    setStatus('Faucet minting 1000 FAKEBTC...');
    await (await token.faucet(await signer.getAddress(), ethers.parseUnits('1000', 18))).wait();
    const bal = await token.balanceOf(await signer.getAddress());
    setStatus('Balance: ' + ethers.formatUnits(bal, 18));
  }

  async function mintCarpet(i: number) {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const nft = new Contract(addrs[network].nft, nftAbi, signer);
    const uri = `/metadata/carpet${i}.json`;
    setStatus('Minting ' + uri);
    await (await nft.mint(await signer.getAddress(), uri)).wait();
    setStatus('Minted ' + uri);
  }

  async function listForSale(tokenId: number, price: string) {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const nft = new Contract(addrs.l1.nft, nftAbi, signer);
    const market = new Contract(addrs.l1.marketplace, marketplaceAbi, signer);
    await (await nft.setApprovalForAll(addrs.l1.marketplace, true)).wait();
    setStatus('Listing for sale...');
    await (await market.listForSale(tokenId, ethers.parseUnits(price, 18), addrs.l1.nft, addrs.l1.token)).wait();
    setStatus('Listed token ' + tokenId);
  }

  async function createAuction(tokenId: number, minBid: string) {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const nft = new Contract(addrs.l2.nft, nftAbi, signer);
    const auc = new Contract(addrs.l2.auctionHouse, auctionAbi, signer);
    await (await nft.setApprovalForAll(addrs.l2.auctionHouse, true)).wait();
    setStatus('Creating auction...');
    await (await auc.createAuction(tokenId, addrs.l2.nft, ethers.parseUnits(minBid, 18), 120, await signer.getAddress(), addrs.l2.token)).wait();
    setStatus('Auction created for token ' + tokenId);
  }

  async function placeBid(auctionId: number, amount: string) {
    if (!addrs) return;
    const signer = await provider.getSigner();
    const token = new Contract(addrs.l2.token, erc20Abi, signer);
    const auc = new Contract(addrs.l2.auctionHouse, auctionAbi, signer);
    await (await token.approve(addrs.l2.auctionHouse, ethers.parseUnits(amount, 18))).wait();
    await (await auc.placeBid(auctionId, ethers.parseUnits(amount, 18))).wait();
    setStatus('Bid placed.');
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Kashmiri Carpets Demo</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={() => connect('l1')}>Connect L1</button>
        <button onClick={() => connect('l2')}>Connect L2</button>
        <button onClick={registerSeller}>Register Seller (L1/L2 separately)</button>
        <button onClick={faucet}>Faucet FAKEBTC ({network})</button>
      </div>
      <div>Connected: {account || '-'}</div>
      <hr />
      <h3>Mint Carpets</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1,2,3,4,5,6].map(i => (
          <button key={i} onClick={() => mintCarpet(i)}>Mint carpet{i} (current network)</button>
        ))}
      </div>
      <hr />
      <h3>List for Direct Sale (L1)</h3>
      <p>Example: tokenId 1, price 100</p>
      <button onClick={() => listForSale(1, '100')}>List token 1 for 100 FAKEBTC</button>
      <hr />
      <h3>Create Auction (L2)</h3>
      <p>Example: tokenId 1 (on L2), minBid 50</p>
      <button onClick={() => createAuction(1, '50')}>Create auction for L2 token 1</button>
      <h3>Place Bid (L2)</h3>
      <button onClick={() => placeBid(1, '60')}>Bid 60 on auction #1</button>
      <hr />
      <div>{status}</div>
    </div>
  );
}


