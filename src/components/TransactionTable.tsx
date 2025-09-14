'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Transaction, TransactionApiResponse, ColumnProperty } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TransactionTableProps {
  data: TransactionApiResponse;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreData?: boolean;
  handleClose: () => void;
}

interface PopupData {
  type: 'settlement' | 'charges';
  transaction: Transaction;
}

// Component to format decimal numbers with superscript decimal part
const DecimalNumber = ({ num }: { num: number }) => {
  if (num === 0) return <span>-</span>;

  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [integerPart, decimalPart] = formatted.split('.');

  return (
    <span className='text-sm'>
      {integerPart}
      <sup className="text-[10px] top-[-3px] font-normal">.{decimalPart}</sup>
    </span>
  );
};

export function TransactionTable({ data, onLoadMore, isLoadingMore, hasMoreData, handleClose }: TransactionTableProps) {
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const lastRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    // Handle escape key to close popup or transaction
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (popupData) {
          console.log('Escape key pressed, closing popup');
          setPopupData(null);
        } else {
          console.log('Escape key pressed, closing transaction');
          handleClose();
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, popupData]);

  // Sort column properties by ColumnOrder
  const sortedColumns = useMemo(() => {
    return [...data.ColumnProperties].sort((a, b) => a.ColumnOrder - b.ColumnOrder);
  }, [data.ColumnProperties]);

  // Intersection observer callback for infinite scroll
  const lastRowObserver = useCallback((node: HTMLTableRowElement | null) => {
    if (isLoadingMore) return;
    if (lastRowRef.current) lastRowRef.current = null;

    if (node) {
      lastRowRef.current = node;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreData && onLoadMore && !isLoadingMore) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
    }
  }, [isLoadingMore, hasMoreData, onLoadMore]);

  // Format date for display (dd-mm-yyyy hh:mm)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // Format date only (no time) for display (dd-mm-yyyy)
  const formatDateOnly = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  // Format currency amount
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '-';
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Safe string conversion for potentially complex values
  const safeStringValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      // Handle objects with 'value' property
      if ('value' in value) {
        return String(value.value);
      }
      // Handle objects with 'Key' and 'Value' properties
      if ('Key' in value && 'Value' in value) {
        return `${value.Key}: ${value.Value}`;
      }
      // Try to stringify other objects
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
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

    // Handle null or undefined values
    if (value === null || value === undefined) {
      return <span className="text-sm text-gray-400">-</span>;
    }

    // Handle arrays
    if (column.IsList && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="text-sm">
              {typeof item === 'object' && item !== null ? (
                <div>
                  <span className="font-medium">{item.Key || 'Key'}:</span> {item.Value || item.value || 'N/A'}
                </div>
              ) : (
                String(item)
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle objects (not arrays)
    if (typeof value === 'object' && value !== null) {
      // If it has a 'value' property, display that
      if ('value' in value) {
        return <span className="text-sm">{String(value.value)}</span>;
      }
      // If it has Key/Value properties, display them
      if ('Key' in value && 'Value' in value) {
        return <span className="text-sm">{value.Key}: {value.Value}</span>;
      }
      // For other objects, try to stringify or show a placeholder
      try {
        const stringified = JSON.stringify(value);
        return <span className="text-sm text-gray-600">{stringified}</span>;
      } catch {
        return <span className="text-sm text-gray-400">[Object]</span>;
      }
    }

    // Handle primitive values
    return <span className="text-sm">{String(value)}</span>;
  };

  // Settlement Status Popup Component
  const SettlementStatusPopup = ({ transaction }: { transaction: Transaction }) => (
    <Dialog open={!!popupData && popupData.type === 'settlement'} onOpenChange={() => setPopupData(null)}>
      <DialogContent className="max-w-2xl bg-white" onEscapeKeyDown={(e) => e.preventDefault()}>
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
            <p className={`text-lg font-semibold ${transaction.TransactionVariance && transaction.TransactionVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.TransactionVariance)}
            </p>
          </div>

          {/* Row 2: Mismatches */}
          {transaction.MismatchNames && formatMismatchNames(transaction.MismatchNames) && (
            <div className="p-4 bg-yellow-50 rounded-lg text-center flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700">Mismatches</label>
              <p className="text-base text-red-500 font-semibold">{formatMismatchNames(transaction.MismatchNames)}</p>
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
            <p className={`text-lg font-semibold ${transaction.SettlementVariance && transaction.SettlementVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.SettlementVariance)}
            </p>
          </div>

          {/* Row 4: Batch Reference */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Reference</label>
              <p className="text-sm">{safeStringValue(transaction.BatchReconciliationReference)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Date</label>
              <p className="text-sm">{formatDate(safeStringValue(transaction.BatchReconciliationDate))}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    );

  // Helper function to extract mismatch names from array of objects with 'value' property
  const formatMismatchNames = (mismatches: Array<{ value: string }> | undefined | null): string => {
    if (!mismatches || !Array.isArray(mismatches)) {
      return '';
    }
    return mismatches.map((mismatch) => mismatch.value).join(', ');
  };

  // Charges Popup Component
  const ChargesPopup = ({ transaction }: { transaction: Transaction }) => (
    <Dialog open={!!popupData && popupData.type === 'charges'} onOpenChange={() => setPopupData(null)}>
      <DialogContent className="max-w-2xl bg-white" onEscapeKeyDown={(e) => e.preventDefault()}>
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
            <p className={`text-lg font-semibold ${transaction.Charges.ChargesVariance && transaction.Charges.ChargesVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.Charges.ChargesVariance)}
            </p>
          </div>

          {/* Row 2: Charge Mismatches */}
          {transaction.Charges.ChargeMismatchNames && formatMismatchNames(transaction.Charges.ChargeMismatchNames) && (
            <div className="p-4 bg-yellow-50 rounded-lg text-center flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700">Charge Mismatches</label>
              <p className="text-base text-red-500 font-semibold">{formatMismatchNames(transaction.Charges.ChargeMismatchNames)}</p>
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
            <p className={`text-lg font-semibold ${transaction.Charges.PostingsVariance && transaction.Charges.PostingsVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(transaction.Charges.PostingsVariance)}
            </p>
          </div>

          {/* Row 4: Batch Reference */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Reference</label>
              <p className="text-sm">{safeStringValue(transaction.Charges.BatchReconciliationReference)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Date</label>
              <p className="text-sm">{formatDate(safeStringValue(transaction.Charges.BatchReconciliationDate))}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-auto max-h-[70vh] border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
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
            {data.Transactions.map((transaction, index) => {
              const isLastRow = index === data.Transactions.length - 1;
              return (
                <tr
                  key={transaction.TransactionReference}
                  ref={isLastRow ? lastRowObserver : null}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {/* Fixed Columns - First Chunk */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.TransactionReference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.TransactionDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.BusinessDay ? formatDateOnly(transaction.BusinessDay) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.PaymentMethodName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <DecimalNumber num={transaction.TransactionAmount} />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${transaction.IsInTransitOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                    {transaction.InTransitDueDate ? formatDateOnly(transaction.InTransitDueDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setPopupData({ type: 'settlement', transaction })}
                      className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${getSettlementStatusColor(transaction)}`}
                    >
                      {safeStringValue(transaction.BlendedSettlementStatusName || transaction.BlendedSettlementStatusTag)}
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
                      {safeStringValue(transaction.Charges.BlendedChargesStatusName || transaction.Charges.BlendedChargesStatusTag)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Loading indicator at bottom when loading more */}
        {isLoadingMore && (
          <div className="bg-white border-t border-gray-200 p-4 flex justify-center">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Loading more transactions...</span>
            </div>
          </div>
        )}

        {/* No More Data Message */}
        {!hasMoreData && data.Transactions.length > 0 && (
          <div className="bg-white border-t border-gray-200 p-4 text-center">
            <p className="text-gray-500 text-sm">No more transactions to load</p>
          </div>
        )}
      </div>


      {/* Popups */}
      {popupData?.type === 'settlement' && <SettlementStatusPopup transaction={popupData.transaction} />}
      {popupData?.type === 'charges' && <ChargesPopup transaction={popupData.transaction} />}
    </div>
  );
}
