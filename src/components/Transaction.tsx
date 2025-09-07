'use client';

import React, { useState, useEffect } from 'react';
import { DataNode } from '@/types';

interface TransactionProps {
  row: DataNode;
  onClose: () => void;
}

export function Transaction({ row, onClose }: TransactionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger opening animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle escape key to close transaction
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-white overflow-auto transition-all duration-300 ease-in-out ${
      isVisible && !isClosing 
        ? 'opacity-100 transform translate-y-0' 
        : 'opacity-0 transform translate-y-4'
    }`}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {row.Id}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors duration-200"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Transaction Info */}
          <div className={`bg-gray-50 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${
            isVisible && !isClosing 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <p className="mt-1 text-sm text-gray-900">{row.Id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Node Label</label>
                <p className="mt-1 text-sm text-gray-900">{row.NodeLabel}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Node Tag</label>
                <p className="mt-1 text-sm text-gray-900">{row.NodeTag}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Depth</label>
                <p className="mt-1 text-sm text-gray-900">0</p>
              </div>
            </div>
          </div>

          {/* Records Verification */}
          {row.RecordsVerification && (
            <div className={`bg-white border border-gray-200 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${
              isVisible && !isClosing 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
            }`} style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Records Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recorded</label>
                  <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.Recorded?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verified</label>
                  <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.Verified?.toFixed(2) || 'N/A'}</p>
                </div>
                {row.RecordsVerification.CurrentDayVariances && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Day Outstanding</label>
                      <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.CurrentDayVariances.Outstanding?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Day Exceptions</label>
                      <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.CurrentDayVariances.Exceptions?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </>
                )}
                {row.RecordsVerification.CumulativeVariances && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cumulative Outstanding</label>
                      <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.CumulativeVariances.Outstanding?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cumulative Exceptions</label>
                      <p className="mt-1 text-sm text-gray-900">{row.RecordsVerification.CumulativeVariances.Exceptions?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Settlement Verification */}
          {row.SettlementVerification && (
            <div className={`bg-white border border-gray-200 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${
              isVisible && !isClosing 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
            }`} style={{ transitionDelay: isVisible ? '300ms' : '0ms' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Claimed</label>
                  <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.Claimed?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Settled</label>
                  <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.Settled?.toFixed(2) || 'N/A'}</p>
                </div>
                {row.SettlementVerification.CurrentDayVariances && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Day Awaiting Settlement</label>
                      <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.CurrentDayVariances.AwaitingSettlement?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Day Exceptions</label>
                      <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.CurrentDayVariances.Exceptions?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </>
                )}
                {row.SettlementVerification.CumulativeVariances && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cumulative Awaiting Settlement</label>
                      <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.CumulativeVariances.AwaitingSettlement?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cumulative Exceptions</label>
                      <p className="mt-1 text-sm text-gray-900">{row.SettlementVerification.CumulativeVariances.Exceptions?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Child Nodes */}
          {row.ChildNodes && row.ChildNodes.length > 0 && (
            <div className={`bg-white border border-gray-200 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${
              isVisible && !isClosing 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
            }`} style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Child Transactions ({row.ChildNodes.length})</h2>
              <div className="space-y-2">
                {row.ChildNodes.map((child) => (
                  <div key={child.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{child.NodeLabel}</span>
                      <span className="text-xs text-gray-500 ml-2">ID: {child.Id}</span>
                    </div>
                    <span className="text-xs text-gray-500">{child.NodeTag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dummy Content for Future API Integration */}
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 transition-all duration-500 ease-out ${
            isVisible && !isClosing 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '500ms' : '0ms' }}>
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Additional Transaction Details</h2>
            <p className="text-blue-800 mb-4">
              This section will be populated with additional transaction details from the API.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700">Transaction Date</label>
                <p className="mt-1 text-sm text-blue-900">Coming from API...</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700">Transaction Type</label>
                <p className="mt-1 text-sm text-blue-900">Coming from API...</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700">Amount</label>
                <p className="mt-1 text-sm text-blue-900">Coming from API...</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700">Status</label>
                <p className="mt-1 text-sm text-blue-900">Coming from API...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
