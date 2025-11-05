import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, User, Clock, ShoppingCart, Gavel } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { ethers } from 'ethers';

interface CarpetMetadata {
  name: string;
  description: string;
  image: string;
  origin: string;
  producer: string;
  certificateId: string;
  dimensions: string;
  weave?: string;
}

export const CarpetDetail: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { account, network, showToast } = useWeb3();
  const { getNftContract, getMarketplaceContract, getAuctionContract, getTokenContract } = useContracts();
  const [metadata, setMetadata] = useState<CarpetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [minBid, setMinBid] = useState('');
  const [listing, setListing] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!tokenId) return;

      try {
        const res = await fetch(`/metadata/carpet${tokenId}.json`);
        const data: CarpetMetadata = await res.json();
        setMetadata({
          ...data,
          image: data.image.startsWith('/') ? data.image : `/images/${data.image}`,
        });
      } catch (error) {
        console.error('Failed to load metadata:', error);
        showToast('Failed to load carpet details', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [tokenId]);

  const handleListForSale = async () => {
    if (!account || !tokenId || !listPrice) return;

    const nftContract = getNftContract('l1');
    const marketplaceContract = getMarketplaceContract();
    if (!nftContract || !marketplaceContract) {
      showToast('Contract not available', 'error');
      return;
    }

    setListing(true);
    showToast('Listing carpet for sale...', 'loading');

    try {
      const price = ethers.parseUnits(listPrice, 18);
      const addresses = await fetch('/deploy-addresses.json').then(r => r.json());
      
      await (await nftContract.setApprovalForAll(addresses.l1.marketplace, true)).wait();
      const tx = await marketplaceContract.listForSale(Number(tokenId), price, addresses.l1.nft, addresses.l1.token);
      showToast('Transaction submitted, waiting for confirmation...', 'loading');
      await tx.wait();
      showToast('Carpet listed for sale!', 'success');
      setShowListModal(false);
      setListPrice('');
    } catch (error: any) {
      console.error('List error:', error);
      showToast(error.message || 'Failed to list carpet', 'error');
    } finally {
      setListing(false);
    }
  };

  const handleCreateAuction = async () => {
    if (!account || !tokenId || !minBid) return;

    const nftContract = getNftContract('l2');
    const auctionContract = getAuctionContract();
    if (!nftContract || !auctionContract) {
      showToast('Contract not available', 'error');
      return;
    }

    setListing(true);
    showToast('Creating auction...', 'loading');

    try {
      const bid = ethers.parseUnits(minBid, 18);
      const addresses = await fetch('/deploy-addresses.json').then(r => r.json());
      
      await (await nftContract.setApprovalForAll(addresses.l2.auctionHouse, true)).wait();
      const tx = await auctionContract.createAuction(
        Number(tokenId),
        addresses.l2.nft,
        bid,
        120,
        account,
        addresses.l2.token
      );
      showToast('Transaction submitted, waiting for confirmation...', 'loading');
      await tx.wait();
      showToast('Auction created!', 'success');
      setShowAuctionModal(false);
      setMinBid('');
    } catch (error: any) {
      console.error('Auction error:', error);
      showToast(error.message || 'Failed to create auction', 'error');
    } finally {
      setListing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Carpet not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-900 mb-6 flex items-center space-x-2"
        >
          <span>← Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="aspect-square bg-gray-100">
              <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{metadata.name}</h1>
            <p className="text-gray-600 mb-6">{metadata.description}</p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Producer</p>
                  <p className="font-semibold text-gray-900">{metadata.producer}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Origin</p>
                  <p className="font-semibold text-gray-900">{metadata.origin}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Certificate ID</p>
                  <p className="font-semibold text-gray-900">{metadata.certificateId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Dimensions</p>
                  <p className="font-semibold text-gray-900">{metadata.dimensions}</p>
                </div>
              </div>
            </div>

            {account && (
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowListModal(true)}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>List for Direct Sale (L1)</span>
                </button>
                <button
                  onClick={() => setShowAuctionModal(true)}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Gavel className="w-5 h-5" />
                  <span>Start Auction (L2)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showListModal}
        onClose={() => {
          setShowListModal(false);
          setListPrice('');
        }}
        title="List for Direct Sale"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (FAKEBTC)</label>
            <input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setShowListModal(false);
                setListPrice('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleListForSale}
              disabled={listing || !listPrice}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {listing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Listing...</span>
                </>
              ) : (
                <span>List for Sale</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAuctionModal}
        onClose={() => {
          setShowAuctionModal(false);
          setMinBid('');
        }}
        title="Create Auction"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Bid (FAKEBTC)</label>
            <input
              type="number"
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
              placeholder="50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Auction duration: 2 minutes</p>
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setShowAuctionModal(false);
                setMinBid('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAuction}
              disabled={listing || !minBid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {listing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Auction</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

