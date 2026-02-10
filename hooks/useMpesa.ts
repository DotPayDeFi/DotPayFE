import { useState, useCallback } from 'react';
import { mpesaAPI, DepositData, BuyCryptoData, WithdrawData, PayWithCryptoData, PayBillData, PayTillData, CryptoToMpesaData } from '../lib/mpesa';
import { useApi } from './useApi';

export const useMpesa = () => {
  const depositApi = useApi();
  const buyCryptoApi = useApi();
  const withdrawApi = useApi();
  const payWithCryptoApi = useApi();
  const payBillApi = useApi();
  const payTillApi = useApi();
  const cryptoToMpesaApi = useApi();
  const submitReceiptApi = useApi();
  const transactionStatusApi = useApi();

  // Deposit (buy crypto with M-Pesa)
  const deposit = useCallback(async (data: DepositData) => {
    return depositApi.execute(
      () => mpesaAPI.deposit(data),
      {
        showSuccessToast: true,
        successMessage: 'Deposit initiated successfully!',
      }
    );
  }, [depositApi]);

  // Buy crypto (automatic flow)
  const buyCrypto = useCallback(async (data: BuyCryptoData) => {
    console.log('useMpesa: buyCrypto called with data:', data);
    return buyCryptoApi.execute(
      () => {
        console.log('useMpesa: calling mpesaAPI.buyCrypto');
        return mpesaAPI.buyCrypto(data);
      },
      {
        showSuccessToast: true,
        successMessage: 'Crypto purchase initiated! Check your phone for M-Pesa prompt.',
      }
    );
  }, [buyCryptoApi]);

  // Withdraw to M-Pesa
  const withdraw = useCallback(async (data: WithdrawData) => {
    return withdrawApi.execute(
      () => mpesaAPI.withdraw(data),
      {
        showSuccessToast: true,
        successMessage: 'Withdrawal initiated successfully!',
      }
    );
  }, [withdrawApi]);

  // Pay with crypto (revolutionary feature)
  const payWithCrypto = useCallback(async (data: PayWithCryptoData) => {
    return payWithCryptoApi.execute(
      () => mpesaAPI.payWithCrypto(data),
      {
        showSuccessToast: true,
        successMessage: 'Crypto payment completed successfully!',
      }
    );
  }, [payWithCryptoApi]);

  // Crypto to M-Pesa (Send crypto, recipient gets M-Pesa)
  const cryptoToMpesa = useCallback(async (data: CryptoToMpesaData) => {
    return cryptoToMpesaApi.execute(
      () => mpesaAPI.cryptoToMpesa(data),
      {
        showSuccessToast: true,
        successMessage: 'Crypto to M-Pesa transaction initiated successfully!',
      }
    );
  }, [cryptoToMpesaApi]);

  // Dedicated endpoints
  const payBill = useCallback(async (data: PayBillData) => {
    return payBillApi.execute(
      () => mpesaAPI.payBill(data),
      {
        showSuccessToast: true,
        successMessage: 'Paybill payment initiated',
      }
    );
  }, [payBillApi]);

  const payTill = useCallback(async (data: PayTillData) => {
    return payTillApi.execute(
      () => mpesaAPI.payTill(data),
      {
        showSuccessToast: true,
        successMessage: 'Till payment initiated',
      }
    );
  }, [payTillApi]);

  // Submit M-Pesa receipt
  const submitReceipt = useCallback(async (data: any) => {
    return submitReceiptApi.execute(
      () => mpesaAPI.submitReceipt(data),
      {
        showSuccessToast: true,
        successMessage: 'Receipt verified and crypto transferred!',
      }
    );
  }, [submitReceiptApi]);

  // Get transaction status
  const getTransactionStatus = useCallback(async (transactionId: string) => {
    return transactionStatusApi.execute(
      () => mpesaAPI.getTransactionStatus(transactionId),
      {
        showErrorToast: true,
      }
    );
  }, [transactionStatusApi]);

  return {
    // Deposit
    deposit,
    depositLoading: depositApi.loading,
    depositError: depositApi.error,

    // Buy crypto
    buyCrypto,
    buyCryptoLoading: buyCryptoApi.loading,
    buyCryptoError: buyCryptoApi.error,

    // Withdraw
    withdraw,
    withdrawLoading: withdrawApi.loading,
    withdrawError: withdrawApi.error,

    // Pay with crypto
    payWithCrypto,
    payWithCryptoLoading: payWithCryptoApi.loading,
    payWithCryptoError: payWithCryptoApi.error,

    cryptoToMpesa,
    cryptoToMpesaLoading: cryptoToMpesaApi.loading,
    cryptoToMpesaError: cryptoToMpesaApi.error,

    // Dedicated
    payBill,
    payBillLoading: payBillApi.loading,
    payBillError: payBillApi.error,
    payTill,
    payTillLoading: payTillApi.loading,
    payTillError: payTillApi.error,

    // Submit receipt
    submitReceipt,
    submitReceiptLoading: submitReceiptApi.loading,
    submitReceiptError: submitReceiptApi.error,

    // Transaction status
    getTransactionStatus,
    transactionStatus: transactionStatusApi.data,
    transactionStatusLoading: transactionStatusApi.loading,
    transactionStatusError: transactionStatusApi.error,
  };
};