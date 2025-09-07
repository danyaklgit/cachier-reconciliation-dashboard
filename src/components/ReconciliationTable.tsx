'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, RouteIcon, UserIcon, ListIcon, CarIcon } from 'lucide-react';
import { DataNode, FilterState } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// import { toast } from 'react-hot-toast';

interface ReconciliationTableProps {
  data: DataNode[];
  filterState: FilterState;
  viewTransaction: (row: DataNode) => void;
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

// const formatNumber = (num: number): string => {
//   if (num === 0) return '-';
//   return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };

const getRowStyle = (nodeTag: string, depth: number) => {
  // const baseStyle = 'border-b border-gray-50';
  const baseStyle = '';
  const depthStyle = depth === 0 ?
    ' text-sm text-base font-semibold text-primary' :
    depth === 1 ?
      'text-sm font-semibold text-slate-800' :
      depth === 2 ?
        'text-sm font-semibold text-slate-700' :
        depth === 3 ?
          'text-xs font-semibold text-slate-600' :
          'text-xs bg-white text-slate-500';
  // const tagStyle = nodeTag === 'TOPIC' ? 'text-primary' : 'text-gray-900';
  const tagStyle = '';

  return `${baseStyle} ${depthStyle} ${tagStyle}`;
};

const getCellStyle = (value: number, columnType: string) => {
  // if (value === 0) return 'text-gray-400';

  switch (columnType) {
    // case 'verified':
    // case 'outstanding':
    case 'exceptions':
      return 'text-red-600 font-medium';
    // case 'recorded':
    // return 'text-blue-400 font-medium';
    case 'claimed':
    case 'settled':
    case 'awaitingSettlement':
      return 'text-[#0a49e0] font-medium';
    default:
      return 'text-green-600 font-medium';
  }
  // switch (columnType) {
  //   case 'verified':
  //     return 'text-green-600 font-medium';
  //   case 'outstanding':
  //   case 'exceptions':
  //     return 'text-red-600 font-medium';
  //   case 'claimed':
  //   case 'settled':
  //   case 'awaitingSettlement':
  //     return 'text-blue-600 font-medium';
  //   default:
  //     return 'bg-gray-200 text-gray-900';
  // }
};

export function ReconciliationTable({ data, filterState, viewTransaction = () => { } }: ReconciliationTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isExpanding, setIsExpanding] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visibleRows, setVisibleRows] = useState<number>(50); // Start with 50 visible rows
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Debounced expansion handler to prevent rapid clicks
  const handleRowExpansion = useCallback((rowId: string, hasChildren: boolean) => {
    if (!hasChildren || isExpanding) return;

    // Clear any existing timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }

    setIsExpanding(true);

    // Use requestAnimationFrame to ensure smooth UI updates
    requestAnimationFrame(() => {
      setExpanded(prev => ({
        ...(prev as Record<string, boolean>),
        [rowId]: !(prev as Record<string, boolean>)[rowId]
      }));

      // Reset expanding state after a short delay
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanding(false);
      }, 100);
    });
  }, [isExpanding]);

  // Handle loading more rows
  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      setVisibleRows(prev => prev + 50);
      setIsLoadingMore(false);
    }, 300);
  }, []);

  // Reset visible rows when data changes
  React.useEffect(() => {
    setVisibleRows(50);
    setIsLoadingMore(false);
  }, [data, filterState]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, []);

  const columns = useMemo<ColumnDef<DataNode>[]>(() => [
    {
      id: 'topic',
      header: 'Topic',
      accessorKey: 'NodeLabel',
      width: 200,
      cell: ({ row, getValue }) => {
        const depth = row.depth;
        const hasChildren = row.original.ChildNodes && row.original.ChildNodes.length > 0;
        const rowId = row.original.Id;
        const isExpanded = (expanded as Record<string, boolean>)[rowId] === true;
        const value = getValue() as string;
        const nodeType = row.original.NodeTag;

        return (
          <div className={`flex items-center space-x-2 ${hasChildren ? 'cursor-pointer' : ''}`} style={{ paddingLeft: `${depth * 8}px` }}
            onClick={() => handleRowExpansion(rowId, !!hasChildren)}>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${isExpanding ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isExpanding}
              >
                {isExpanding ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            ) : <div className="w-6 h-6" />}

            {/* show icon based on the node type BRAND, DRIVER, ROUTE, CUSTOMER */}
            {nodeType === 'BRAND' && (
              <Tooltip>
                <TooltipTrigger>
                  <ListIcon className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>Brand</TooltipContent>
              </Tooltip>
            )}
            {nodeType === 'DRIVER' && (
              <Tooltip>
                <TooltipTrigger>
                  <CarIcon className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>Driver</TooltipContent>
              </Tooltip>
            )}
            {nodeType === 'ROUTE' && (
              <Tooltip>
                <TooltipTrigger>
                  <RouteIcon className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>Route</TooltipContent>
              </Tooltip>
            )}
            {nodeType === 'CUSTOMER' && (
              <Tooltip>
                <TooltipTrigger>
                  <UserIcon className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>Customer</TooltipContent>
              </Tooltip>
            )}



            <span className={getRowStyle(row.original.NodeTag, depth)}>
              {value}
            </span>
          </div>
        );
      },
    },
    {
      id: 'recordsVerification',
      header: () => (<span>Records Verification <span className="icon-saudi_riyal text-xs">&#xea;</span></span>),
      columns: [
        {
          id: 'recorded',
          header: 'Recorded',
          accessorKey: 'RecordsVerification.Recorded',
          cell: ({ getValue }) => {
            const value = getValue() as number;
            return (
              <span className={`text-right block ${getCellStyle(value, 'recorded')}`}>
                <DecimalNumber num={value} />
              </span>
            );
          },
        },
        {
          id: 'verified',
          header: 'Verified',
          accessorKey: 'RecordsVerification.Verified',
          cell: ({ getValue }) => {
            const value = getValue() as number;
            return (
              <span className={`text-right block ${getCellStyle(value, 'verified')}`}>
                <DecimalNumber num={value} />
              </span>
            );
          },
        },
        {
          id: 'currentDayVariances',
          header: 'Current Day Variances',
          columns: [
            {
              id: 'outstanding',
              header: 'Outstanding',
              accessorKey: 'RecordsVerification.CurrentDayVariances.Outstanding',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'outstanding')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
            {
              id: 'exceptions',
              header: 'Exceptions',
              accessorKey: 'RecordsVerification.CurrentDayVariances.Exceptions',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'exceptions')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
          ],
        },
        {
          id: 'cumulativeVariances',
          header: 'Cumulative Variances',
          columns: [
            {
              id: 'cumOutstanding',
              header: 'Outstanding',
              accessorKey: 'RecordsVerification.CumulativeVariances.Outstanding',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'outstanding')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
            {
              id: 'cumExceptions',
              header: 'Exceptions',
              accessorKey: 'RecordsVerification.CumulativeVariances.Exceptions',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'exceptions')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
          ],
        },
      ],
    },
    {
      id: 'settlementVerification',
      header: () => (<span>Settlement Verification <span className="icon-saudi_riyal text-xs">&#xea;</span></span>),
      columns: [
        {
          id: 'claimed',
          header: 'Claimed',
          accessorKey: 'SettlementVerification.Claimed',
          cell: ({ getValue }) => {
            const value = getValue() as number;
            return (
              <span className={`text-right block ${getCellStyle(value, 'claimed')}`}>
                <DecimalNumber num={value} />
              </span>
            );
          },
        },
        {
          id: 'settled',
          header: 'Settled',
          accessorKey: 'SettlementVerification.Settled',
          cell: ({ getValue }) => {
            const value = getValue() as number;
            return (
              <span className={`text-right block ${getCellStyle(value, 'settled')}`}>
                <DecimalNumber num={value} />
              </span>
            );
          },
        },
        {
          id: 'settlementCurrentDayVariances',
          header: 'Current Day Variances',
          columns: [
            {
              id: 'awaitingSettlement',
              header: 'Awaiting Settlement',
              accessorKey: 'SettlementVerification.CurrentDayVariances.AwaitingSettlement',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'awaitingSettlement')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
            {
              id: 'settlementExceptions',
              header: 'Exceptions',
              accessorKey: 'SettlementVerification.CurrentDayVariances.Exceptions',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'exceptions')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
          ],
        },
        {
          id: 'settlementCumulativeVariances',
          header: 'Cumulative Variances',
          columns: [
            {
              id: 'settlementCumAwaiting',
              header: 'Awaiting Settlement',
              accessorKey: 'SettlementVerification.CumulativeVariances.AwaitingSettlement',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'awaitingSettlement')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
            {
              id: 'settlementCumExceptions',
              header: 'Exceptions',
              accessorKey: 'SettlementVerification.CumulativeVariances.Exceptions',
              cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                  <span className={`text-right block ${getCellStyle(value, 'exceptions')}`}>
                    <DecimalNumber num={value} />
                  </span>
                );
              },
            },
          ],
        },
      ],
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                viewTransaction(row.original);
                // toast.success('View action clicked for row:' + row.original.Id, {
                //   position: 'bottom-right',
                // });
              }}
              className="text-xs text-primary px-3 py-1 cursor-pointer"
            >
              View
            </Button>
          </div>
        );
      },
      width: 80,
    },
  ], [expanded, handleRowExpansion, isExpanding, viewTransaction]);

  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply filters
    Object.entries(filterState).forEach(([filterTag, filterValues]) => {
      if (filterValues.length > 0) {
        filtered = filterDataByNodeTag(filtered, filterTag, filterValues);
      }
    });

    return filtered;
  }, [data, filterState]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowId: (row) => row.Id, // Use the Id field from DataNode
    getRowCanExpand: (row) => {
      const hasChildren = Boolean(row.original.ChildNodes && row.original.ChildNodes.length > 0);
      return hasChildren;
    },
    getSubRows: (row) => row.ChildNodes,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });


  const resolveHeaderClassName = (headerGroupId: string) => {
    switch (headerGroupId) {
      case 'outstanding':
      case 'exceptions':
      case 'cumOutstanding':
      case 'cumExceptions':
        return 'bg-red-100 text-xs';

      case 'settlementCumAwaiting':
      case 'awaitingSettlement':
      case 'settlementExceptions':
      case 'settlementCumExceptions':
        return 'bg-blue-100 text-xs';
      case '2_currentDayVariances_outstanding':
      case '2_cumulativeVariances_cumOutstanding':
      case 'recorded':
      case 'verified':
        return 'bg-red-100 text-sm';
      case '2_settlementCurrentDayVariances_awaitingSettlement':
      case '2_settlementCumulativeVariances_settlementCumAwaiting':
      case 'claimed':
      case 'settled':
        return 'bg-blue-100 text-sm';


      case '1_recordsVerification_2_recorded_recorded':
      case '1_recordsVerification_2_verified_verified':
      case '2_recorded_recorded':
      case '2_verified_verified':
      case '2_currentDayVariances_outstanding':
      case '2_cumulativeVariances_cumOutstanding':

      case 'outstanding':
      case 'exceptions':
      case 'cumOutstanding':
      case 'cumExceptions':
        return 'bg-red-100';
      case '1_settlementVerification_2_claimed_claimed':
      case '2_claimed_claimed':
      case '2_settled_settled':
      case '2_settlementCurrentDayVariances_awaitingSettlement':
      case '2_settlementCumulativeVariances_settlementCumAwaiting':
      case 'claimed':
      case 'settled':
      case 'awaitingSettlement':
      case 'settlementExceptions':
      case 'settlementCumAwaiting':
      case 'settlementCumExceptions':
      case 'actions':
      case '1_actions_2_actions_actions':
      case '2_actions_actions':
        return 'bg-blue-100';
      case 'topic':
        return 'bg-slate-200 border-r-slate-300 opacity-80';

      case '1_topic_2_topic_topic':
      case '2_topic_topic':
        return '!border-0 bg-white'
      default:
        return 'bg-white';
    }
  }

  const allRows = table.getExpandedRowModel().rows;
  const displayedRows = allRows.slice(0, visibleRows);
  const hasMoreRows = visibleRows < allRows.length;

  return (
    <div className="overflow-x-auto  bg-white" ref={tableRef}>
      <table className="w-full border-collapse" {...{
        style: {
          // width: table.getCenterTotalSize(),
        },
      }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-gradient-to-r from-slate-50 to-gray-50">
              {headerGroup.headers.map((header) => {
                return (
                  <th
                    key={header.id}
                    id={header.id}
                    colSpan={header.colSpan}
                    className={`border-b border-modern-light px-2 py-2 text-left font-semibold text-slate-900 text-sm ${resolveHeaderClassName(header.id)} `}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="text-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {displayedRows.map((row, index) => (
            <tr 
              key={row.id} 
              className={`${getRowStyle(row.original.NodeTag, row.depth)} transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 hover:shadow-sm border-b border-modern-light/50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-2 text-sm  border-modern-light/30 last:border-r-0"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {isLoadingMore && (
            <tr>
              <td colSpan={13} className="px-4 py-8 text-sm bg-gradient-to-r from-blue-50/50 to-indigo-50/30 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-6 w-6 border-2 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <span className="text-gray-600 font-medium">Loading more rows...</span>
                </div>
              </td>
            </tr>
          )}
          {allRows.length === 0 && (
            <tr>
              <td colSpan={13} className="px-4 py-12 text-sm bg-gradient-to-r from-gray-50/50 to-slate-50/30 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">No records found</p>
                    <p className="text-gray-500 text-xs mt-1">Try adjusting your filters or date range</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {hasMoreRows && (
        <div className="p-6 bg-gradient-to-r from-slate-50/50 to-gray-50/30 border-t border-modern-light">
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-sm border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 px-6 py-2 rounded-lg shadow-subtle hover:shadow-md"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Load More Rows</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {allRows.length - visibleRows} remaining
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to filter data by NodeTag and NodeLabel
function filterDataByNodeTag(data: DataNode[], filterTag: string, filterValues: string[]): DataNode[] {
  const filterTagMap: { [key: string]: string } = {
    'TERMINAL': 'TERMINAL',
    'DRIVER': 'DRIVER',
    'PAYMENT_METHOD': 'PAYMENT_METHOD',
    'ROUTE': 'ROUTE',
  };

  const targetNodeTag = filterTagMap[filterTag];
  if (!targetNodeTag) return data;

  return data.filter(node => {
    // Check if current node matches the filter
    if (node.NodeTag === targetNodeTag && filterValues.includes(node.NodeLabel)) {
      return true;
    }

    // Recursively check child nodes
    if (node.ChildNodes && node.ChildNodes.length > 0) {
      const filteredChildren = filterDataByNodeTag(node.ChildNodes, filterTag, filterValues);
      if (filteredChildren.length > 0) {
        // Create a new node with filtered children
        return true;
      }
    }

    return false;
  });
}
