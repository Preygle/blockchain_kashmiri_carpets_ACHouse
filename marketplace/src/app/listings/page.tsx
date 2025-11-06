"use client";
import { useEffect, useState, useMemo } from "react";
import { client, activeChain, MARKETPLACE_ADDRESS } from "@/lib/thirdwebClient";
import { getContract, prepareContractCall, prepareEvent } from "thirdweb";
import { MediaRenderer, useActiveAccount, useSendTransaction, useContractEvents, useReadContract } from "thirdweb/react";
import { buyFromListing } from "thirdweb/extensions/marketplace";
import { getNFT } from "thirdweb/extensions/erc721";

type Listing = any;

// Helper function to convert wei to ETH (up to 7 decimal places, no rounding)
function fromWei(wei: bigint | string): string {
	const weiBigInt = typeof wei === "string" ? BigInt(wei) : wei;
	const divisor = BigInt(10 ** 18);
	const quotient = weiBigInt / divisor;
	const remainder = weiBigInt % divisor;
	
	if (remainder === BigInt(0)) {
		return quotient.toString();
	}
	
	// Format with decimals - pad to 18 digits, then take up to 7 decimal places
	const remainderStr = remainder.toString().padStart(18, "0");
	// Take up to 7 decimal places (no rounding, just truncate)
	let decimals = remainderStr.substring(0, 7);
	
	// Remove trailing zeros but preserve leading zeros
	decimals = decimals.replace(/0+$/, "");
	// If all were zeros, keep at least one zero
	if (decimals === "") {
		decimals = "0";
	}
	
	return `${quotient}.${decimals}`;
}

const cancelledListingEvent = prepareEvent({
	signature: "event CancelledListing(address indexed listingCreator, uint256 indexed listingId)",
});

const newListingEvent = prepareEvent({
	signature: "event NewListing(address indexed listingCreator, uint256 indexed listingId, address indexed assetContract, (uint256 listingId, uint256 tokenId, uint256 quantity, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, address listingCreator, address assetContract, address currency, uint8 tokenType, uint8 status, bool reserved) listing)",
});

