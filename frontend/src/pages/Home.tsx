import React, { useState, useEffect } from 'react';
import { CarpetCard } from '../components/CarpetCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import { ethers } from 'ethers';

interface CarpetMetadata {
  name: string;
  description: string;
  image: string;
  origin: string;
  producer: string;
  certificateId: string;
  dimensions: string;
}

const SAMPLE_CARPETS = [1, 2, 3, 4, 5, 6];

export const Home: React.FC = () => {
  const { account, network, addresses } = useWeb3();
  const { getNftContract } = useContracts();
  const [carpets, setCarpets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCarpets = async () => {
      if (!addresses) {
        setLoading(false);
        return;
      }

      try {
        const nftContract = getNftContract('l1');
        if (!nftContract) {
          setLoading(false);
          return;
        }

        const carpetData = await Promise.all(
          SAMPLE_CARPETS.map(async (i) => {
            try {
              const metadataPath = `/metadata/carpet${i}.json`;
              const metadataRes = await fetch(metadataPath);
              const metadata: CarpetMetadata = await metadataRes.json();
              
              return {
                tokenId: i,
                ...metadata,
                image: metadata.image.startsWith('/') ? metadata.image : `/images/${metadata.image}`,
                status: 'owned' as const,
              };
            } catch (error) {
              console.error(`Failed to load carpet ${i}:`, error);
              return null;
            }
          })
        );

        setCarpets(carpetData.filter(Boolean));
      } catch (error) {
        console.error('Failed to load carpets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCarpets();
  }, [addresses, getNftContract]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kashmiri Carpets Marketplace</h1>
          <p className="text-gray-600">Discover authentic handcrafted carpets from Kashmir</p>
        </div>

        {carpets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No carpets available yet. Mint your first carpet!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {carpets.map((carpet) => (
              <CarpetCard
                key={carpet.tokenId}
                tokenId={carpet.tokenId}
                image={carpet.image}
                name={carpet.name}
                producer={carpet.producer}
                origin={carpet.origin}
                status={carpet.status}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

