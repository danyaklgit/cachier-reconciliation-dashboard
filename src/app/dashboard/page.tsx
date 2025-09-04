'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReconciliationTable } from '@/components/ReconciliationTable';
import { DashboardData, Filter, FilterState } from '@/types';
import topicsData from '@/data/topics.json';
import filtersData from '@/data/filters.json';
import areasData from '@/data/areas.json';
import outletsData from '@/data/outlets.json';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

function DashboardContent() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['POS_CARDS']);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [loading, setLoading] = useState(false);

  // New selection states
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [selectedBusinessDay, setSelectedBusinessDay] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });

  // Helper functions to get previous and next day dates
  const getPreviousDay = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const getNextDay = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  // Load data when selections change
  useEffect(() => {
    if (selectedArea && selectedOutlet && selectedBusinessDay) {
      // Format date as DDMMYYYY to match the data file naming convention
      const dateParts = selectedBusinessDay.split('-');
      const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
      const fileName = `${selectedArea}_${selectedOutlet}_${formattedDate}.json`;
      loadDashboardData(fileName);
    } else {
      setDashboardData(null);
      setLoading(false); // Stop loading when selections are incomplete
    }
  }, [selectedArea, selectedOutlet, selectedBusinessDay]);

  const updateAvailableFilters = useCallback(() => {
    const selectedTopicObjects = topicsData.Topics.filter(topic =>
      selectedTopics.includes(topic.TopicTag)
    );

    const availableFilterTags = selectedTopicObjects.flatMap(topic => topic.AvailableFilterTags);
    const uniqueFilterTags = [...new Set(availableFilterTags)];

    const relevantFilters = filtersData.Filters.filter(filter =>
      uniqueFilterTags.includes(filter.FilterTag)
    );

    setAvailableFilters(relevantFilters);

    // Clear filter state for filters that are no longer available
    setFilterState(prevFilterState => {
      const newFilterState = { ...prevFilterState };
      Object.keys(newFilterState).forEach(key => {
        if (!uniqueFilterTags.includes(key)) {
          delete newFilterState[key];
        }
      });
      return newFilterState;
    });
  }, [selectedTopics]);

  useEffect(() => {
    updateAvailableFilters();
  }, [updateAvailableFilters]);

  const loadDashboardData = async (fileName: string) => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // For now, we'll use the mock data directly
      const data = await import(`@/data/${fileName}`);
      setDashboardData(data.default);
    } catch {
      // Silently handle the error and show the no data message
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterTag: string, values: string[]) => {
    setFilterState(prev => ({
      ...prev,
      [filterTag]: values
    }));
  };
  const removeFilter = (filterTag: string) => {
    setFilterState(prev => ({
      // remove the filter key from the object
      ...Object.fromEntries(Object.entries(prev).filter(([key]) => key !== filterTag))
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const navigateToDate = (direction: 'prev' | 'next') => {
    if (!selectedBusinessDay) return;

    const currentDate = new Date(selectedBusinessDay);
    const newDate = new Date(currentDate);

    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }

    const newDateString = newDate.toISOString().split('T')[0];
    setSelectedBusinessDay(newDateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-xl font-semibold text-gray-900 cursor-pointer" onClick={() => router.push('/')}>

                <Image src="/logo_bwa_color.svg" alt="logo" width={60} height={50} />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard_testing')}
              className="text-sm cursor-pointer hover:bg-gray-200"
            >
              Test Custom Data
            </Button>
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
        <div className="mb-4">

          {/* Selection Controls */}
          <div className="flex items-center mb-6 justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">CASHIER RECONCILIATION DASHBOARD</h1>

              </div>
              <div className="space-y-2 flex items-center gap-2">
                <MultiSelect
                  options={areasData.Areas.map(area => ({
                    value: area.AreaId.toString(),
                    label: `${area.AreaCode} - ${area.AreaName}`
                  }))}
                  selectedValues={selectedArea ? [selectedArea] : []}
                  onSelectionChange={(values) => setSelectedArea(values[0] || '')}
                  placeholder="Select area"
                  className="w-fit"
                  minSelections={0}
                  maxSelections={1}
                  showSelectedValues={(selectedValues) => { return `Area: ${areasData.Areas.find(area => area.AreaId.toString() === selectedValues[0])?.AreaName}` }}
                />
              </div>
              <div className="space-y-2">
                <MultiSelect
                  options={outletsData.Outlets.map(outlet => ({
                    value: outlet.OutletId.toString(),
                    label: `${outlet.OutletCode} - ${outlet.OutletName}`
                  }))}
                  selectedValues={selectedOutlet ? [selectedOutlet] : []}
                  onSelectionChange={(values) => setSelectedOutlet(values[0] || '')}
                  placeholder="Select outlet"
                  className="w-fit"
                  minSelections={0}
                  maxSelections={1}
                  showSelectedValues={(selectedValues) => { return `Outlet: ${selectedValues.map(value => outletsData.Outlets.find(outlet => outlet.OutletId.toString() === value)?.OutletName).join(', ')}` }}
                />
              </div>
            </div>



            <div className="space-y-2 flex items-bottom justify-end gap-2 justify-self-end">
              {/* <Label className="text-lg font-bold text-gray-900">Topics</Label> */}

              <MultiSelect
                options={topicsData.Topics.map(topic => ({
                  value: topic.TopicTag,
                  label: topic.TopicLabel
                }))}
                selectedValues={selectedTopics}
                onSelectionChange={(values) => {
                  setSelectedTopics(values);
                  if (values.length === 0) {
                    setFilterState({});
                  }
                }}
                placeholder="Select topics"
                className="w-fit"
                minSelections={1}
                showSelectedValues={(selectedValues) => { return `Topics: ${selectedValues.map(value => topicsData.Topics.find(topic => topic.TopicTag === value)?.TopicLabel).join(', ')}` }}
              />
            </div>
          </div>
        </div>

        {/* Topics Selection */}
        {/* <div className="mb-8 flex justify-between items-center">
          <div className="space-y-0 flex items-center gap-4">
            <div className="space-y-0 flex items-center gap-2">
              <Label className="text-lg font-bold text-gray-900">Topics</Label>
              <MultiSelect
                options={topicsData.Topics.map(topic => ({
                  value: topic.TopicTag,
                  label: topic.TopicLabel
                }))}
                selectedValues={selectedTopics}
                onSelectionChange={(values) => {
                  setSelectedTopics(values);
                  if (values.length === 0) {
                    setFilterState({});
                  }
                }}
                placeholder="Select topics"
                className="w-48"
                minSelections={1}
              />
            </div>
          </div>
        </div> */}

        {dashboardData && (selectedArea && selectedOutlet && selectedBusinessDay) && <Card className={
          `mb-4 p-4 px-1 ${Object.keys(filterState).length > 0 ? 'bg-white' : 'bg-white/50'}`
        }>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900">Custom Filters</CardTitle>
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
                  <MultiSelect
                    options={filter.FilterValues.map(value => ({
                      value: value,
                      label: value
                    }))}
                    selectedValues={filterState[filter.FilterTag] || []}
                    onSelectionChange={(values) => handleFilterChange(filter.FilterTag, values)}
                    placeholder={`Select ${filter.FilterLabel}`}
                    className="w-full"
                  />
                </div>
              ))}

              {/* Business Day */}
              {/* <div className="space-y-2">
                <Label>Business Day</Label>
                <Input
                  type="date"
                  value={businessDay || ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    // Format date as DDMMYYYY to match the data file naming convention
                    const dateParts = newDate.split('-');
                    const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
                    const newFileName = `${areaId}_${outletId}_${formattedDate}.json`;
                    window.history.pushState(
                      null,
                      '',
                      `/dashboard?data=${newFileName}&area=${areaId}&outlet=${outletId}&date=${newDate}`
                    );
                  }}
                />
              </div> */}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* selected filters */}
              {Object.keys(filterState).map((key) => (
                <Badge key={key} className="bg-gray-100 rounded-md p-1 px-2 group">
                  <Label>{filtersData.Filters.find(filter => filter.FilterTag === key)?.FilterLabel}</Label>
                  <p>{filterState[key].map(value => filtersData.Filters.find(filter => filter.FilterTag === key)?.FilterValues.find(v => v === value)).join(', ')}</p>
                  <Button variant="ghost" size="icon" onClick={() => removeFilter(key)} className="ml-2 group-hover:bg-gray-200 hover:text-red-700 cursor-pointer">
                    <X className="w-4 h-4" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>}

        {/* No Data Message */}
        {!dashboardData && (selectedArea && selectedOutlet && selectedBusinessDay) && (
          <Card className="mb-8 bg-white">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">No Data Available</h2>
              <p className="text-gray-600 mb-6">
                There&apos;s no data available for the selected combination of area, outlet, and date.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Area:</span> {selectedArea || 'Not selected'}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Outlet:</span> {selectedOutlet || 'Not selected'}
                </p>
                <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-end justify-center space-x-10 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span><ChevronLeft className="h-4 w-4" /></span>
                    <span>{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>
                  <div className="font-semibold flex flex-col items-center space-x-2 gap-2">
                    <span className='text-sm'>Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span>{selectedBusinessDay ? formatDate(getNextDay(selectedBusinessDay)) : ''}</span>
                    <span><ChevronRight className="h-4 w-4" /></span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!dashboardData && (!selectedArea || !selectedOutlet || !selectedBusinessDay) && (<Card className="mb-8 bg-white">
          <CardContent className="p-3 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {/* <h2 className="text-2xl font-semibold text-gray-900 mb-3">Please select an area and outlet</h2> */}
            <p className="text-gray-600 mb-0">
              Please select an area and outlet to continue.
            </p>
          </CardContent>
        </Card>)}

        {/* Main Dashboard Table */}
        {dashboardData && (
          <Card className="bg-white">
            <CardHeader>
              <div className="text-center">
                {/* <h2 className="text-2xl font-bold text-gray-900">
                {dashboardData.AreaCode} ({dashboardData.OutletCode}) 
              </h2> */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-end justify-center space-x-10 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span><ChevronLeft className="h-4 w-4" /></span>
                    <span>{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>
                  <div className="font-semibold flex flex-col items-center space-x-2 gap-2">
                    <span className='text-sm'>Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span>{selectedBusinessDay ? formatDate(getNextDay(selectedBusinessDay)) : ''}</span>
                    <span><ChevronRight className="h-4 w-4" /></span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReconciliationTable
                data={dashboardData.ChildNodes}
                filterState={{}}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
