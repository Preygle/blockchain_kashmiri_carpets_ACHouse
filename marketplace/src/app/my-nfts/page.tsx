"use client";
import { useEffect, useMemo, useState } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { client, activeChain, COLLECTION_ADDRESS } from "@/lib/thirdwebClient";
import { useActiveAccount, useSendTransaction, MediaRenderer } from "thirdweb/react";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";

export default function MyNftsPage() {
	const account = useActiveAccount();
	const { mutate: sendTx, isPending } = useSendTransaction();
	const [nfts, setNfts] = useState<any[]>([]);
	const [status, setStatus] = useState("");
	const [showContactForm, setShowContactForm] = useState<Record<string, boolean>>({});
	const [contactData, setContactData] = useState<Record<string, { name: string; phone: string; address: string }>>({});

	function getTokenId(nft: any): string | null {
		// thirdweb returns token id in various formats - check all possible locations
		if (nft?.id !== undefined && nft.id !== null) return String(nft.id);
		if (nft?.tokenId !== undefined && nft.tokenId !== null) return String(nft.tokenId);
		if (nft?.metadata?.id !== undefined && nft.metadata.id !== null) return String(nft.metadata.id);
		// Check if it's a direct property
		if (typeof nft === 'string') return nft;
		// Last resort: check all string/number properties
		for (const key in nft) {
			if (key.toLowerCase().includes('token') || key.toLowerCase().includes('id')) {
				const value = nft[key];
				if (value !== undefined && value !== null && (typeof value === 'string' || typeof value === 'number')) {
					return String(value);
				}
			}
		}
		return null;
	}

	const collection = useMemo(() => {
		if (!COLLECTION_ADDRESS) return null;
		return getContract({ client, chain: activeChain, address: COLLECTION_ADDRESS });
	}, []);

	useEffect(() => {
		async function load() {
			if (!account || !collection) {
				console.log("Missing account or collection:", { account: !!account, collection: !!collection, COLLECTION_ADDRESS });
				return;
			}
			try {
				console.log("Loading NFTs for address:", account.address);
				const owned = await getOwnedNFTs({ contract: collection, owner: account.address });
				console.log("Loaded NFTs:", owned);
				console.log("NFTs count:", owned?.length || 0);
				if (Array.isArray(owned)) {
					setNfts(owned);
				} else if (owned) {
					setNfts([owned]);
				} else {
					setNfts([]);
				}
			} catch (e: any) {
				console.error("Error loading NFTs:", e);
				setStatus(`Error loading NFTs: ${e?.message || "Unknown error"}`);
				setNfts([]);
			}
		}
		load();
	}, [account, collection]);

	const onBurn = async (tokenId: string) => {
		if (!account) {
			setStatus("Connect your wallet first");
			return;
		}
		if (!COLLECTION_ADDRESS) {
			setStatus("Set NEXT_PUBLIC_COLLECTION_ADDRESS");
			return;
		}
		if (!confirm(`Are you sure you want to burn NFT #${tokenId}? This action cannot be undone.`)) {
			return;
		}
		try {
			setStatus("Burning NFT...");
			const collection = getContract({ client, chain: activeChain, address: COLLECTION_ADDRESS });
			const transaction = prepareContractCall({
				contract: collection,
				method: "function burn(uint256 tokenId)",
				params: [BigInt(tokenId)],
			});
			sendTx(transaction, {
				onSuccess: () => {
					setStatus("NFT burned successfully!");
					// Reload NFTs after burn
					setTimeout(() => {
						if (account && collection) {
							getOwnedNFTs({ contract: collection, owner: account.address }).then((owned) => {
								setNfts(owned as any[]);
							}).catch((e) => console.error("Error reloading NFTs:", e));
						}
					}, 2000);
				},
				onError: (e: any) => {
					console.error("Burn error:", e);
					setStatus(`Burn failed: ${e?.message || e?.toString() || "Unknown error"}`);
				},
			});
		} catch (e: any) {
			console.error("Burn error:", e);
			setStatus(`Error: ${e?.message || e?.toString() || "Failed to burn"}`);
		}
	};

	const onSubmitContact = (tokenId: string, mapKey: string) => {
		const data = contactData[mapKey];
		if (!data || !data.name || !data.phone || !data.address) {
			setStatus("Please fill in all fields (name, phone, and address)");
			return;
		}
		// For now, just show success message (future: send to third party API)
		setStatus(`Contact information submitted successfully for NFT #${tokenId}! Name: ${data.name}, Phone: ${data.phone}, Address: ${data.address}`);
		setShowContactForm((prev) => ({ ...prev, [mapKey]: false }));
		// Clear the form after submission
		setContactData((prev) => ({ ...prev, [mapKey]: { name: "", phone: "", address: "" } }));
	};

	const handleRefresh = async () => {
		if (!account || !collection) return;
		try {
			setStatus("Refreshing NFTs...");
			const owned = await getOwnedNFTs({ contract: collection, owner: account.address });
			console.log("Refreshed NFTs:", owned);
			console.log("NFTs count:", owned?.length || 0);
			if (Array.isArray(owned)) {
				setNfts(owned);
			} else if (owned) {
				setNfts([owned]);
			} else {
				setNfts([]);
			}
			setStatus(`Loaded ${Array.isArray(owned) ? owned.length : owned ? 1 : 0} NFT(s)`);
		} catch (e: any) {
			console.error("Error refreshing NFTs:", e);
			setStatus(`Error: ${e?.message || "Unknown error"}`);
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">My NFTs (Sepolia) - {nfts.length} found</h1>
				{account && (
					<button
						className="px-4 py-2 rounded-md bg-blue-600 text-white"
						onClick={handleRefresh}
					>
						Refresh
					</button>
				)}
			</div>
			{!account && <div>Connect your wallet to view your NFTs.</div>}
			{nfts.length === 0 && account && (
				<div className="p-4 text-gray-600">No NFTs found. Check console for details. Click Refresh to reload.</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
				{nfts.map((nft: any, idx: number) => {
					const tokenId = getTokenId(nft);
					const key = `${COLLECTION_ADDRESS}-${tokenId ?? idx}-${nft?.metadata?.name ?? ""}`;
					const mapKey = tokenId ?? `idx-${idx}`;
					console.log(`NFT ${idx}:`, { tokenId, nft, mapKey });
					return (
						<div key={key} className="rounded-xl border p-4 space-y-3">
							{nft.metadata?.image && (
								<MediaRenderer client={client} src={nft.metadata.image} className="w-full h-64 object-cover rounded-lg" />
							)}
							<div className="font-medium">{nft.metadata?.name || (tokenId ? `#${tokenId}` : `NFT ${idx}`)}</div>
							{!tokenId && (
								<div className="text-xs text-red-600">Warning: Token ID not found. Check console.</div>
							)}
							
							{/* Contact Form */}
							{showContactForm[mapKey] ? (
								<div className="space-y-2 border rounded-md p-3 bg-black text-white">
									<h3 className="text-sm font-medium mb-2 text-white">Contact Information</h3>
									<input
										className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-black text-white placeholder-gray-400"
										placeholder="Name"
										value={contactData[mapKey]?.name ?? ""}
										onChange={(e) => setContactData((prev) => ({ ...prev, [mapKey]: { ...prev[mapKey], name: e.target.value, phone: prev[mapKey]?.phone ?? "", address: prev[mapKey]?.address ?? "" } }))}
									/>
									<input
										className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-black text-white placeholder-gray-400"
										placeholder="Phone Number"
										value={contactData[mapKey]?.phone ?? ""}
										onChange={(e) => setContactData((prev) => ({ ...prev, [mapKey]: { ...prev[mapKey], name: prev[mapKey]?.name ?? "", phone: e.target.value, address: prev[mapKey]?.address ?? "" } }))}
									/>
									<textarea
										className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-black text-white placeholder-gray-400"
										placeholder="Address"
										rows={2}
										value={contactData[mapKey]?.address ?? ""}
										onChange={(e) => setContactData((prev) => ({ ...prev, [mapKey]: { ...prev[mapKey], name: prev[mapKey]?.name ?? "", phone: prev[mapKey]?.phone ?? "", address: e.target.value } }))}
									/>
									<div className="flex gap-2">
										<button
											className="px-3 py-2 rounded-md bg-green-600 text-white text-sm"
											onClick={() => tokenId && onSubmitContact(tokenId, mapKey)}
										>
											Submit
										</button>
										<button
											className="px-3 py-2 rounded-md bg-gray-600 text-white text-sm"
											onClick={() => setShowContactForm((prev) => ({ ...prev, [mapKey]: false }))}
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div className="flex gap-2">
									<button
										className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex-1"
										onClick={() => setShowContactForm((prev) => ({ ...prev, [mapKey]: true }))}
									>
										Contact
									</button>
									<button
										disabled={isPending}
										className={`px-3 py-2 rounded-md text-white text-sm ${
											tokenId ? "bg-red-600 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
										} disabled:opacity-50`}
										onClick={() => {
											if (tokenId) {
												onBurn(tokenId);
											} else {
												setStatus("Cannot burn: Token ID not found. Please check the console for NFT details.");
												console.log("NFT data:", nft);
											}
										}}
									>
										Burn
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
			{status && (
				<div className={`text-sm p-3 rounded-md ${
					status.includes("successfully") || status.includes("submitted") 
						? "bg-green-100 text-green-800" 
						: status.includes("Error") || status.includes("failed") 
						? "bg-red-100 text-red-800" 
						: "bg-blue-100 text-blue-800"
				}`}>
					{status}
				</div>
			)}
		</div>
	);
}

