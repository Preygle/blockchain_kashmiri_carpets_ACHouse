"use client";
import { useEffect, useState } from "react";
import { ConnectButton } from "thirdweb/react";
import { client, activeChain } from "@/lib/thirdwebClient";

export function WalletConnect() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;
	return <ConnectButton client={client} chain={activeChain} />;
}

