import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import carpetNFTAbi from '../abis/CarpetNFT.json';
import fakeBTCAbi from '../abis/FAKEBTC.json';
import marketplaceAbi from '../abis/Marketplace.json';
import auctionHouseAbi from '../abis/AuctionHouse.json';
import userRegistryAbi from '../abis/UserRegistry.json';

type Addresses = {
  l1: { registry: string; token: string; nft: string; marketplace: string; bridge: string; };
  l2: { registry: string; token: string; nft: string; auctionHouse: string; };
};

interface Web3ContextType {
  account: string | null;
  network: 'l1' | 'l2';
  provider: BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  addresses: Addresses | null;
  loading: boolean;
  connect: (chain: 'l1' | 'l2') => Promise<void>;
  switchNetwork: (chain: 'l1' | 'l2') => Promise<void>;
  getContract: (name: string, network?: 'l1' | 'l2') => Contract | null;
  showToast: (message: string, type: 'success' | 'error' | 'loading') => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

const L1_CHAIN_ID = 31337;
const L2_CHAIN_ID = 31338;
const L1_RPC = 'http://127.0.0.1:8545';
const L2_RPC = 'http://127.0.0.1:9545';

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<'l1' | 'l2'>('l1');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [addresses, setAddresses] = useState<Addresses | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/deploy-addresses.json')
      .then(r => r.json())
      .then(d => setAddresses(d))
      .catch(() => {
        console.error('Failed to load contract addresses');
      });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const prov = new BrowserProvider((window as any).ethereum);
      setProvider(prov);
      
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      (window as any).ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const switchNetwork = async (chain: 'l1' | 'l2'): Promise<void> => {
    if (!(window as any).ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    const targetChainId = chain === 'l1' ? `0x${L1_CHAIN_ID.toString(16)}` : `0x${L2_CHAIN_ID.toString(16)}`;
    const targetRpc = chain === 'l1' ? L1_RPC : L2_RPC;

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainId,
                chainName: chain === 'l1' ? 'Local L1' : 'Local L2',
                rpcUrls: [targetRpc],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          toast.error('Failed to add network');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  const connect = async (chain: 'l1' | 'l2') => {
    if (!(window as any).ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    setLoading(true);
    try {
      await switchNetwork(chain);
      setNetwork(chain);
      
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const prov = new BrowserProvider((window as any).ethereum);
        const sig = await prov.getSigner();
        setSigner(sig);
        toast.success('Wallet connected');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const getContract = (name: string, net?: 'l1' | 'l2'): Contract | null => {
    if (!addresses || !signer) return null;
    const netChoice = net || network;
    let abi: any;
    let address: string;

    switch (name) {
      case 'CarpetNFT':
        abi = carpetNFTAbi;
        address = addresses[netChoice].nft;
        break;
      case 'FAKEBTC':
        abi = fakeBTCAbi;
        address = addresses[netChoice].token;
        break;
      case 'Marketplace':
        abi = marketplaceAbi;
        address = addresses.l1.marketplace;
        break;
      case 'AuctionHouse':
        abi = auctionHouseAbi;
        address = addresses.l2.auctionHouse;
        break;
      case 'UserRegistry':
        abi = userRegistryAbi;
        address = addresses[netChoice].registry;
        break;
      default:
        return null;
    }

    return new Contract(address, abi, signer);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'loading') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.loading(message);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        network,
        provider,
        signer,
        addresses,
        loading,
        connect,
        switchNetwork,
        getContract,
        showToast,
      }}
    >
      {children}
      <Toaster position="top-right" />
    </Web3Context.Provider>
  );
};

