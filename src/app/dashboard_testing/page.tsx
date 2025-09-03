'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ReconciliationTable } from '@/components/ReconciliationTable';
import { DashboardData, Filter, FilterState } from '@/types';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

function DashboardTestingContent() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['POS_CARDS']);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(true);

  const businessDay = dashboardData?.BusinessDay || '';

  const extractUniqueValues = useCallback((nodes: DashboardData['ChildNodes'], filterTag: string): string[] => {
    const values: string[] = [];
    nodes.forEach(node => {
      if (node.NodeTag === filterTag) {
        values.push(node.NodeLabel);
      }
      if (node.ChildNodes && node.ChildNodes.length > 0) {
        values.push(...extractUniqueValues(node.ChildNodes, filterTag));
      }
    });
    return [...new Set(values)];
  }, []);

  const updateAvailableFilters = useCallback(() => {
    if (!dashboardData) return;

    // Extract available filters from the data structure
    const extractFilters = (nodes: DashboardData['ChildNodes']): string[] => {
      const filters: string[] = [];
      nodes.forEach(node => {
        if (node.NodeTag && node.NodeTag !== 'TOPIC') {
          filters.push(node.NodeTag);
        }
        if (node.ChildNodes && node.ChildNodes.length > 0) {
          filters.push(...extractFilters(node.ChildNodes));
        }
      });
      return [...new Set(filters)];
    };

    const availableFilterTags = extractFilters(dashboardData.ChildNodes || []);
    
    // Create filter objects based on available data
    const relevantFilters: Filter[] = availableFilterTags.map(tag => ({
      FilterTag: tag,
      FilterLabel: tag.charAt(0) + tag.slice(1).toLowerCase().replace(/_/g, ' '),
      FilterValues: extractUniqueValues(dashboardData.ChildNodes || [], tag)
    }));

    setAvailableFilters(relevantFilters);

    // Clear filter state for filters that are no longer available
    setFilterState(prevFilterState => {
      const newFilterState = { ...prevFilterState };
      Object.keys(newFilterState).forEach(key => {
        if (!availableFilterTags.includes(key)) {
          delete newFilterState[key];
        }
      });
      return newFilterState;
    });
  }, [dashboardData, extractUniqueValues]);

  useEffect(() => {
    if (dashboardData) {
      updateAvailableFilters();
    }
  }, [dashboardData, updateAvailableFilters]);

  const handleFilterChange = (filterTag: string, values: string[]) => {
    setFilterState(prev => ({
      ...prev,
      [filterTag]: values
    }));
  };



  const loadJsonData = () => {
    try {
      setLoading(true);
      const parsedData = JSON.parse(jsonInput);
      
      // Validate the data structure
      if (!parsedData.ChildNodes || !Array.isArray(parsedData.ChildNodes)) {
        throw new Error('Invalid data structure: ChildNodes array is required');
      }

      if (!parsedData.AreaCode || !parsedData.OutletCode) {
        throw new Error('Invalid data structure: AreaCode and OutletCode are required');
      }

      setDashboardData(parsedData);
      setShowJsonInput(false);
      toast.success('JSON data loaded successfully!');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid JSON format');
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    setDashboardData(null);
    setFilterState({});
    setJsonInput('');
    setShowJsonInput(true);
    setAvailableFilters([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (showJsonInput) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="text-xl font-semibold text-gray-900 cursor-pointer" onClick={() => router.push('/')}>
                  <Image src="/swittle-logo.png" alt="logo" width={60} height={50} />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-700">lhallal@technorion.com</span>
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Testing</h1>
          </div>

          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Input Your JSON Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="json-input" className="text-base font-medium">
                  Paste your reconciliation data JSON here:
                </Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your JSON data here..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
              <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={loadJsonData}
                    disabled={!jsonInput.trim()}
                    className="px-8 py-3 text-white"
                  >
                    Load Data
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard-selection')}
                    className="px-8 py-3"
                  >
                    Back to Selection
                  </Button>
                </div>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Expected JSON Structure:</h3>
                  <pre className="text-[10px] text-blue-800 overflow-x-auto">
{`{
  "AreaId": 1245,
  "AreaCode": "DC-101",
  "AreaName": "Distribution Center",
  "OutletId": 9865,
  "OutletCode": "CA1",
  "OutletName": "Central 1",
  "BusinessDay": "2025-09-02",
  "ChildNodes": [
    {
      "Id": "unique-id-1",
      "NodeTag": "TOPIC",
      "NodeLabel": "Topic Name",
      "RecordsVerification": {
        "Recorded": 1000.0,
        "Verified": 950.0,
        "CurrentDayVariances": {
          "Outstanding": 50.0,
          "Exceptions": 0.0
        }
      },
      "SettlementVerification": {
        "Claimed": 950.0,
        "Settled": 900.0,
        "CurrentDayVariances": {
          "AwaitingSettlement": 50.0,
          "Exceptions": 0.0
        }
      },
      "ChildNodes": [...]
    }
  ]
}`}
                  </pre>
                </div>
                
               
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="text-xl font-semibold text-gray-900 cursor-pointer" onClick={() => router.push('/')}>
                  <Image src="/swittle-logo.png" alt="logo" width={60} height={50} />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-700">lhallal@technorion.com</span>
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Testing</h1>
          </div>

          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">No Data Available</h2>
              <p className="text-gray-600 mb-6">
                Please input your JSON data to test the dashboard functionality.
              </p>
              <div className="flex justify-center space-x-4">
                <Button onClick={() => setShowJsonInput(true)}>
                  Input JSON Data
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard-selection')}>
                  Back to Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-xl font-semibold text-gray-900 cursor-pointer" onClick={() => router.push('/')}>
                <Image src="/swittle-logo.png" alt="logo" width={60} height={50} />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-700">lhallal@technorion.com</span>
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Title */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Testing</h1>
          <div className="flex items-center space-x-4">
            {/* Topics Selection */}
            <div className="space-y-0 flex items-center gap-2 hidden">
              <Label className="text-lg font-bold text-gray-900">Topics</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-48 justify-between text-left font-normal"
                  >
                    <span className="truncate">
                      {selectedTopics.length > 0
                        ? `${selectedTopics.length} selected`
                        : 'Select topics'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-white">
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Topics</span>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-auto p-1">
                    {['POS_CARDS', 'CASH', 'OTHER_TOPICS'].map((topic) => (
                      <div key={topic} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md">
                        <Checkbox
                          id={`topic-${topic}`}
                          checked={selectedTopics.includes(topic)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTopics(prev => [...prev, topic]);
                            } else {
                              if (selectedTopics.length > 1) {
                                setSelectedTopics(prev => prev.filter(t => t !== topic));
                                setFilterState({});
                              } else {
                                toast.error('You need to select at least one topic', {
                                  position: 'top-right',
                                });
                              }
                            }
                          }}
                        />
                        <label
                          htmlFor={`topic-${topic}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {topic.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <Button variant="outline" onClick={resetData} className="text-sm">
              Reset Data
            </Button>
          </div>
        </div>

        <Card className="mb-8 hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900">Filters</CardTitle>
              {Object.keys(filterState).some(key => filterState[key]?.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterState({})}
                  className="text-xs"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Dynamic Filters */}
              {availableFilters.map((filter) => (
                <div key={filter.FilterTag} className="space-y-2">
                  <Label>{filter.FilterLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-left font-normal"
                      >
                        <span className="truncate">
                          {filterState[filter.FilterTag]?.length > 0
                            ? `${filterState[filter.FilterTag]?.length} selected`
                            : `Select ${filter.FilterLabel}`}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 bg-white">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{filter.FilterLabel}</span>
                          {filterState[filter.FilterTag]?.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFilterChange(filter.FilterTag, [])}
                              className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Clear all
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-auto p-1">
                        {filter.FilterValues.map((value) => (
                          <div key={value} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md">
                            <Checkbox
                              id={`${filter.FilterTag}-${value}`}
                              checked={filterState[filter.FilterTag]?.includes(value) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = filterState[filter.FilterTag] || [];
                                if (checked) {
                                  handleFilterChange(filter.FilterTag, [...currentValues, value]);
                                } else {
                                  handleFilterChange(filter.FilterTag, currentValues.filter(v => v !== value));
                                }
                              }}
                            />
                            <label
                              htmlFor={`${filter.FilterTag}-${value}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {value}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}

              {/* Business Day */}
              <div className="space-y-2">
                <Label>Business Day</Label>
                <Input
                  type="date"
                  value={businessDay || ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (dashboardData) {
                      const updatedData: DashboardData = {
                        ...dashboardData,
                        BusinessDay: newDate
                      };
                      setDashboardData(updatedData);
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Table */}
        <Card>
          <CardHeader>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {dashboardData.AreaCode} ({dashboardData.OutletCode}) CASHIER RECONCILIATION DASHBOARD
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <ReconciliationTable
              data={dashboardData.ChildNodes}
              filterState={filterState}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardTesting() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard testing...</p>
        </div>
      </div>
    }>
      <DashboardTestingContent />
    </Suspense>
  );
}
