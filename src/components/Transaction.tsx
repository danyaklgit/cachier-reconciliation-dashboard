'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DataNode } from '@/types';

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
}

export function Transaction({
    row,
    onClose,
    selectedTenant,
    selectedAreas,
    selectedOutlets,
    selectedBusinessDay,
    dashboardData,
    tenantsData
}: TransactionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiResponse, setApiResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    }, [handleClose]);

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
            //   if (currentNode.NodeTag === 'ROUTE') {
            //     criteriaItem.FilterValue = currentNode.NodeLabel;
            //   } else {
            criteriaItem.Value = currentNode.NodeLabel;
            //   }

            criteria.push(criteriaItem);

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
    }, [findParentNode]);

    // Function to get tenant code from selected tenant
    const getTenantCode = useCallback((): string => {
        const tenant = tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedTenant);
        return tenant?.TenantCode || '';
    }, [tenantsData.Tenants, selectedTenant]);

    // Call API when component mounts
    useEffect(() => {
        const callGetTransactionsAPI = async () => {
            setLoading(true);
            setError(null);

            try {
                const criteria = buildCriteria(row, dashboardData);

                const requestJson = {
                    TenantCode: getTenantCode(),
                    AreaIds: selectedAreas.map(id => parseInt(id)),
                    OutletIds: selectedOutlets.map(id => parseInt(id)),
                    BusinessDay: selectedBusinessDay,
                    Criteria: criteria
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
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        callGetTransactionsAPI();
    }, [row, selectedTenant, selectedAreas, selectedOutlets, selectedBusinessDay, dashboardData, tenantsData, buildCriteria, getTenantCode]);

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
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors duration-200"
                >
                    ×
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="max-w-6xl mx-auto">
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

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* API Repuest */}
                        {/* Request Details */}
                    {!loading && (
                        <div className={`bg-gray-50 rounded-lg p-6 mb-6 transition-all duration-500 ease-out ${isVisible && !isClosing
                                ? 'opacity-100 transform translate-y-0'
                                : 'opacity-0 transform translate-y-8'
                            }`} style={{ transitionDelay: isVisible ? '300ms' : '0ms' }}>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Selected Row</label>
                                    <p className="mt-1 text-sm text-gray-900">{row.NodeLabel} ({row.NodeTag})</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Row ID</label>
                                    <p className="mt-1 text-sm text-gray-900">{row.Id}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tenant Code</label>
                                    <p className="mt-1 text-sm text-gray-900">{getTenantCode()}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Business Day</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedBusinessDay}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Area IDs</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedAreas.join(', ')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Outlet IDs</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedOutlets.join(', ')}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Generated Criteria</label>
                                <div className="bg-white border border-gray-200 rounded p-3">
                                    <pre className="text-sm text-gray-800">
                                        {JSON.stringify(buildCriteria(row, dashboardData), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                        {/* API Response */}
                        {apiResponse && !loading && !error && (
                            <div className={`bg-white border border-gray-200 rounded-lg p-6 transition-all duration-500 max-h-[80dvh] overflow-auto ease-out ${isVisible && !isClosing
                                    ? 'opacity-100 transform translate-y-0'
                                    : 'opacity-0 transform translate-y-8'
                                }`} style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">GetTransactions API Response</h2>
                                <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {JSON.stringify(apiResponse, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                   
                </div>
            </div>
        </div>
    );
}
