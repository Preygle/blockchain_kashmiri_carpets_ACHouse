"use client";
import { ReactNode } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { activeChain, client } from "@/lib/thirdwebClient";

export default function Providers({ children }: { children: ReactNode }) {
	return <ThirdwebProvider client={client} activeChain={activeChain}>{children}</ThirdwebProvider>;
}

