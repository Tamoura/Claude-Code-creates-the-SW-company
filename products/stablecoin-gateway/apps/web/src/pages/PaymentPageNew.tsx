/**
 * Production Payment Page with Real Wallet Integration
 *
 * Features:
 * - MetaMask + WalletConnect support via wagmi
 * - Real ERC-20 token transfers
 * - Network switching
 * - Balance validation
 * - Error handling
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { apiClient } from '../lib/api-client';
import { TOKEN_ADDRESSES, NETWORK_IDS, ERC20_ABI } from '../lib/wagmi-config';
import type { PaymentSession } from '../lib/api-client';

export default function PaymentPageNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // State
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get required chain ID for this payment
  const requiredChainId = payment ? NETWORK_IDS[payment.network] : undefined;
  const isCorrectNetwork = chainId === requiredChainId;

  // Get token contract address
  const tokenAddress = payment && chainId
    ? TOKEN_ADDRESSES[payment.token][chainId as keyof typeof TOKEN_ADDRESSES.USDC]
    : undefined;

  // Get wallet balance (for ERC-20 tokens, we need to specify the token address)
  const balanceParams = tokenAddress
    ? { address, token: tokenAddress as `0x${string}` }
    : { address };
  const { data: balance } = useBalance(balanceParams as any);

  // Smart contract write
  const { writeContract, data: writeData, isPending: isWriting } = useWriteContract();

  // Transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Load payment session
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      apiClient
        .getPaymentSession(id)
        .then(setPayment)
        .catch((err) => {
          console.error('Failed to load payment:', err);
          setError('Payment not found or has expired');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  // Redirect to status page when transaction confirmed
  useEffect(() => {
    if (isConfirmed && id) {
      navigate(`/status/${id}`);
    }
  }, [isConfirmed, id, navigate]);

  const handleConnectWallet = (connectorIndex: number) => {
    setError(null);
    connect({ connector: connectors[connectorIndex] });
  };

  const handleSwitchNetwork = () => {
    if (requiredChainId) {
      switchChain({ chainId: requiredChainId });
    }
  };

  const handlePay = async () => {
    if (!payment || !address || !tokenAddress) {
      setError('Missing required information');
      return;
    }

    setError(null);

    try {
      // Prepare ERC-20 transfer
      const amountInSmallestUnit = parseUnits(payment.amount.toString(), 6); // USDC/USDT have 6 decimals

      // Execute transfer
      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [payment.merchant_address as `0x${string}`, amountInSmallestUnit],
      });

      // Note: writeContract doesn't return a hash immediately, it's in writeData
      // The transaction monitoring is handled by useWaitForTransactionReceipt
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Payment not found
  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This payment link is invalid or has expired.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const fee = payment.amount * 0.005;
  const merchantReceives = payment.amount - fee;

  // Check if user has sufficient balance
  const hasSufficientBalance =
    balance && parseFloat(formatUnits(balance.value, balance.decimals)) >= payment.amount;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Payment Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h1>

          {payment.description && (
            <p className="text-gray-600 mb-4">{payment.description}</p>
          )}

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-600">Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                ${payment.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Fee (0.5%)</span>
              <span className="text-gray-700">-${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200">
              <span className="text-gray-600">Merchant receives</span>
              <span className="font-semibold text-green-600">
                ${merchantReceives.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Network</span>
              <span className="capitalize">{payment.network}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Token</span>
              <span>{payment.token}</span>
            </div>
          </div>

          {/* Wallet Connection */}
          {!isConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  Connect your wallet to complete this payment
                </p>
              </div>

              <button
                onClick={() => handleConnectWallet(0)}
                disabled={isConnecting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>

              <button
                onClick={() => handleConnectWallet(1)}
                disabled={isConnecting}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isConnecting ? 'Connecting...' : 'Connect Mobile Wallet'}
              </button>
            </div>
          ) : !isCorrectNetwork ? (
            /* Wrong Network */
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Wrong Network
                </p>
                <p className="text-xs text-yellow-700">
                  This payment requires {payment.network}. Please switch networks.
                </p>
              </div>

              <button
                onClick={handleSwitchNetwork}
                className="w-full bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                Switch to {payment.network}
              </button>

              <button
                onClick={() => disconnect()}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            /* Connected & Correct Network */
            <div className="space-y-4">
              {/* Wallet Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Wallet Connected</p>
                    <p className="text-xs text-green-700 mt-1 font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-700">Balance</p>
                    <p className="text-sm font-semibold text-green-900">
                      {balance ? formatUnits(balance.value, balance.decimals) : '0'} {payment.token}
                    </p>
                  </div>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {!hasSufficientBalance && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Insufficient {payment.token} Balance
                  </p>
                  <p className="text-xs text-red-700">
                    You need at least {payment.amount} {payment.token} to complete this payment.
                  </p>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={isWriting || isConfirming || !hasSufficientBalance}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isWriting || isConfirming ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  `Pay ${payment.amount} ${payment.token}`
                )}
              </button>

              <button
                onClick={() => disconnect()}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>Secured by blockchain technology</p>
          <p className="mt-1">
            <a
              href="https://gateway.io/security"
              className="text-blue-600 hover:underline"
            >
              Learn about our security
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
