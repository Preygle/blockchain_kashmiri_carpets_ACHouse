import React, { useState } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';

const CARPET_OPTIONS = [
  { id: 1, name: 'Carpet 1 - Srinagar', image: '/images/img1.jpg' },
  { id: 2, name: 'Carpet 2 - Baramulla', image: '/images/img2.jpg' },
  { id: 3, name: 'Carpet 3 - Anantnag', image: '/images/img3.jpg' },
  { id: 4, name: 'Carpet 4 - Srinagar', image: '/images/img4.jpg' },
  { id: 5, name: 'Carpet 5 - Baramulla', image: '/images/img5.jpg' },
  { id: 6, name: 'Carpet 6 - Anantnag', image: '/images/img6.jpg' },
];

export const Mint: React.FC = () => {
  const { account, network, showToast } = useWeb3();
  const { getNftContract } = useContracts();
  const [selectedCarpet, setSelectedCarpet] = useState<number | null>(null);
  const [minting, setMinting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleMint = async (carpetId: number) => {
    if (!account) {
      showToast('Please connect your wallet', 'error');
      return;
    }

    const nftContract = getNftContract(network);
    if (!nftContract) {
      showToast('Contract not available', 'error');
      return;
    }

    setMinting(true);
    showToast('Minting carpet...', 'loading');

    try {
      const uri = `/metadata/carpet${carpetId}.json`;
      const tx = await nftContract.mint(account, uri);
      showToast('Transaction submitted, waiting for confirmation...', 'loading');
      await tx.wait();
      showToast('Carpet minted successfully!', 'success');
      setShowModal(false);
    } catch (error: any) {
      console.error('Mint error:', error);
      showToast(error.message || 'Failed to mint carpet', 'error');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mint Your Carpet</h1>
            <p className="text-gray-600">Select a carpet design to mint as an NFT on {network.toUpperCase()}</p>
          </div>

          {!account ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Please connect your wallet to mint carpets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CARPET_OPTIONS.map((carpet) => (
                <div
                  key={carpet.id}
                  className="group bg-white rounded-xl border-2 border-gray-200 hover:border-primary-300 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
                  onClick={() => {
                    setSelectedCarpet(carpet.id);
                    setShowModal(true);
                  }}
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={carpet.image}
                      alt={carpet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{carpet.name}</h3>
                    <button className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                      Mint NFT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal && selectedCarpet !== null}
        onClose={() => {
          setShowModal(false);
          setSelectedCarpet(null);
        }}
        title="Confirm Mint"
        size="md"
      >
        {selectedCarpet && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">You are about to mint:</p>
              <p className="font-semibold text-gray-900">{CARPET_OPTIONS[selectedCarpet - 1].name}</p>
              <p className="text-sm text-gray-500 mt-1">Network: {network.toUpperCase()}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedCarpet(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMint(selectedCarpet)}
                disabled={minting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {minting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Minting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Confirm Mint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

