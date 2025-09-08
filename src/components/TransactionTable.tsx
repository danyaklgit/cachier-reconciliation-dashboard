'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, TransactionApiResponse, ColumnProperty } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TransactionTableProps {
  data: TransactionApiResponse;
}

interface PopupData {
  type: 'settlement' | 'charges';
  transaction: Transaction;
}

export function TransactionTable({ data }: TransactionTableProps) {
  const [popupData, setPopupData] = useState<PopupData | null>(null);

  // Sort column properties by ColumnOrder
  const sortedColumns = useMemo(() => {
    return [...data.ColumnProperties].sort((a, b) => a.ColumnOrder - b.ColumnOrder);
  }, [data.ColumnProperties]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Format currency amount
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get status color for settlement status
  const getSettlementStatusColor = (transaction: Transaction) => {
    const { ReconciliationStatusTag, SettlementStatusTag } = transaction;
    if (ReconciliationStatusTag === 'EXCEPTION' || SettlementStatusTag === 'EXCEPTION') {
      return 'text-red-600 bg-red-50';
    }
    if (ReconciliationStatusTag === 'INTRANSIT' || SettlementStatusTag === 'INTRANSIT') {
      return 'text-orange-600 bg-orange-50';
    }
    if (ReconciliationStatusTag === 'RECONCILED' || SettlementStatusTag === 'RECONCILED') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  // Get status color for charges status
  const getChargesStatusColor = (transaction: Transaction) => {
    const { ChargesReconciliationStatusTag, ChargesPostingStatusTag } = transaction.Charges;
    if (ChargesReconciliationStatusTag === 'EXCEPTION' || ChargesPostingStatusTag === 'EXCEPTION') {
      return 'text-red-600 bg-red-50';
    }
    if (ChargesReconciliationStatusTag === 'INTRANSIT' || ChargesPostingStatusTag === 'INTRANSIT') {
      return 'text-orange-600 bg-orange-50';
    }
    if (ChargesReconciliationStatusTag === 'RECONCILED' || ChargesPostingStatusTag === 'RECONCILED') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  // Get value from transaction using column accessor
  const getTransactionValue = (transaction: Transaction, columnAccessor: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (transaction as any)[columnAccessor];
  };

  // Render cell content based on column type
  const renderCellContent = (transaction: Transaction, column: ColumnProperty) => {
    const value = getTransactionValue(transaction, column.ColumnAccessor);
    
    if (column.IsList && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="text-sm">
              {typeof item === 'object' ? (
                <div>
                  <span className="font-medium">{item.Key}:</span> {item.Value}
                </div>
              ) : (
                item
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-sm">{value}</span>;
  };

  // Settlement Status Popup Component
  const SettlementStatusPopup = ({ transaction }: { transaction: Transaction }) => (
    <Dialog open={!!popupData && popupData.type === 'settlement'} onOpenChange={() => setPopupData(null)}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Settlement Status Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Row 1: Amount comparison */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.TransactionAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">↔</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Acquirer Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.AcquirerTransactionAmount)}</p>
            </div>
          </div>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700">Variance</label>
            <p className={`text-lg font-semibold ${transaction.TransactionVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.TransactionVariance)}
            </p>
          </div>

          {/* Row 2: Mismatches */}
          {transaction.MismatchNames && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700">Mismatches</label>
              <p className="text-sm text-yellow-800">{transaction.MismatchNames}</p>
            </div>
          )}

          {/* Row 3: Batch comparison */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Transactions Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.BatchTransactionsAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">↔</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.SettlementBatchAmount)}</p>
            </div>
          </div>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700">Settlement Variance</label>
            <p className={`text-lg font-semibold ${transaction.SettlementVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.SettlementVariance)}
            </p>
          </div>

          {/* Row 4: Batch Reference */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Reference</label>
              <p className="text-sm">{transaction.BatchReconciliationReference}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Date</label>
              <p className="text-sm">{formatDate(transaction.BatchReconciliationDate)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Charges Popup Component
  const ChargesPopup = ({ transaction }: { transaction: Transaction }) => (
    <Dialog open={!!popupData && popupData.type === 'charges'} onOpenChange={() => setPopupData(null)}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Charges Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Row 1: Contractual vs Applied */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contractual</label>
              <p className="text-sm">Fees: {formatAmount(transaction.Charges.ContractualFeesAmount)}</p>
              <p className="text-sm">VAT: {formatAmount(transaction.Charges.ContractualVATAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">↔</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Applied</label>
              <p className="text-sm">Fees: {formatAmount(transaction.Charges.AppliedFeesAmount)}</p>
              <p className="text-sm">VAT: {formatAmount(transaction.Charges.AppliedVATAmount)}</p>
            </div>
          </div>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700">Charges Variance</label>
            <p className={`text-lg font-semibold ${transaction.Charges.ChargesVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.Charges.ChargesVariance)}
            </p>
          </div>

          {/* Row 2: Charge Mismatches */}
          {transaction.Charges.ChargeMismatchNames && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700">Charge Mismatches</label>
              <p className="text-sm text-yellow-800">{transaction.Charges.ChargeMismatchNames}</p>
            </div>
          )}

          {/* Row 3: Postings comparison */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Postings Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.Charges.PostingsAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">↔</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Postings Batch Amount</label>
              <p className="text-lg font-semibold">{formatAmount(transaction.Charges.PostingsBatchAmount)}</p>
            </div>
          </div>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700">Postings Variance</label>
            <p className={`text-lg font-semibold ${transaction.Charges.PostingsVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.Charges.PostingsVariance)}
            </p>
          </div>

          {/* Row 4: Batch Reference */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Reference</label>
              <p className="text-sm">{transaction.Charges.BatchReconciliationReference}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Date</label>
              <p className="text-sm">{formatDate(transaction.Charges.BatchReconciliationDate)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Fixed Columns - First Chunk */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In-Transit Deadline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Settlement Status
              </th>

              {/* Dynamic Columns */}
              {sortedColumns.map((column) => (
                <th key={column.ColumnAccessor} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.ColumnLabel}
                  {column.ColumnInfo && (
                    <span className="ml-1 text-gray-400" title={column.ColumnInfo}>ℹ️</span>
                  )}
                </th>
              ))}

              {/* Fixed Columns - Second Chunk */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.Transactions.map((transaction, index) => (
              <tr key={transaction.TransactionReference} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {/* Fixed Columns - First Chunk */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.TransactionReference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.TransactionDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.BusinessDay)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.PaymentMethodName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatAmount(transaction.TransactionAmount)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${transaction.IsInTransitOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                  {formatDate(transaction.InTransitDueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setPopupData({ type: 'settlement', transaction })}
                    className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${getSettlementStatusColor(transaction)}`}
                  >
                    {transaction.BlendedSettlementStatusName || transaction.BlendedSettlementStatusTag}
                  </button>
                </td>

                {/* Dynamic Columns */}
                {sortedColumns.map((column) => (
                  <td key={column.ColumnAccessor} className="px-6 py-4 text-sm text-gray-900">
                    {renderCellContent(transaction, column)}
                  </td>
                ))}

                {/* Fixed Columns - Second Chunk */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setPopupData({ type: 'charges', transaction })}
                    className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${getChargesStatusColor(transaction)}`}
                  >
                    {transaction.Charges.BlendedChargesStatusName || transaction.Charges.BlendedChargesStatusTag}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popups */}
      {popupData?.type === 'settlement' && <SettlementStatusPopup transaction={popupData.transaction} />}
      {popupData?.type === 'charges' && <ChargesPopup transaction={popupData.transaction} />}
    </div>
  );
}
