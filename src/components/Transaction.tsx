'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DataNode, Topic, TransactionApiResponse, type Transaction } from '@/types';
import { TransactionTable } from '@/components/TransactionTable';
import { X } from 'lucide-react';

interface TransactionProps {
  row: DataNode;
  onClose: () => void;
    // User selection values from dashboard
    selectedTenant: string;
    selectedAreas: string[];
    selectedOutlets: string[];
    selectedBusinessDay: string;
    // Full dashboard data to find parent relationships
    dashboardData: DataNode[];
  // Tenants data to get tenant code
  tenantsData: {
    Tenants: Array<{
      TenantId: number;
      TenantCode: string;
      TenantName: string;
      Areas: Array<{
        AreaId: number;
        AreaCode: string;
        AreaName: string;
        Outlets: Array<{
          OutletId: number;
          OutletCode: string;
          OutletName: string;
        }>;
      }>;
    }>
  };
  // Topics data to get Topic.Tag from Topic.Label
  topicsData: {
    Topics: Topic[];
  };
}

export function Transaction({
    row,
    onClose,
    selectedTenant,
    selectedAreas,
    selectedOutlets,
    selectedBusinessDay,
    dashboardData,
    tenantsData,
    topicsData
}: TransactionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
    const [apiResponse, setApiResponse] = useState<TransactionApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const isLoadingMoreRef = useRef(false);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        // Wait for animation to complete before calling onClose
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        // Trigger opening animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // Prevent body scrolling when modal is open
    useEffect(() => {
        // Store the original overflow style
        const originalOverflow = document.body.style.overflow;
        
        // Disable body scrolling
        document.body.style.overflow = 'hidden';
        
        // Cleanup: restore original overflow when component unmounts
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);



    // Function to find parent node in the hierarchy
    const findParentNode = useCallback((targetNode: DataNode, data: DataNode[]): DataNode | null => {
        for (const node of data) {
            if (node.ChildNodes) {
                for (const child of node.ChildNodes) {
                    if (child.Id === targetNode.Id) {
                        return node;
                    }
                    // Recursively search in deeper levels
                    const found = findParentNode(targetNode, [child]);
                    if (found) return found;
                }
            }
        }
        return null;
    }, []);

    // Function to build criteria array recursively
    const buildCriteria = useCallback((currentRow: DataNode, data: DataNode[]): Array<{ Tag: string, Value?: string, FilterValue?: string }> => {
        const criteria: Array<{ Tag: string, Value?: string, FilterValue?: string }> = [];
        let currentNode = currentRow;

        while (currentNode) {
            const criteriaItem: { Tag: string, Value?: string, FilterValue?: string } = {
                Tag: currentNode.NodeTag
            };

            // Use FilterValue for ROUTE, Value for others
            // if (currentNode.NodeTag === 'ROUTE') {
            //     criteriaItem.FilterValue = currentNode.NodeLabel;
            // } else if (currentNode.NodeTag === 'TOPIC') {
            //     // For TOPIC nodes, find the Topic.Tag from topicsData using the NodeLabel
            //     const topic = topicsData.Topics.find(t => t.Label === currentNode.NodeLabel);
            //     criteriaItem.Value = topic?.Tag || currentNode.NodeLabel; // Fallback to NodeLabel if not found
            // } else {
            //     criteriaItem.Value = currentNode.NodeLabel;
            // }

            if (currentNode.NodeTag === 'TOPIC') {
                // For TOPIC nodes, find the Topic.Tag from topicsData using the NodeLabel
                const topic = topicsData.Topics.find(t => t.Label === currentNode.NodeLabel);
                criteriaItem.Value = topic?.Tag || currentNode.NodeLabel; // Fallback to NodeLabel if not found
            } else {
                criteriaItem.Value = currentNode.NodeLabel;
                criteria.push(criteriaItem);
            }

            // const topic = topicsData.Topics.find(t => t.Label === currentNode.NodeLabel);
            // criteriaItem.Value = topic?.Tag || currentNode.NodeLabel;
            
            // criteria.push(criteriaItem);

            // Stop when we reach TOPIC
            if (currentNode.NodeTag === 'TOPIC') {
                break;
            }

            // Find parent node
            const parent = findParentNode(currentNode, data);
            if (!parent) break;
            currentNode = parent;
        }

        // Reverse to get TOPIC first
        return criteria.reverse();
    }, [findParentNode, topicsData.Topics]);

    // Function to get tenant code from selected tenant
    const getTenantCode = useCallback((): string => {
        const tenant = tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedTenant);
        return tenant?.TenantCode || '';
    }, [tenantsData.Tenants, selectedTenant]);

    // Function to get parent topic from the row hierarchy
    const getParentTopic = useCallback((currentRow: DataNode, data: DataNode[]): string => {
        let currentNode = currentRow;
        
        while (currentNode) {
            if (currentNode.NodeTag === 'TOPIC') {
                // Find the Topic.Tag from topicsData using the NodeLabel
                const topic = topicsData.Topics.find(t => t.Label === currentNode.NodeLabel);
                return topic?.Tag || currentNode.NodeLabel;
            }
            
            // Find parent node
            const parent = findParentNode(currentNode, data);
            if (!parent) break;
            currentNode = parent;
        }
        
        return '';
    }, [findParentNode, topicsData.Topics]);

    // Function to call the API with specific page
    const callGetTransactionsAPI = useCallback(async (pageIndex: number, isLoadMore: boolean = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const criteria = buildCriteria(row, dashboardData);

            const requestJson = {
                TenantCode: getTenantCode(),
                AreaIds: selectedAreas.map(id => parseInt(id)),
                OutletIds: selectedOutlets.map(id => parseInt(id)),
                BusinessDay: selectedBusinessDay,
                Filter: criteria,
                Topic: getParentTopic(row, dashboardData),
                Pagination: {
                    PageIndex: pageIndex,
                    PageSize: 50
                }
            };

            const response = await fetch('/api/get-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ RequestJson: requestJson })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (isLoadMore) {
                // Append new transactions to existing ones, filtering out duplicates
                if (!data.Transaction){
                    data.Transactions = [];
                }
                setApiResponse(prev => {
                    if (!prev) return data;
                    
                    // Get existing transaction references for deduplication
                    const existingRefs = new Set(prev.Transactions.map(t => t.TransactionReference));
                    
                    // Filter out transactions that already exist
                    const newTransactions = data.Transactions.filter(
                        (transaction: Transaction) => !existingRefs.has(transaction.TransactionReference)
                    );
                    
                    return {
                        ...prev,
                        Transactions: [...prev.Transactions, ...newTransactions]
                    };
                });
            } else {
                // Set initial response
                setApiResponse(data);
            }

            // Check if there's more data (if we got less than 50 transactions, we've reached the end)
            setHasMoreData(data.Transactions.length === 50);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            if (isLoadMore) {
                isLoadingMoreRef.current = false;
            }
        } finally {
            if (isLoadMore) {
                setLoadingMore(false);
                isLoadingMoreRef.current = false;
            } else {
                setLoading(false);
            }
        }
    }, [row, selectedAreas, selectedOutlets, selectedBusinessDay, dashboardData, buildCriteria, getTenantCode, getParentTopic]);

    // Function to load more transactions
    const loadMoreTransactions = useCallback(() => {
        if (!isLoadingMoreRef.current && hasMoreData && !loadingMore) {
            isLoadingMoreRef.current = true;
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            callGetTransactionsAPI(nextPage, true);
        }
    }, [hasMoreData, loadingMore, currentPage, callGetTransactionsAPI]);

    // Call API when component mounts or dependencies change
    useEffect(() => {
        // Reset state when component mounts or dependencies change
        setCurrentPage(0);
        setHasMoreData(true);
        setApiResponse(null);
        isLoadingMoreRef.current = false;
        
        // Call API with initial page
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);

            try {
                const criteria = buildCriteria(row, dashboardData);

                const requestJson = {
                    TenantCode: getTenantCode(),
                    AreaIds: selectedAreas.map(id => parseInt(id)),
                    OutletIds: selectedOutlets.map(id => parseInt(id)),
                    BusinessDay: selectedBusinessDay,
                    Filter: criteria,
                    Topic: getParentTopic(row, dashboardData),
                    Pagination: {
                        PageIndex: 0,
                        PageSize: 50
                    }
                };

                const response = await fetch('/api/get-transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ RequestJson: requestJson })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setApiResponse(data);
                setHasMoreData(data.Transactions.length === 50);
                
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [row, selectedTenant, selectedAreas, selectedOutlets, selectedBusinessDay, dashboardData, tenantsData, topicsData, buildCriteria, getTenantCode, getParentTopic]);

  return (
        <div className={`fixed inset-0 z-50 bg-white overflow-auto transition-all duration-300 ease-in-out ${isVisible && !isClosing
        ? 'opacity-100 transform translate-y-0' 
        : 'opacity-0 transform translate-y-4'
    }`}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
                    {/* <p className="text-sm text-gray-600 mt-1">ID: {row.Id}</p> */}
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 cursor-pointer hover:text-red-600 text-2xl font-bold transition-colors duration-200"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
                <div className="max-w-8xl mx-auto">
                    {/* Loading State */}
                    {loading && (
                        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-8 mb-6 transition-all duration-500 ease-out ${isVisible && !isClosing
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`} style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}>
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <h2 className="text-lg font-semibold text-blue-900 mb-2">Loading Transaction Details</h2>
                                <p className="text-blue-800">Fetching data from GetTransactions API...</p>
              </div>
            </div>
          )}

                    {/* Error State */}
                    {error && (
                        <div className={`bg-red-50 border border-red-200 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${isVisible && !isClosing
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
                            }`} style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}>
                            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Transaction Details</h2>
                            <p className="text-red-800">{error}</p>
            </div>
          )}

                    {/* API Response */}
                    {apiResponse && !loading && !error && (
                        <div className={`flex flex-col bg-white border border-gray-200 rounded-lg p-6 transition-all duration-500 ease-out ${isVisible && !isClosing
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-8'
                            }`} style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}>
                            
                            {/* Criteria Section */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border flex items-center gap-10 justify-start">
                                <h3 className="text-sm font-medium text-slate-800">Filters</h3>
                                <div className=" flex flex-wrap gap-5">
                                    {buildCriteria(row, dashboardData).map((criteria, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <span className="font-medium text-gray-600">{criteria.Tag}:</span>
                                            <span className="text-gray-900 bg-white px-2 py-1 rounded border">
                                                {criteria.Value || criteria.FilterValue}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-gray-600">Business Day:</span>
                                        <span className="text-gray-900 bg-white px-2 py-1 rounded border">
                                            {selectedBusinessDay}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-gray-600">Topic:</span>
                                        <span className="text-gray-900 bg-white px-2 py-1 rounded border">
                                            {getParentTopic(row, dashboardData)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {apiResponse?.Transactions?.length ? <><h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                {loadingMore && 
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                
                                }
                                {apiResponse?.Transactions?.length } Transactions
                            </h2>
                            <TransactionTable 
                                data={apiResponse} 
                                onLoadMore={loadMoreTransactions}
                                isLoadingMore={loadingMore}
                                hasMoreData={hasMoreData}
                                handleClose={handleClose}
                            /></>
                            : <div className="flex flex-col items-center justify-center"><h2 className="text-lg !m-0 text-center font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                No Transactions Found
                                {/* <p className="text-gray-500 text-sm">Try adjusting your filters or date range</p> */}
                            </h2>
                            </div>
                            }
            </div>
          )}

                   
        </div>
      </div>
    </div>
  );
}
