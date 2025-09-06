'use client';

import React, { useState, useMemo } from 'react';
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

interface ReconciliationTableProps {
  data: DataNode[];
  filterState: FilterState;
}

const formatNumber = (num: number): string => {
  if (num === 0) return '-';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getRowStyle = (nodeTag: string, depth: number) => {
  // const baseStyle = 'border-b border-gray-50';
  const baseStyle = '';
  const depthStyle = depth === 0 ?
    ' text-primary text-base' :
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
      return 'text-blue-400 font-medium';
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

export function ReconciliationTable({ data, filterState }: ReconciliationTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

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
            onClick={() => {
              setExpanded(prev => ({
                ...(prev as Record<string, boolean>),
                [rowId]: !(prev as Record<string, boolean>)[rowId]
              }));
            }}>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"

                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
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
                {formatNumber(getValue() as number)}
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
                {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
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
                {formatNumber(value)}
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
                {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
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
                    {formatNumber(value)}
                  </span>
                );
              },
            },
          ],
        },
      ],
    },
  ], [expanded]);

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
      // console.log(`Row ${row.original.Id} (${row.original.NodeLabel}): hasChildren=${hasChildren}, ChildNodes:`, row.original.ChildNodes);
      return hasChildren;
    },
    getSubRows: (row) => row.ChildNodes,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Debug logging
  // console.log('Current expanded state:', expanded);
  // console.log('Filtered data:', filteredData);
  // console.log('Expanded rows:', table.getExpandedRowModel().rows);
  // console.log('All rows:', table.getRowModel().rows);

  const resolveHeaderClassName = (headerGroupId: string) => {
    switch (headerGroupId) {
      case '1_recordsVerification_2_recorded_recorded':
      case '1_recordsVerification_2_verified_verified':

      case '2_recorded_recorded':
      case '2_verified_verified':
      case '2_currentDayVariances_outstanding':
      case '2_cumulativeVariances_cumOutstanding':
      case 'recorded':
      case 'verified':
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
        return 'bg-blue-100';
      case 'topic':
        return 'bg-primary opacity-80';
      default:
        return 'bg-white';
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" {...{
        style: {
          // width: table.getCenterTotalSize(),
        },
      }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} >
              {headerGroup.headers.map((header) => {
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`border border-gray-300 border-x-gray-300 px-2 py-2 text-left font-semibold text-slate-900 text-sm ${resolveHeaderClassName(header.id)}`}
                  // style={{ width: header.getSize() }}
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
          {table.getExpandedRowModel().rows.map((row) => (
            <tr key={row.id} className={`${getRowStyle(row.original.NodeTag, row.depth)} hover:bg-gray-200`}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border border-gray-200 border-x-transparent px-2 py-2 text-sm bg-white "
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
