import React, { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, Wallet, Phone, MapPin } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';

export const Profile: React.FC = () => {
  const { account, network, showToast, switchNetwork } = useWeb3();
  const { getRegistryContract } = useContracts();
  const [registeredL1, setRegisteredL1] = useState(false);
  const [registeredL2, setRegisteredL2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const checkRegistration = async (net: 'l1' | 'l2') => {
    if (!account) return;

    const registryContract = getRegistryContract(net);
    if (!registryContract) return;

    setChecking(true);
    try {
      const isRegistered = await registryContract.isSellerRegistered(account);
      if (net === 'l1') {
        setRegisteredL1(isRegistered);
      } else {
        setRegisteredL2(isRegistered);
      }
    } catch (error) {
      console.error('Failed to check registration:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (account) {
      checkRegistration('l1');
      checkRegistration('l2');
    }
  }, [account]);

  const handleRegister = async (net: 'l1' | 'l2') => {
    if (!account) {
      showToast('Please connect your wallet', 'error');
      return;
    }

    if (!phone || !address) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const registryContract = getRegistryContract(net);
    if (!registryContract) {
      showToast('Contract not available', 'error');
      return;
    }

    setLoading(true);
    showToast(`Registering on ${net.toUpperCase()}...`, 'loading');

    try {
      const tx = await registryContract.registerSeller(phone, address);
      showToast('Transaction submitted, waiting for confirmation...', 'loading');
      await tx.wait();
      showToast(`Registered successfully on ${net.toUpperCase()}!`, 'success');
      setShowRegisterModal(false);
      setPhone('');
      setAddress('');
      await checkRegistration(net);
    } catch (error: any) {
      console.error('Registration error:', error);
      showToast(error.message || 'Failed to register', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Please connect your wallet to view your profile</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-600 mt-1">{account}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-semibold text-gray-900">L1 Registration</span>
                </div>
                {checking ? (
                  <LoadingSpinner size="sm" />
                ) : registeredL1 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {registeredL1 ? 'You are registered as a seller on L1' : 'Not registered on L1'}
              </p>
              {!registeredL1 && (
                <button
                  onClick={async () => {
                    await switchNetwork('l1');
                    setShowRegisterModal(true);
                  }}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Register on L1
                </button>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-semibold text-gray-900">L2 Registration</span>
                </div>
                {checking ? (
                  <LoadingSpinner size="sm" />
                ) : registeredL2 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {registeredL2 ? 'You are registered as a seller on L2' : 'Not registered on L2'}
              </p>
              {!registeredL2 && (
                <button
                  onClick={async () => {
                    await switchNetwork('l2');
                    setShowRegisterModal(true);
                  }}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Register on L2
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setPhone('');
          setAddress('');
        }}
        title="Register as Seller"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9999999999"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Physical Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Srinagar, J&K"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setShowRegisterModal(false);
                setPhone('');
                setAddress('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRegister(network)}
              disabled={loading || !phone || !address}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

