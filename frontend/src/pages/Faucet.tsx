import React, { useState, useEffect } from 'react';
import { Coins, Wallet, RefreshCw } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ethers } from 'ethers';

export const Faucet: React.FC = () => {
  const { account, network, showToast } = useWeb3();
  const { getTokenContract } = useContracts();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchBalance = async () => {
    if (!account) {
      setBalance('0');
      return;
    }

    const tokenContract = getTokenContract(network);
    if (!tokenContract) return;

    setFetching(true);
    try {
      const bal = await tokenContract.balanceOf(account);
      setBalance(ethers.formatUnits(bal, 18));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [account, network, getTokenContract]);

  const handleFaucet = async () => {
    if (!account) {
      showToast('Please connect your wallet', 'error');
      return;
    }

    const tokenContract = getTokenContract(network);
    if (!tokenContract) {
      showToast('Contract not available', 'error');
      return;
    }

    setLoading(true);
    showToast('Requesting FAKEBTC...', 'loading');

    try {
      const amount = ethers.parseUnits('1000', 18);
      const tx = await tokenContract.faucet(account, amount);
      showToast('Transaction submitted, waiting for confirmation...', 'loading');
      await tx.wait();
      showToast('1000 FAKEBTC received!', 'success');
      await fetchBalance();
    } catch (error: any) {
      console.error('Faucet error:', error);
      showToast(error.message || 'Failed to get FAKEBTC', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FAKEBTC Faucet</h1>
            <p className="text-gray-600">Get free FAKEBTC tokens for testing on {network.toUpperCase()}</p>
          </div>

          {!account ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Please connect your wallet to use the faucet</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Your Balance</span>
                  </div>
                  <button
                    onClick={fetchBalance}
                    disabled={fetching}
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-baseline space-x-2">
                  {fetching ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">{parseFloat(balance).toFixed(2)}</span>
                      <span className="text-lg font-medium text-gray-600">FAKEBTC</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${network === 'l1' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-sm font-medium text-gray-700">Current Network: {network.toUpperCase()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  You will receive 1000 FAKEBTC tokens per request. This is for testing purposes only.
                </p>
              </div>

              <button
                onClick={handleFaucet}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="font-semibold">Requesting...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    <span className="font-semibold">Request 1000 FAKEBTC</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

