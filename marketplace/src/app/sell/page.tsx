"use client";
import { useState } from "react";
import { client, activeChain, MARKETPLACE_ADDRESS, COLLECTION_ADDRESS } from "@/lib/thirdwebClient";
import { getContract } from "thirdweb";
import { createListing } from "thirdweb/extensions/marketplace";
import { toWei } from "thirdweb/utils";
import { isApprovedForAll, setApprovalForAll } from "thirdweb/extensions/erc721";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

export default function SellPage() {
	const [tokenId, setTokenId] = useState("");
	const [price, setPrice] = useState("");
	const [currency, setCurrency] = useState("native");
	const [status, setStatus] = useState("");
    const account = useActiveAccount();
    const { mutate: sendTx, isPending } = useSendTransaction();

	const onList = async () => {
		if (!MARKETPLACE_ADDRESS || !COLLECTION_ADDRESS) {
			setStatus("Set NEXT_PUBLIC_MARKETPLACE_ADDRESS and NEXT_PUBLIC_COLLECTION_ADDRESS in .env.local");
			return;
		}
		if (!account) {
			setStatus("Connect your wallet first");
			return;
		}
		if (!tokenId || isNaN(Number(tokenId))) {
			setStatus("Enter a valid token ID");
			return;
		}
		if (!price || isNaN(Number(price))) {
			setStatus("Enter a valid price");
			return;
		}
		try {
			setStatus("Submitting...");
			const mp = getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS });
			const collection = getContract({ client, chain: activeChain, address: COLLECTION_ADDRESS });

			const proceedToList = () => {
				const listTx = createListing({
					contract: mp,
					assetContractAddress: COLLECTION_ADDRESS,
					tokenId: BigInt(tokenId),
					pricePerToken: toWei(price),
					currency: currency === "native" ? undefined : currency,
					quantity: 1n,
				});
				sendTx(listTx, { onSuccess: () => setStatus("Listing submitted") });
			};

			const approved = await isApprovedForAll({ contract: collection, owner: account.address, operator: MARKETPLACE_ADDRESS });
			if (!approved) {
				setStatus("Approving marketplace...");
				const approveTx = setApprovalForAll({ contract: collection, operator: MARKETPLACE_ADDRESS, approved: true });
				sendTx(approveTx, { onSuccess: proceedToList, onError: (e) => setStatus(e?.message || "Approval failed") });
			} else {
				proceedToList();
			}
		} catch (e: any) {
			setStatus(e?.message || "Failed to list");
		}
	};

	return (
		<div className="max-w-xl mx-auto p-6 space-y-4">
			<h1 className="text-xl font-semibold">List NFT for Sale</h1>
			<label className="block text-sm">Token ID</label>
			<input className="w-full border rounded-md px-3 py-2" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
			<label className="block text-sm">Price (in native currency)</label>
			<input className="w-full border rounded-md px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} />
			<button disabled={isPending} className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50" onClick={onList}>Create Listing</button>
			{status && <div className="text-sm text-gray-600">{status}</div>}
		</div>
	);
}

