'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CashPositionItem, CashPositionItemWithMeta, CashPositionData } from '@/types';

export default function CashPositionPage() {
  const [cashData, setCashData] = useState<CashPositionItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load cash position data from JSON file
    const loadCashData = async () => {
      try {
        const response = await fetch('/data/cash-position.json');
        const data: CashPositionData = await response.json();
        setCashData(data.cashPositionData);
      } catch (error) {
        console.error('Error loading cash position data:', error);
      }
    };

    loadCashData();
  }, []);

  // Format currency amount
  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === undefined) {
      return '';
    }
    return amount.toLocaleString('en-US');
  };

  // Toggle expand/collapse for a row
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  };

  // Flatten the data structure for rendering based on expanded state
  const getFlattenedData = (items: CashPositionItem[]): CashPositionItemWithMeta[] => {
    const result: CashPositionItemWithMeta[] = [];
    
    const processItem = (item: CashPositionItem, level: number = 0) => {
      // Create item with calculated metadata
      const itemWithMeta: CashPositionItemWithMeta = {
        ...item,
        level,
        isExpandable: !!(item.children && item.children.length > 0)
      };
      
      result.push(itemWithMeta);
      
      // Process children if expanded
      if (item.children && expandedItems.has(item.id)) {
        item.children.forEach(child => {
          processItem(child, level + 1);
        });
      }
    };

    items.forEach(item => processItem(item, 0));
    return result;
  };

  // Get row styling based on level and content
  const getRowStyling = (item: CashPositionItemWithMeta) => {
    const baseClasses = "border-b border-gray-200";
    
    if (item.level === 0) {
      return `${baseClasses} bg-gray-50 font-medium`;
    } else if (item.level === 1) {
      return `${baseClasses} bg-white`;
    } else {
      return `${baseClasses} bg-gray-25`;
    }
  };

  // Get cell styling based on value and column
  const getCellStyling = (value: number | null, columnType: string) => {
    const baseClasses = "px-4 py-3 text-center text-sm";
    
    if (value === null) {
      return `${baseClasses} text-gray-400`;
    }

    // Color coding based on column type
    if (columnType === 'inflows') {
      return `${baseClasses} text-green-700 bg-green-50`;
    } else if (columnType === 'outflows') {
      return `${baseClasses} text-red-700 bg-red-50`;
    } else if (columnType === 'bookVariance') {
      return `${baseClasses} text-gray-700 bg-gray-100`;
    } else if (columnType === 'bankDeposit' || columnType === 'bankVerification') {
      return `${baseClasses} text-blue-700 bg-blue-50`;
    } else if (columnType === 'bankVariance') {
      return `${baseClasses} text-orange-700 bg-orange-50`;
    }
    
    return `${baseClasses} text-gray-900`;
  };

  const flattenedData = getFlattenedData(cashData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">Cash Position</h1>
            {/* <p className="text-sm text-gray-600 mt-1">Reconciliation Summary</p> */}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="bg-gray-300 px-4 py-3 text-center  border-r border-gray-300">
                    
                  </th>
                  <th colSpan={6} className="bg-green-100 px-4 py-3 text-center text-sm font-bold text-gray-900">
                    Reconciliation Summary <span className="icon-saudi_riyal text-xs">&#xea;</span>
                  </th>
                </tr>
                <tr className="bg-green-50">
                  <th className="bg-gray-300 px-4 py-3 text-center text-base font-bold text-gray-900 border-r border-gray-300">
                    {/* Empty cell for category column */}
                    CASH
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200">
                    Inflows
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200">
                    Outflows
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200">
                    Book Variance
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200">
                    Bank Deposit
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200">
                    Bank Verification
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Bank Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {flattenedData.map((item) => (
                  <tr key={item.id} className={getRowStyling(item)}>
                    {/* Category Column */}
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div 
                        className="flex items-center cursor-pointer"
                        style={{ paddingLeft: `${item.level * 20}px` }}
                        onClick={() => item.isExpandable && toggleExpand(item.id)}
                      >
                        {item.isExpandable && (
                          <span className="mr-2 text-gray-500">
                            {expandedItems.has(item.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </span>
                        )}
                        <span className={`text-sm ${item.level === 0 ? 'font-semibold' : 'font-medium'}`}>
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* Data Columns */}
                    <td className={getCellStyling(item.inflows, 'inflows')}>
                      {formatAmount(item.inflows)}
                    </td>
                    <td className={getCellStyling(item.outflows, 'outflows')}>
                      {formatAmount(item.outflows)}
                    </td>
                    <td className={getCellStyling(item.bookVariance, 'bookVariance')}>
                      {formatAmount(item.bookVariance)}
                    </td>
                    <td className={getCellStyling(item.bankDeposit, 'bankDeposit')}>
                      {formatAmount(item.bankDeposit)}
                    </td>
                    <td className={getCellStyling(item.bankVerification, 'bankVerification')}>
                      {formatAmount(item.bankVerification)}
                    </td>
                    <td className={getCellStyling(item.bankVariance, 'bankVariance')}>
                      {formatAmount(item.bankVariance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
