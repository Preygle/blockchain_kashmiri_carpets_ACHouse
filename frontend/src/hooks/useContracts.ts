import { useWeb3 } from '../contexts/Web3Context';
import { Contract } from 'ethers';

export const useContracts = () => {
  const { getContract, network } = useWeb3();

  const getNftContract = (net?: 'l1' | 'l2'): Contract | null => {
    return getContract('CarpetNFT', net);
  };

  const getTokenContract = (net?: 'l1' | 'l2'): Contract | null => {
    return getContract('FAKEBTC', net);
  };

  const getMarketplaceContract = (): Contract | null => {
    return getContract('Marketplace', 'l1');
  };

  const getAuctionContract = (): Contract | null => {
    return getContract('AuctionHouse', 'l2');
  };

  const getRegistryContract = (net?: 'l1' | 'l2'): Contract | null => {
    return getContract('UserRegistry', net);
  };

  return {
    getNftContract,
    getTokenContract,
    getMarketplaceContract,
    getAuctionContract,
    getRegistryContract,
  };
};