export default function ListingsPage() {
	const [status, setStatus] = useState("");
	const [cancelledListingIds, setCancelledListingIds] = useState<Set<string>>(new Set());
	const [nftMetadata, setNftMetadata] = useState<Record<string, any>>({});
	const [expandedListings, setExpandedListings] = useState<Set<string>>(new Set());
    const account = useActiveAccount();
    const { mutate: sendTx, isPending } = useSendTransaction();

	const marketplace = useMemo(() => {
		if (!MARKETPLACE_ADDRESS) return null;
		return getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS });
	}, []);

	// Listen for cancelled and new listings
	const { data: cancelledEvents } = useContractEvents({
		contract: marketplace!,
		events: [cancelledListingEvent],
		enabled: !!marketplace,
	});

	const { data: newListingEvents } = useContractEvents({
		contract: marketplace!,
		events: [newListingEvent],
		enabled: !!marketplace,
	});

	useEffect(() => {
		if (cancelledEvents) {
			const cancelled = new Set<string>();
			cancelledEvents.forEach((event: any) => {
				if (event.args?.listingId) {
					cancelled.add(String(event.args.listingId));
				}
			});
			setCancelledListingIds(cancelled);
		}
	}, [cancelledEvents]);

	// Get total listings count first
	const { data: totalListings } = useReadContract({
		contract: marketplace!,
		method: "function totalListings() view returns (uint256)",
		params: [],
		queryOptions: {
			enabled: !!marketplace,
		},
	});

	const total = totalListings ? Number(totalListings) : 0;
	const endId = total > 0 ? BigInt(Math.max(0, total - 1)) : BigInt(0);

	// Then fetch all listings with valid range
	const { data: listingsData, isPending: isReading, error: readError } = useReadContract({
		contract: marketplace!,
		method:
			"function getAllListings(uint256 _startId, uint256 _endId) view returns ((uint256 listingId, uint256 tokenId, uint256 quantity, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, address listingCreator, address assetContract, address currency, uint8 tokenType, uint8 status, bool reserved)[] _allListings)",
		params: [BigInt(0), endId],
		queryOptions: {
			enabled: !!marketplace && total > 0,
		},
	});

	// Refresh when new listing event is detected
	useEffect(() => {
		if (newListingEvents && newListingEvents.length > 0) {
			console.log("New listing detected, refreshing...");
			// Force a refetch by updating a dependency
			// The useReadContract will automatically refetch when total changes
			// We can also manually trigger a refetch by changing the params slightly
		}
	}, [newListingEvents, totalListings]);

	// Filter to show ONLY active listings (status === 1, not cancelled, not completed)
	const allListings = (listingsData as any[]) || [];
	const activeListings = allListings.filter((l: any) => {
		const listingId = String(l.listingId ?? l[0] ?? "");
		const status = l.status ?? l[10] ?? 0;
		// Only show listings with status 1 (active) and not cancelled
		return status === 1 && !cancelledListingIds.has(listingId);
	});

	// Fetch NFT metadata for each listing
	useEffect(() => {
		async function loadNFTMetadata() {
			if (!activeListings || activeListings.length === 0) return;
			
			const metadataPromises: Promise<void>[] = [];

			activeListings.forEach((listing: any) => {
				const listingId = String(listing.listingId ?? listing[0] ?? "");
				const assetContract = listing.assetContract ?? listing[7] ?? "";
				const tokenId = listing.tokenId ?? listing[1] ?? "";

				if (assetContract && tokenId) {
					// Fetch NFT metadata
					metadataPromises.push(
						(async () => {
							try {
								const nftContract = getContract({ client, chain: activeChain, address: assetContract });
								const nft = await getNFT({ contract: nftContract, tokenId: BigInt(tokenId) });
								setNftMetadata((prev) => ({ ...prev, [listingId]: nft }));
							} catch (e) {
								console.error(`Error fetching NFT for listing ${listingId}:`, e);
							}
						})()
					);
				}
			});

			await Promise.all(metadataPromises);
		}

		loadNFTMetadata();
	}, [activeListings]);

	const onBuy = async (listingId: string | number) => {
		if (!account) {
			alert("Connect your wallet first");
			return;
		}
		try {
			const mp = getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS! });
			const tx = buyFromListing({ 
				contract: mp, 
				listingId: BigInt(listingId), 
				quantity: BigInt(1),
				recipient: account.address
			});
			sendTx(tx, { onSuccess: () => alert("Purchase submitted") });
		} catch (e: any) {
			alert(e?.message || "Failed to buy");
		}
	};

	const onCancel = async (listingId: string) => {
		if (!account || !marketplace) {
			setStatus("Connect your wallet first");
			return;
		}
		try {
			setStatus(`Cancelling listing ${listingId}...`);
			const tx = prepareContractCall({
				contract: marketplace,
				method: "function cancelListing(uint256 _listingId)",
				params: [BigInt(listingId)],
			});
			sendTx(tx, {
				onSuccess: () => {
					setStatus(`Listing ${listingId} cancelled successfully!`);
					setCancelledListingIds((prev) => new Set([...prev, String(listingId)]));
				},
				onError: (e: any) => {
					console.error("Cancel error:", e);
					setStatus(`Cancel failed: ${e?.message || e?.toString() || "Unknown error"}`);
				},
			});
		} catch (e: any) {
			console.error("Cancel error:", e);
			setStatus(`Error: ${e?.message || e?.toString() || "Failed to cancel"}`);
		}
	};

	const onCancelAll = () => {
		if (!account || !marketplace) {
			setStatus("Connect your wallet first");
			return;
		}
		if (activeListings.length === 0) {
			setStatus("No active listings to cancel");
			return;
		}
		if (!confirm(`Are you sure you want to cancel all ${activeListings.length} listings?`)) {
			return;
		}
		setStatus(`Cancelling ${activeListings.length} listings... Please confirm each transaction in your wallet.`);
		// Cancel all listings - user will need to confirm each transaction
		const totalToCancel = activeListings.length;
		activeListings.forEach((l: any) => {
			const listingId = String(l.id ?? l.listingId ?? "");
			if (listingId) {
				const tx = prepareContractCall({
					contract: marketplace,
					method: "function cancelListing(uint256 _listingId)",
					params: [BigInt(listingId)],
				});
				sendTx(tx, {
					onSuccess: () => {
						setCancelledListingIds((prev) => {
							const updated = new Set([...prev, listingId]);
							// Check if all are cancelled
							if (updated.size >= totalToCancel) {
								setStatus("All listings cancelled successfully!");
							}
							return updated;
						});
					},
					onError: (e: any) => {
						console.error(`Error cancelling listing ${listingId}:`, e);
						setStatus(`Error cancelling listing ${listingId}: ${e?.message || "Unknown error"}`);
					},
				});
			}
		});
	};

	if (readError) return <div className="p-6 text-red-600">Error: {readError.message || "Failed to load listings"}</div>;
	if (isReading) return <div className="p-6">Loading listings...</div>;

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Listings ({activeListings.length} active, {total} total)</h1>
				<div className="flex gap-2">
					<button
						disabled={isReading}
						className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
						onClick={() => window.location.reload()}
					>
						Refresh
					</button>
					{activeListings.length > 0 && account && (
						<button
							disabled={isPending}
							className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50"
							onClick={onCancelAll}
						>
							Cancel All Listings
						</button>
					)}
				</div>
			</div>
			{status && (
				<div className={`text-sm p-3 rounded-md ${
					status.includes("successfully") 
						? "bg-green-100 text-green-800" 
						: status.includes("Error") || status.includes("failed") 
						? "bg-red-100 text-red-800" 
						: "bg-blue-100 text-blue-800"
				}`}>
					{status}
				</div>
			)}
			{total === 0 && !isReading && (
				<div className="p-4 text-gray-600">No listings found in marketplace.</div>
			)}
			{activeListings.length === 0 && total > 0 && !isReading && (
				<div className="p-4 text-gray-600">No active listings found. Total listings: {total}, Active: {activeListings.length}</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
				{activeListings.map((l: any, idx: number) => {
					const listingId = String(l.listingId ?? l[0] ?? idx);
					const tokenId = String(l.tokenId ?? l[1] ?? "N/A");
					const pricePerToken = l.pricePerToken ?? l[3] ?? "0";
					const assetContract = l.assetContract ?? l[7] ?? "N/A";
					
					// Extract price properly (handle BigInt)
					const priceBigInt = typeof pricePerToken === "bigint" 
						? pricePerToken 
						: BigInt(String(pricePerToken));
					const priceEth = fromWei(priceBigInt);
					
					// Get NFT metadata
					const nft = nftMetadata[listingId];
					
					return (
						<div key={listingId} className="rounded-xl border p-4 space-y-3">
							{/* NFT Image */}
							{nft?.metadata?.image ? (
								<MediaRenderer client={client} src={nft.metadata.image} className="w-full h-64 object-cover rounded-lg" />
							) : (
								<div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
									<span className="text-gray-400">Loading image...</span>
								</div>
							)}
							
							{/* NFT Name (Title) */}
							<div className="font-medium text-lg">
								{nft?.metadata?.name || `NFT #${tokenId}`}
							</div>
							
							{/* NFT Description */}
							{nft?.metadata?.description && (
								<div className="space-y-2">
									<div className={`text-sm text-gray-600 ${expandedListings.has(listingId) ? '' : 'line-clamp-2'}`}>
										{nft.metadata.description}
									</div>
									{nft.metadata.description.length > 100 && (
										<button
											className="text-xs text-blue-600 hover:text-blue-800 underline"
											onClick={() => {
												setExpandedListings((prev) => {
													const newSet = new Set(prev);
													if (newSet.has(listingId)) {
														newSet.delete(listingId);
													} else {
														newSet.add(listingId);
													}
													return newSet;
												});
											}}
										>
											{expandedListings.has(listingId) ? 'Show Less' : 'Show More'}
										</button>
									)}
								</div>
							)}

							{/* Listing Details */}
							<div className="space-y-2 text-sm pt-2 border-t">
								<div className="flex justify-between">
									<span className="text-gray-600">Price:</span>
									<span className="font-medium text-green-600">{priceEth} ETH</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">NFT Contract:</span>
									<span className="font-mono text-xs break-all">{String(assetContract).slice(0, 10)}...</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Token ID:</span>
									<span className="font-medium">{tokenId}</span>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-2 pt-2 border-t">
								<button 
									disabled={isPending} 
									className="flex-1 px-3 py-2 rounded-md bg-black text-white disabled:opacity-50" 
									onClick={() => onBuy(listingId)}
								>
									Buy
								</button>
								<button 
									disabled={isPending} 
									className="px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-50" 
									onClick={() => onCancel(listingId)}
								>
									Cancel
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

