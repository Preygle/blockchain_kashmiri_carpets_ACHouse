"use client";
import { useEffect, useState } from "react";
import { getContract } from "thirdweb";
import { getNFTs } from "thirdweb/extensions/erc721";
import { MediaRenderer } from "thirdweb/react";
import { client, activeChain, COLLECTION_ADDRESS } from "@/lib/thirdwebClient";

type NFT = {
	metadata: {
		id: string;
		name?: string;
		description?: string;
		image?: string;
	};
};

export default function NFTGrid() {
	const [nfts, setNfts] = useState<NFT[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		async function load() {
			if (!COLLECTION_ADDRESS) {
				setError("Set NEXT_PUBLIC_COLLECTION_ADDRESS in .env.local");
				return;
			}
			setLoading(true);
			try {
				const contract = getContract({ client, chain: activeChain, address: COLLECTION_ADDRESS });
				const results = await getNFTs({ contract });
				setNfts(results as unknown as NFT[]);
			} catch (e: any) {
				setError(e?.message || "Failed to load NFTs");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	if (error) return <div className="text-red-600">{error}</div>;
	if (loading) return <div>Loading NFTs...</div>;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
			{nfts.map((nft, idx) => (
				<div key={nft?.metadata?.id ?? `nft-${idx}`} className="rounded-xl border p-4 space-y-3">
					{nft.metadata.image && (
						<MediaRenderer client={client} src={nft.metadata.image} className="w-full h-64 object-cover rounded-lg" />
					)}
					<div className="font-semibold">{nft.metadata.name || `#${nft.metadata.id}`}</div>
					<p className="text-sm text-gray-500">{nft.metadata.description}</p>
				</div>
			))}
		</div>
	);
}

