"use client";
import { useEffect, useState, useMemo } from "react";
import { client, activeChain, MARKETPLACE_ADDRESS } from "@/lib/thirdwebClient";
import { getContract, prepareContractCall } from "thirdweb";
import { toWei } from "thirdweb/utils";
import { MediaRenderer, useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { getNFT } from "thirdweb/extensions/erc721";

type Auction = any;

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
	// Preserve leading zeros but remove trailing zeros
	let decimals = remainderStr.substring(0, 7);
	
	// Remove trailing zeros but preserve leading zeros
	// This ensures 0.001 shows as "0.001" not "0.0010000"
	decimals = decimals.replace(/0+$/, "");
	// If all were zeros, keep at least one zero
	if (decimals === "") {
		decimals = "0";
	}
	
	return `${quotient}.${decimals}`;
}

export default function AuctionsPage() {
	const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
	const [status, setStatus] = useState("");
	const [nftMetadata, setNftMetadata] = useState<Record<string, any>>({});
	const [winningBids, setWinningBids] = useState<Record<string, { bidder: string; currency: string; bidAmount: string } | null>>({});
    const account = useActiveAccount();
    const { mutate: sendTx, isPending } = useSendTransaction();

	const marketplace = useMemo(() => {
		if (!MARKETPLACE_ADDRESS) return null;
		return getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS });
	}, []);

	// Get total auctions count first
	const { data: totalAuctions } = useReadContract({
		contract: marketplace!,
		method: "function totalAuctions() view returns (uint256)",
		params: [],
		queryOptions: {
			enabled: !!marketplace,
		},
	});

	const total = totalAuctions ? Number(totalAuctions) : 0;
	const endId = total > 0 ? BigInt(Math.max(0, total - 1)) : BigInt(0);

	// Get all valid auctions (active ones)
	const { data: auctionsData, isPending: isReading, error: readError } = useReadContract({
		contract: marketplace!,
		method:
			"function getAllValidAuctions(uint256 _startId, uint256 _endId) view returns ((uint256 auctionId, uint256 tokenId, uint256 quantity, uint256 minimumBidAmount, uint256 buyoutBidAmount, uint64 timeBufferInSeconds, uint64 bidBufferBps, uint64 startTimestamp, uint64 endTimestamp, address auctionCreator, address assetContract, address currency, uint8 tokenType, uint8 status)[] _validAuctions)",
		params: [BigInt(0), endId],
		queryOptions: {
			enabled: !!marketplace && total > 0,
		},
	});

	const auctions = (auctionsData as any[]) || [];

	// Log auction data for debugging
	useEffect(() => {
		if (auctions && auctions.length > 0) {
			console.log("=== AUCTION DATA ===");
			auctions.forEach((auction: any, idx: number) => {
				const auctionId = auction.auctionId ?? auction[0] ?? idx;
				const tokenId = auction.tokenId ?? auction[1] ?? "";
				const quantity = auction.quantity ?? auction[2] ?? "0";
				const minimumBidAmount = auction.minimumBidAmount ?? auction[3] ?? "0";
				const buyoutBidAmount = auction.buyoutBidAmount ?? auction[4] ?? "0";
				const assetContract = auction.assetContract ?? auction[10] ?? "";
				const currency = auction.currency ?? auction[11] ?? "";
				const auctionCreator = auction.auctionCreator ?? auction[9] ?? "";
				const startTimestamp = auction.startTimestamp ?? auction[7] ?? "0";
				const endTimestamp = auction.endTimestamp ?? auction[8] ?? "0";
				const status = auction.status ?? auction[13] ?? "0";
				
				console.log({
					auctionId: String(auctionId),
					buyoutPricePerToken: fromWei(BigInt(String(buyoutBidAmount))),
					reservePricePerToken: fromWei(BigInt(String(minimumBidAmount))),
					minimumBidAmount: fromWei(BigInt(String(minimumBidAmount))),
					buyoutBidAmount: fromWei(BigInt(String(buyoutBidAmount))),
					quantity: String(quantity),
					currency: String(currency),
					assetContract: String(assetContract),
					tokenId: String(tokenId),
					auctionCreator: String(auctionCreator),
					startTimestamp: String(startTimestamp),
					endTimestamp: String(endTimestamp),
					status: String(status),
					rawAuction: auction,
				});
			});
			console.log("=== END AUCTION DATA ===");
		}
	}, [auctions]);

	// Fetch NFT metadata and winning bids for each auction
	useEffect(() => {
		async function loadAuctionDetails() {
			if (!auctions || auctions.length === 0) return;
			
			const metadataPromises: Promise<void>[] = [];
			const bidPromises: Promise<void>[] = [];

			auctions.forEach((auction: any) => {
				const auctionId = String(auction.auctionId ?? auction[0] ?? "");
				const assetContract = auction.assetContract ?? auction[10] ?? "";
				const tokenId = auction.tokenId ?? auction[1] ?? "";

				if (assetContract && tokenId) {
					// Fetch NFT metadata
					metadataPromises.push(
						(async () => {
							try {
								const nftContract = getContract({ client, chain: activeChain, address: assetContract });
								const nft = await getNFT({ contract: nftContract, tokenId: BigInt(tokenId) });
								setNftMetadata((prev) => ({ ...prev, [auctionId]: nft }));
							} catch (e) {
								console.error(`Error fetching NFT for auction ${auctionId}:`, e);
							}
						})()
					);

					// Fetch winning bid using thirdweb API
					bidPromises.push(
						(async () => {
							try {
								const response = await fetch("https://api.thirdweb.com/v1/contracts/read", {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										calls: [
											{
												contractAddress: MARKETPLACE_ADDRESS,
												method:
													"function getWinningBid(uint256 _auctionId) view returns (address _bidder, address _currency, uint256 _bidAmount)",
												params: [auctionId],
											},
										],
										chainId: 11155111,
									}),
								});
								const data = await response.json();
								if (data && data.result && data.result[0] && data.result[0].result) {
									const bidData = data.result[0].result;
									setWinningBids((prev) => ({
										...prev,
										[auctionId]: {
											bidder: bidData[0] || bidData._bidder || "",
											currency: bidData[1] || bidData._currency || "",
											bidAmount: String(bidData[2] || bidData._bidAmount || "0"),
										},
									}));
								} else {
									// No winning bid yet
									setWinningBids((prev) => ({ ...prev, [auctionId]: null }));
								}
							} catch (e) {
								console.error(`Error fetching winning bid for auction ${auctionId}:`, e);
								setWinningBids((prev) => ({ ...prev, [auctionId]: null }));
							}
						})()
					);
				}
			});

			await Promise.all([...metadataPromises, ...bidPromises]);
		}

		loadAuctionDetails();
	}, [auctions]);

	const onBid = async (auctionId: string) => {
		if (!account) {
			setStatus("Connect your wallet first");
			return;
		}
		const bidAmount = bidAmounts[auctionId];
		if (!bidAmount || isNaN(Number(bidAmount))) {
			setStatus("Enter a valid bid amount");
			return;
		}
		
		// Convert bid amount to wei first
		const bidAmountWei = toWei(bidAmount);
		
		// Get auction data from cached auctions array
		const auction = auctions.find((a: any) => String(a.auctionId ?? a[0] ?? "") === auctionId);
		if (!auction) {
			setStatus("Auction not found in cached data");
			return;
		}
		
		// Extract values properly (handle both object and tuple formats, and BigInt)
		const buyoutBidAmountRaw = auction.buyoutBidAmount ?? auction[4];
		const minimumBidAmountRaw = auction.minimumBidAmount ?? auction[3];
		
		// Convert to BigInt properly
		let buyoutBigInt: bigint;
		if (buyoutBidAmountRaw === undefined || buyoutBidAmountRaw === null) {
			buyoutBigInt = BigInt(0);
		} else if (typeof buyoutBidAmountRaw === "bigint") {
			buyoutBigInt = buyoutBidAmountRaw;
		} else {
			buyoutBigInt = BigInt(String(buyoutBidAmountRaw));
		}
		
		let minimumBigInt: bigint;
		if (minimumBidAmountRaw === undefined || minimumBidAmountRaw === null) {
			minimumBigInt = BigInt(0);
		} else if (typeof minimumBidAmountRaw === "bigint") {
			minimumBigInt = minimumBidAmountRaw;
		} else {
			minimumBigInt = BigInt(String(minimumBidAmountRaw));
		}
		
		// Get current winning bid from cached data
		const winningBid = winningBids[auctionId];
		let currentWinningBidBigInt = BigInt(0);
		if (winningBid && winningBid.bidAmount && winningBid.bidAmount !== "0") {
			currentWinningBidBigInt = BigInt(String(winningBid.bidAmount));
		}
		
		// Debug logging
		console.log("Bid validation:", {
			auctionId,
			bidAmount,
			bidAmountWei: bidAmountWei.toString(),
			buyoutBigInt: buyoutBigInt.toString(),
			buyoutEth: fromWei(buyoutBigInt),
			minimumBigInt: minimumBigInt.toString(),
			minEth: fromWei(minimumBigInt),
			currentWinningBid: currentWinningBidBigInt.toString(),
			currentWinningBidEth: fromWei(currentWinningBidBigInt),
			rawAuction: auction,
		});
		
		// Determine the minimum required bid (higher of minimum bid or current winning bid)
		const requiredBidBigInt = currentWinningBidBigInt > minimumBigInt 
			? currentWinningBidBigInt 
			: minimumBigInt;
		
		// Validate: bid must be at least the required bid
		if (requiredBidBigInt > BigInt(0) && bidAmountWei < requiredBidBigInt) {
			const requiredEth = fromWei(requiredBidBigInt);
			if (currentWinningBidBigInt > BigInt(0)) {
				setStatus(`Bid amount (${bidAmount} ETH) must be higher than current winning bid (${requiredEth} ETH)`);
			} else {
				setStatus(`Bid amount (${bidAmount} ETH) is below minimum bid (${requiredEth} ETH)`);
			}
			return;
		}
		
		// Note: We don't validate buyout here - let the contract handle it
		// The contract will reject if bid >= buyout (you should use buyout function instead)
		
		// Place the bid
		try {
			const mp = getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS! });
			const tx = prepareContractCall({
				contract: mp,
				method: "function bidInAuction(uint256 _auctionId, uint256 _bidAmount) payable",
				params: [BigInt(auctionId), bidAmountWei],
				value: bidAmountWei, // Send ETH with the transaction
			});
			sendTx(tx, { 
				onSuccess: () => {
					setStatus("Bid submitted successfully!");
					setBidAmounts((prev) => ({ ...prev, [auctionId]: "" }));
				},
				onError: (e: any) => {
					console.error("Bid error:", e);
					// Show more detailed error message
					const errorMsg = e?.message || e?.toString() || "Unknown error";
					setStatus(`Bid failed: ${errorMsg}`);
				}
			});
		} catch (e: any) {
			console.error("Bid exception:", e);
			setStatus(`Bid failed: ${e?.message || "Failed to bid"}`);
		}
	};

	const onBuyout = async (auctionId: string) => {
		if (!account) {
			setStatus("Connect your wallet first");
			return;
		}
		
		// Get auction data from cached auctions array
		const auction = auctions.find((a: any) => String(a.auctionId ?? a[0] ?? "") === auctionId);
		if (!auction) {
			setStatus("Auction not found in cached data");
			return;
		}
		
		// Extract buyout amount properly
		const buyoutBidAmountRaw = auction.buyoutBidAmount ?? auction[4];
		
		// Convert to BigInt properly
		let buyoutBigInt: bigint;
		if (buyoutBidAmountRaw === undefined || buyoutBidAmountRaw === null) {
			setStatus("No buyout price set for this auction");
			return;
		} else if (typeof buyoutBidAmountRaw === "bigint") {
			buyoutBigInt = buyoutBidAmountRaw;
		} else {
			buyoutBigInt = BigInt(String(buyoutBidAmountRaw));
		}
		
		if (buyoutBigInt === BigInt(0)) {
			setStatus("No buyout price set for this auction");
			return;
		}
		
		try {
			const mp = getContract({ client, chain: activeChain, address: MARKETPLACE_ADDRESS! });
			const tx = prepareContractCall({
				contract: mp,
				method: "function bidInAuction(uint256 _auctionId, uint256 _bidAmount) payable",
				params: [BigInt(auctionId), buyoutBigInt],
				value: buyoutBigInt, // Send ETH with the transaction
			});
			sendTx(tx, { 
				onSuccess: () => {
					setStatus("Buyout submitted successfully! You will receive the NFT once the transaction is confirmed.");
				},
				onError: (e: any) => {
					console.error("Buyout error:", e);
					const errorMsg = e?.message || e?.toString() || "Unknown error";
					setStatus(`Buyout failed: ${errorMsg}`);
				}
			});
		} catch (e: any) {
			console.error("Buyout exception:", e);
			setStatus(`Buyout failed: ${e?.message || "Failed to buyout"}`);
		}
	};

	const formatDuration = (seconds: number): string => {
		if (seconds <= 0) return "Expired";
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (days > 0) return `${days}d ${hours}h ${minutes}m`;
		if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
		if (minutes > 0) return `${minutes}m ${secs}s`;
		return `${secs}s`;
	};

	if (readError) return <div className="p-6 text-red-600">Error: {readError.message || "Failed to load auctions"}</div>;
	if (isReading) return <div className="p-6">Loading auctions...</div>;

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Active Auctions ({auctions.length})</h1>
				<button
					disabled={isReading}
					className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
					onClick={() => window.location.reload()}
				>
					Refresh
				</button>
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
				<div className="p-4 text-gray-600">No auctions found in marketplace.</div>
			)}
			{auctions.length === 0 && total > 0 && !isReading && (
				<div className="p-4 text-gray-600">No active auctions found. Total auctions: {total}</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
				{auctions.map((a: any, idx: number) => {
					const auctionId = String(a.auctionId ?? a[0] ?? idx);
					const tokenId = String(a.tokenId ?? a[1] ?? "N/A");
					
					// Extract values properly (handle both object and tuple formats, and BigInt)
					const minimumBidAmountRaw = a.minimumBidAmount ?? a[3] ?? BigInt(0);
					const buyoutBidAmountRaw = a.buyoutBidAmount ?? a[4] ?? BigInt(0);
					
					// Debug logging
					if (idx === 0) {
						console.log("Auction data:", {
							auctionId,
							rawAuction: a,
							minimumBidAmountRaw,
							buyoutBidAmountRaw,
							minimumBidType: typeof minimumBidAmountRaw,
							buyoutBidType: typeof buyoutBidAmountRaw,
						});
					}
					
					// Convert to BigInt if not already
					const minimumBidAmountBigInt = typeof minimumBidAmountRaw === "bigint" 
						? minimumBidAmountRaw 
						: BigInt(String(minimumBidAmountRaw));
					const buyoutBidAmountBigInt = typeof buyoutBidAmountRaw === "bigint" 
						? buyoutBidAmountRaw 
						: BigInt(String(buyoutBidAmountRaw));
					
					const assetContract = a.assetContract ?? a[10] ?? "N/A";
					const auctionCreator = a.auctionCreator ?? a[9] ?? "N/A";
					const endTimestamp = Number(a.endTimestamp ?? a[8] ?? 0);
					const currentTime = Math.floor(Date.now() / 1000);
					const remainingSeconds = Math.max(0, endTimestamp - currentTime);
					const remainingDuration = formatDuration(remainingSeconds);
					
					const nft = nftMetadata[auctionId];
					const winningBid = winningBids[auctionId];
					// Use winning bid if available, otherwise show "No bids yet"
					const winningBidDisplay = winningBid && winningBid.bidAmount && winningBid.bidAmount !== "0"
						? fromWei(BigInt(winningBid.bidAmount))
						: "No bids yet";

					return (
						<div key={auctionId} className="rounded-xl border p-4 space-y-3">
							{/* NFT Image */}
							{nft?.metadata?.image ? (
								<MediaRenderer client={client} src={nft.metadata.image} className="w-full h-64 object-cover rounded-lg" />
							) : (
								<div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
									<span className="text-gray-400">Loading image...</span>
								</div>
							)}
							
							{/* NFT Name */}
							<div className="font-medium text-lg">
								{nft?.metadata?.name || `NFT #${tokenId}`}
							</div>
							
							{/* NFT Description */}
							{nft?.metadata?.description && (
								<div className="text-sm text-gray-600 line-clamp-2">
									{nft.metadata.description}
								</div>
							)}

							{/* Auction Details */}
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-600">Auction ID:</span>
									<span className="font-medium">{auctionId}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Token ID:</span>
									<span className="font-medium">{tokenId}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">NFT Contract:</span>
									<span className="font-mono text-xs break-all">{String(assetContract).slice(0, 10)}...</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Seller:</span>
									<span className="font-mono text-xs break-all">{String(auctionCreator).slice(0, 10)}...</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Minimum Bid:</span>
									<span className="font-medium">{fromWei(minimumBidAmountBigInt)} ETH</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Winning Bid:</span>
									<span className={`font-medium ${winningBidDisplay === "No bids yet" ? "text-gray-500" : "text-blue-600"}`}>
										{winningBidDisplay === "No bids yet" ? "No bids yet" : `${winningBidDisplay} ETH`}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Time Remaining:</span>
									<span className={`font-medium ${remainingSeconds < 3600 ? "text-red-600" : "text-gray-800"}`}>
										{remainingDuration}
									</span>
								</div>
							</div>

							{/* Bid Input and Buttons */}
							<div className="space-y-2 pt-2 border-t">
								<div className="flex gap-2">
									<input
										className="flex-1 border rounded-md px-3 py-2 text-sm"
										placeholder="Enter bid amount (ETH)"
										value={bidAmounts[auctionId] ?? ""}
										onChange={(e) => setBidAmounts((prev) => ({ ...prev, [auctionId]: e.target.value }))}
									/>
									{buyoutBidAmountBigInt > BigInt(0) && (
										<button
											className="px-3 py-2 rounded-md bg-gray-600 text-white text-sm whitespace-nowrap"
											onClick={() => {
												const buyoutEth = fromWei(buyoutBidAmountBigInt);
												setBidAmounts((prev) => ({ ...prev, [auctionId]: buyoutEth }));
											}}
											title={`Auto-fill buyout price: ${fromWei(buyoutBidAmountBigInt)} ETH`}
										>
											Use Buyout
										</button>
									)}
								</div>
								<div className="flex gap-2">
									<button
										disabled={isPending}
										className="flex-1 px-3 py-2 rounded-md bg-black text-white disabled:opacity-50"
										onClick={() => onBid(auctionId)}
									>
										Place Bid
									</button>
									{buyoutBidAmountBigInt > BigInt(0) && (
										<button
											disabled={isPending}
											className="px-3 py-2 rounded-md bg-green-600 text-white disabled:opacity-50 whitespace-nowrap"
											onClick={() => onBuyout(auctionId)}
											title={`Buyout price: ${fromWei(buyoutBidAmountBigInt)} ETH`}
										>
											Buyout ({fromWei(buyoutBidAmountBigInt)} ETH)
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

