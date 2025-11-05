import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Home, Sparkles, User, Coins } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

export const Header: React.FC = () => {
  const { account, network, connect, loading } = useWeb3();
  const location = useLocation();

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Kashmiri Carpets</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Home
              </Link>
              <Link
                to="/mint"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/mint')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Mint
              </Link>
              <Link
                to="/faucet"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/faucet')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Coins className="w-4 h-4 inline mr-2" />
                Faucet
              </Link>
              <Link
                to="/profile"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {account ? (
              <>
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${network === 'l1' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-xs font-medium text-gray-700 uppercase">{network}</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-primary-50 rounded-lg border border-primary-200">
                  <Wallet className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">{formatAddress(account)}</span>
                </div>
              </>
            ) : (
              <button
                onClick={() => connect(network)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="w-4 h-4" />
                <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

