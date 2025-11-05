import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Tag, User } from 'lucide-react';

interface CarpetCardProps {
  tokenId: number;
  image: string;
  name: string;
  producer: string;
  origin: string;
  price?: string;
  status?: 'for-sale' | 'auction' | 'owned';
  auctionEndTime?: number;
}

export const CarpetCard: React.FC<CarpetCardProps> = ({
  tokenId,
  image,
  name,
  producer,
  origin,
  price,
  status = 'owned',
  auctionEndTime,
}) => {
  const [imageError, setImageError] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case 'for-sale':
        return (
          <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            For Sale
          </span>
        );
      case 'auction':
        return (
          <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Auction</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link to={`/carpet/${tokenId}`}>
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 hover:border-primary-300 relative">
        {getStatusBadge()}
        <div className="aspect-square overflow-hidden bg-gray-100">
          {!imageError ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-300 rounded-lg" />
                <p className="text-xs text-gray-500">Image not available</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 truncate">{name}</h3>
          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
            <User className="w-4 h-4" />
            <span className="truncate">{producer}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
            <Tag className="w-4 h-4" />
            <span>{origin}</span>
          </div>
          {price && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Price</span>
              <span className="text-lg font-bold text-primary-600">{price} FAKEBTC</span>
            </div>
          )}
          {auctionEndTime && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Ends in</span>
              <span className="text-sm font-medium text-gray-700">
                {new Date(auctionEndTime * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

