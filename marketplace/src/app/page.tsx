import Link from "next/link";
import { WalletConnect } from "@/components/Wallet";
import NFTGrid from "@/components/NFTGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">NFT Marketplace</h1>
        <WalletConnect />
      </header>
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex gap-3">
          <Link className="rounded-md px-4 py-2 bg-black text-white" href="/sell">List for Sale</Link>
          <Link className="rounded-md px-4 py-2 border" href="/listings">Listings</Link>
          <Link className="rounded-md px-4 py-2 border" href="/auctions">Auctions</Link>
          <Link className="rounded-md px-4 py-2 border" href="/my-nfts">My NFTs</Link>
        </div>
        <h2 className="text-lg font-medium">Collection</h2>
        <NFTGrid />
      </main>
    </div>
  );
}
