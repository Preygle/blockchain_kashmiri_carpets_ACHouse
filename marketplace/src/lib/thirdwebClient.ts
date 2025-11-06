import { createThirdwebClient, defineChain } from "thirdweb";
import { sepolia } from "thirdweb/chains";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!clientId) {
	console.warn(
		"NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Add it to your .env.local."
	);
}

export const client = createThirdwebClient({ clientId: clientId ?? "" });

export const activeChain = sepolia satisfies ReturnType<typeof defineChain>;

export const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || "";
export const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "";

