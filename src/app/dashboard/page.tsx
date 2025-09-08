'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { ChevronLeft, ChevronRight, FilterIcon, X, Settings, GripVertical, RotateCcw, InfoIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReconciliationTable } from '@/components/ReconciliationTable';
import { Transaction } from '@/components/Transaction';
import { DashboardData, DataNode, Filter, FilterState, Topic } from '@/types';
import { getMixedFontClass } from '@/lib/font-utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function DashboardContent() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['POSCARDS']);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [appliedFilterState, setAppliedFilterState] = useState<FilterState>({});
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersData, setFiltersData] = useState<{ Filters: Filter[] }>({ Filters: [] });
  const [topicsData, setTopicsData] = useState<{ Topics: Topic[] }>({ Topics: [] });
  const [tenantsData, setTenantsData] = useState<{
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
  }>({ Tenants: [] });
  const [topicsHierarchy, setTopicsHierarchy] = useState<{ [topicTag: string]: string[] }>({});
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ topicTag: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ topicTag: string; index: number } | null>(null);
  const [tempTopicsHierarchy, setTempTopicsHierarchy] = useState<{ [topicTag: string]: string[] }>({});
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<DataNode | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // New selection states
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedBusinessDay, setSelectedBusinessDay] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [debouncedBusinessDay, setDebouncedBusinessDay] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });

  // Initialize topics hierarchy from localStorage or defaults
  // Get default hierarchy for a topic from API data
  const getDefaultHierarchyForTopic = useCallback((topicTag: string) => {
    const topic = topicsData.Topics.find(t => t.Tag === topicTag);
    return topic?.DefaultFilterHierarchy || [];
  }, [topicsData.Topics]);

  const initializeTopicsHierarchy = useCallback(() => {
    const savedHierarchies = localStorage.getItem('topicsHierarchy_');
    if (savedHierarchies) {
      try {
        const parsed = JSON.parse(savedHierarchies);
        setTopicsHierarchy(parsed);
      } catch (error) {
        console.error('Error parsing saved hierarchies:', error);
        // Set empty initially, will be populated when topics data is loaded
        setTopicsHierarchy({});
      }
    } else {
      // Set empty initially, will be populated when topics data is loaded
      setTopicsHierarchy({});
    }
  }, []);

  // Save topics hierarchy to localStorage
  const saveTopicsHierarchy = useCallback((hierarchies: { [topicTag: string]: string[] }) => {
    localStorage.setItem('topicsHierarchy_', JSON.stringify(hierarchies));
    setTopicsHierarchy(hierarchies);
  }, []);

  // Drag and drop handlers for hierarchy items
  const handleDragStart = (e: React.DragEvent, topicTag: string, index: number) => {
    setDraggedItem({ topicTag, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ topicTag, index }));
  };

  const handleDragEnd = () => {
    // Always reset states on drag end
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, topicTag: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only allow dropping within the same topic
    if (draggedItem && draggedItem.topicTag === topicTag && draggedItem.index !== index) {
      setDragOverIndex({ topicTag, index });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we're actually leaving the element (not just moving to a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTopicTag: string, targetIndex: number) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { topicTag: sourceTopicTag, index: sourceIndex } = draggedItem;

    // Only allow dropping within the same topic
    if (sourceTopicTag !== targetTopicTag) {
      handleDragEnd();
      return;
    }

    if (sourceIndex === targetIndex) {
      handleDragEnd();
      return;
    }

    const newHierarchies = { ...tempTopicsHierarchy };
    const sourceHierarchy = [...newHierarchies[sourceTopicTag]];

    // Reordering within the same topic
    const [movedItem] = sourceHierarchy.splice(sourceIndex, 1);
    sourceHierarchy.splice(targetIndex, 0, movedItem);
    newHierarchies[sourceTopicTag] = sourceHierarchy;

    setTempTopicsHierarchy(newHierarchies);
    handleDragEnd();
  };

  // Get filter label for display
  const getFilterLabel = (filterTag: string) => {
    const filter = filtersData.Filters.find(f => f.Tag === filterTag);
    return filter?.Label || filterTag;
  };

  // Helper functions to get areas and outlets from selected tenant
  const getSelectedTenant = useCallback(() => {
    return tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedTenant);
  }, [selectedTenant, tenantsData.Tenants]);

  const getAvailableAreas = useCallback(() => {
    const tenant = getSelectedTenant();
    return tenant?.Areas || [];
  }, [getSelectedTenant]);

  const getAvailableOutlets = useCallback(() => {
    const areas = getAvailableAreas();
    // if (selectedAreas.length === 1) {
    const selectedAreaObjs = areas.filter(area => selectedAreas.includes(area.AreaId.toString()));
    const allOutlets = selectedAreaObjs.flatMap(area => area.Outlets);
    // Remove duplicates based on OutletId
    const uniqueOutlets = allOutlets.filter((outlet, index, self) =>
      index === self.findIndex(o => o.OutletId === outlet.OutletId)
    );
    return uniqueOutlets;
    // } 
    // else {
    //   return areas.flatMap(area => area.Outlets);
    // }
  }, [getAvailableAreas, selectedAreas]);

  const getTenantCode = useCallback(() => {
    const tenant = getSelectedTenant();
    return tenant?.TenantCode || '';
  }, [getSelectedTenant]);

  // Check if hierarchy has changed from default
  const hasHierarchyChanged = (topicTag: string, useTempState: boolean = false) => {
    const currentHierarchy = useTempState
      ? (tempTopicsHierarchy[topicTag] || topicsHierarchy[topicTag] || [])
      : (topicsHierarchy[topicTag] || []);
    const defaultHierarchy = getDefaultHierarchyForTopic(topicTag);

    // If length is different, it's changed
    if (currentHierarchy.length !== defaultHierarchy.length) return true;

    // Check if the order or content is different
    return currentHierarchy.some((item, index) => item !== defaultHierarchy[index]);
  };

  // Reset hierarchy to default for a specific topic
  const resetTopicHierarchy = (topicTag: string) => {
    const newHierarchies = { ...tempTopicsHierarchy };
    newHierarchies[topicTag] = [...getDefaultHierarchyForTopic(topicTag)];
    setTempTopicsHierarchy(newHierarchies);
  };

  // Handle opening the hierarchy modal
  const handleOpenHierarchyModal = () => {
    setTempTopicsHierarchy({ ...topicsHierarchy });
    setIsHierarchyModalOpen(true);
  };

  // Handle closing the hierarchy modal and applying changes
  const handleCloseHierarchyModal = () => {
    saveTopicsHierarchy(tempTopicsHierarchy);
    setIsHierarchyModalOpen(false);
  };

  // Handle canceling changes
  const handleCancelHierarchyModal = () => {
    setTempTopicsHierarchy({});
    setIsHierarchyModalOpen(false);
  };

  // Get available filter tags for a topic (including removed default ones, excluding CUMULATIVE_FROM_DATE)
  const getAvailableFilterTagsForTopic = (topicTag: string) => {
    const topic = topicsData.Topics.find(t => t.Tag === topicTag);
    if (!topic) return [];

    const currentHierarchy = tempTopicsHierarchy[topicTag] || [];

    return topic.AvailableFilterTags.filter(tag =>
      !currentHierarchy.includes(tag) &&
      tag !== 'CUMULATIVE_FROM_DATE'
    );
  };

  // Check if a filter is a default filter for a topic
  const isDefaultFilter = (topicTag: string, filterTag: string) => {
    const defaultTags = getDefaultHierarchyForTopic(topicTag);
    return defaultTags.includes(filterTag);
  };

  // Add a filter tag to hierarchy
  const addFilterToHierarchy = (topicTag: string, filterTag: string) => {
    const newHierarchies = { ...tempTopicsHierarchy };
    if (!newHierarchies[topicTag]) {
      newHierarchies[topicTag] = [];
    }
    newHierarchies[topicTag] = [...newHierarchies[topicTag], filterTag];
    setTempTopicsHierarchy(newHierarchies);
  };

  // Remove a filter tag from hierarchy
  const removeFilterFromHierarchy = (topicTag: string, filterTag: string) => {
    const newHierarchies = { ...tempTopicsHierarchy };
    if (newHierarchies[topicTag]) {
      newHierarchies[topicTag] = newHierarchies[topicTag].filter(tag => tag !== filterTag);
    }
    setTempTopicsHierarchy(newHierarchies);
  };

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

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('dashboardState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState.selectedAreas) setSelectedAreas(parsedState.selectedAreas);
        if (parsedState.selectedOutlets) setSelectedOutlets(parsedState.selectedOutlets);
        // Handle backward compatibility with single selections
        if (parsedState.selectedArea && !parsedState.selectedAreas) setSelectedAreas([parsedState.selectedArea]);
        if (parsedState.selectedOutlet && !parsedState.selectedOutlets) setSelectedOutlets([parsedState.selectedOutlet]);
        if (parsedState.selectedTenant) setSelectedTenant(parsedState.selectedTenant);
        if (parsedState.selectedBusinessDay) {
          setSelectedBusinessDay(parsedState.selectedBusinessDay);
          setDebouncedBusinessDay(parsedState.selectedBusinessDay);
        }
        if (parsedState.selectedTopics) setSelectedTopics(parsedState.selectedTopics);
        if (parsedState.filterState) {
          setFilterState(parsedState.filterState);
          setAppliedFilterState(parsedState.filterState);
        }
      } catch (error) {
        console.error('Error loading saved dashboard state:', error);
      }
    }
    initializeTopicsHierarchy();
    setIsInitialLoadComplete(true);
  }, [initializeTopicsHierarchy]);

  // Populate default hierarchies when topics data is loaded
  useEffect(() => {
    if (topicsData.Topics.length > 0) {
      const currentHierarchies = { ...topicsHierarchy };
      let hasChanges = false;

      // For each topic, if no hierarchy is set, use the default from API
      topicsData.Topics.forEach(topic => {
        if (!currentHierarchies[topic.Tag] || currentHierarchies[topic.Tag].length === 0) {
          currentHierarchies[topic.Tag] = [...topic.DefaultFilterHierarchy];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setTopicsHierarchy(currentHierarchies);
        saveTopicsHierarchy(currentHierarchies);
      }
    }
  }, [topicsData.Topics, topicsHierarchy, saveTopicsHierarchy]);

  // Validate saved selections after tenant data is loaded
  useEffect(() => {
    if (tenantsData.Tenants.length > 0 && selectedTenant) {
      const availableAreas = getAvailableAreas();
      const validAreas = selectedAreas.filter(areaId =>
        availableAreas.some(area => area.AreaId.toString() === areaId)
      );
      if (validAreas.length !== selectedAreas.length) {
        setSelectedAreas(validAreas);
        setSelectedOutlets([]); // Clear outlets if areas changed
      } else if (validAreas.length > 0) {
        const availableOutlets = getAvailableOutlets();
        const validOutlets = selectedOutlets.filter(outletId =>
          availableOutlets.some(outlet => outlet.OutletId.toString() === outletId)
        );
        if (validOutlets.length !== selectedOutlets.length) {
          setSelectedOutlets(validOutlets);
        }
      }
    }
  }, [tenantsData.Tenants, selectedTenant, selectedAreas, selectedOutlets, getAvailableAreas, getAvailableOutlets]);

  // Clear areas and outlets when tenant changes (only after initial load and not during validation)
  useEffect(() => {
    if (isInitialLoadComplete && selectedTenant && tenantsData.Tenants.length > 0) {
      const availableAreas = getAvailableAreas();
      const validAreas = selectedAreas.filter(areaId =>
        availableAreas.some(area => area.AreaId.toString() === areaId)
      );
      if (validAreas.length !== selectedAreas.length) {
        setSelectedAreas(validAreas);
        setSelectedOutlets([]); // Clear outlets if areas changed
      }
    }
  }, [isInitialLoadComplete, selectedTenant, getAvailableAreas, selectedAreas, tenantsData.Tenants.length]);

  // Clear outlets when areas change (only after initial load and not during validation)
  useEffect(() => {
    if (isInitialLoadComplete && selectedAreas.length > 0 && tenantsData.Tenants.length > 0) {
      const availableOutlets = getAvailableOutlets();
      const validOutlets = selectedOutlets.filter(outletId =>
        availableOutlets.some(outlet => outlet.OutletId.toString() === outletId)
      );
      if (validOutlets.length !== selectedOutlets.length) {
        setSelectedOutlets(validOutlets);
      }
    }
  }, [isInitialLoadComplete, selectedAreas, getAvailableOutlets, selectedOutlets, tenantsData.Tenants.length]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      selectedAreas,
      selectedOutlets,
      selectedTenant,
      selectedBusinessDay,
      selectedTopics,
      filterState
    };
    localStorage.setItem('dashboardState', JSON.stringify(stateToSave));
  }, [selectedAreas, selectedOutlets, selectedTenant, selectedBusinessDay, selectedTopics, filterState]);


  const updateAvailableFilters = useCallback(() => {
    const selectedTopicObjects = topicsData.Topics.filter(topic =>
      selectedTopics.includes(topic.Tag)
    );

    const availableFilterTags = selectedTopicObjects.flatMap(topic => topic.AvailableFilterTags);
    const uniqueFilterTags = [...new Set(availableFilterTags)];

    const relevantFilters = filtersData.Filters.filter(filter =>
      uniqueFilterTags.includes(filter.Tag) && filter.Values
    ) as Filter[];

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
  }, [selectedTopics, filtersData, topicsData]);

  const fetchFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);
      const response = await fetch('/api/get-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // areaId: areaId || null,
          areaId: null,
          // outletId: outletId || null,
          outletId: null,
          languageCode: 'en'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Set both filters and topics data from the API response
      setFiltersData({ Filters: data.Filters || [] });
      setTopicsData({ Topics: data.Topics || [] });
    } catch (error) {
      console.error('Error fetching filters:', error);
      // Fallback to empty data if API fails
      setFiltersData({ Filters: [] });
      setTopicsData({ Topics: [] });
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      setTenantsLoading(true);
      const response = await fetch('/api/get-tenant-hierarchy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areaId: null,
          outletId: null,
          languageCode: 'en'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTenantsData(data);
    } catch (error) {
      console.error('Error fetching tenant hierarchy:', error);
      // Fallback to empty data if API fails
      setTenantsData({ Tenants: [] });
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    updateAvailableFilters();
  }, [updateAvailableFilters]);

  // Fetch filters and tenants only once after initial load is complete
  useEffect(() => {
    if (isInitialLoadComplete) {
      fetchFilters();
      fetchTenants();
    }
  }, [isInitialLoadComplete, fetchFilters, fetchTenants]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Build the RequestJson object with dynamic values from the page
      const selectedTopic = selectedTopics[0]; // Use first selected topic
      const hierarchy = topicsHierarchy[selectedTopic] || [];
      const dashboardHierarchy = hierarchy.join('|');

      // Build filter parameters dynamically
      const filterParams: { [key: string]: string } = {};
      Object.keys(appliedFilterState).forEach((filterTag, index) => {
        const selectedValues = appliedFilterState[filterTag];
        if (selectedValues && selectedValues.length > 0) {
          filterParams[`Filter${index + 1}`] = selectedValues.join(',');
        }
      });

      // const requestJson = {
      //   languageCode: 'en',
      //   // tenantCode: tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedTenant)?.TenantCode || '',
      //   tenantCode: 'ABP',
      //   // businessDay: selectedBusinessDay,
      //   BusinessDay: '2025-08-27',
      //   AreaIds: [selectedArea || null],
      //   OutletIds: [selectedOutlet || null],
      //   Topics: selectedTopics,
      //   DashboardHierarchy: dashboardHierarchy,
      //   Filters: []
      // };

      const requestJson = {
        TenantCode: getTenantCode(),
        AreaIds: selectedAreas,
        OutletIds: selectedOutlets,
        BusinessDay: debouncedBusinessDay,
        Topics: selectedTopics,
        Filters: Object.keys(appliedFilterState).map(filterTag => ({
          Tag: filterTag,
          Values: appliedFilterState[filterTag] || []
        })).filter(filter => filter.Values.length > 0),
        DashboardHierarchy: dashboardHierarchy,
        LanguageCode: 'en'
      };


      console.log('Sending request with RequestJson:', requestJson);
      if (requestJson.TenantCode) {


        const response = await fetch('/api/test-dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // body: JSON.stringify({  RequestJson:requestJson })
          body: JSON.stringify({
            RequestJson: requestJson
          })
        });
        if (!response.ok) {
          setDashboardData(null);
          throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        setDashboardData(data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTopics, topicsHierarchy, debouncedBusinessDay, selectedAreas, selectedOutlets, appliedFilterState, getTenantCode]);

  // Debounce business day changes with 2-second delay that resets on each change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusinessDay(selectedBusinessDay);
    }, 2000); // 2-second delay

    return () => clearTimeout(timer);
  }, [selectedBusinessDay]);

  // Load data when selections change (only after initial load is complete)
  // Note: Business day changes are handled by debounce, not here
  useEffect(() => {
    if (isInitialLoadComplete && selectedAreas.length > 0 && selectedOutlets.length > 0 && selectedTenant && debouncedBusinessDay && selectedTopics.length > 0) {
      loadDashboardData();
    } else if (isInitialLoadComplete) {
      setDashboardData(null);
      setLoading(false); // Stop loading when selections are incomplete
    }
  }, [isInitialLoadComplete, selectedAreas, selectedOutlets, selectedTenant, debouncedBusinessDay, selectedTopics, appliedFilterState, topicsHierarchy, loadDashboardData]);

  const handleFilterChange = (filterTag: string, values: string[]) => {
    // check if values is empty remove the filter key from the object
    if (values.length === 0) {
      setFilterState(prev => ({
        ...Object.fromEntries(Object.entries(prev).filter(([key]) => key !== filterTag))
      }));
    } else {
      setFilterState(prev => ({
        ...prev,
        [filterTag]: values
      }));
    }
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
    setDebouncedBusinessDay(newDateString);
  };


  // Check if there are unapplied filter changes
  const hasUnappliedChanges = () => {
    const currentKeys = Object.keys(filterState);
    const appliedKeys = Object.keys(appliedFilterState);

    // Different number of filters
    if (currentKeys.length !== appliedKeys.length) return true;

    // Check if any filter values are different
    for (const key of currentKeys) {
      const currentValues = filterState[key] || [];
      const appliedValues = appliedFilterState[key] || [];

      if (currentValues.length !== appliedValues.length) return true;

      // Check if values are different
      const currentSorted = [...currentValues].sort();
      const appliedSorted = [...appliedValues].sort();

      for (let i = 0; i < currentSorted.length; i++) {
        if (currentSorted[i] !== appliedSorted[i]) return true;
      }
    }

    return false;
  };

  const handleApplyFilters = () => {
    // Apply the current filter selections - the useEffect will handle the API call
    setAppliedFilterState(filterState);
  };

  const viewTransaction = (row: DataNode) => {
    setHighlightedRowId(row.Id);
    setTimeout(() => {
      setHighlightedRowId(null);
      setSelectedTransaction(row);
    }, 500);
    // setSelectedTransaction(row);
  };

  const closeTransaction = () => {
    // Highlight the row that was clicked
    if (selectedTransaction) {
      setHighlightedRowId(selectedTransaction.Id);
      
      // Remove highlighting after 2 seconds
      setTimeout(() => {
        setHighlightedRowId(null);
      }, 1000);
    }
    
    setSelectedTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-24 w-24 border-4 border-transparent border-t-blue-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-heading text-gray-900">Loading Dashboard</p>
            <p className="text-caption">Fetching your reconciliation data...</p>
          </div>
        </div>
      </div>
    );
  }

  const resolveAppliesToTopic = (filterTag: string) => {
    const appliesToTopics = topicsData.Topics.filter(topic => topic.AvailableFilterTags.includes(filterTag))
    return (<div key={filterTag} className="text-xs text-primary opacity-60 font-medium">
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent className='text-xs bg-white p-3 py-2 italic '>This filter applies to
          <span className='font-medium px-1 flex flex-col gap-1 mt-1'>{
            appliesToTopics?.map(topic => topic.Label).map(label => <span key={label}>{label}</span>)
          }
          </span>
        </TooltipContent>
      </Tooltip>

    </div>)
    // return topicsData.Topics.filter(topic => topic.AvailableFilterTags.includes(filterTag))?.map(topic => {
    //   return <div key={topic.Tag} className="text-xs text-primary opacity-60 font-medium">
    //     {/* {topic.Label} */}
    //     {topic.Tag === 'POS_CARDS' && (
    //       <Tooltip>
    //         <TooltipTrigger>
    //           <CreditCard className="w-4 h-4" />
    //         </TooltipTrigger>
    //         <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
    //       </Tooltip>

    //     )}
    //     {topic.Tag === 'CASH' && (
    //       <Tooltip>
    //         <TooltipTrigger>
    //           <span className="icon-saudi_riyal text-sm w-4 h-4">&#xea;</span>
    //         </TooltipTrigger>
    //         <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
    //       </Tooltip>
    //     )}
    //     {topic.Tag !== 'CASH' && topic.Tag !== 'POS_CARDS' && (
    //       <Tooltip>
    //         <TooltipTrigger>
    //           <InfoIcon className="w-4 h-4" />
    //         </TooltipTrigger>
    //         <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
    //       </Tooltip>
    //     )}
    //   </div>;
    // });
  };

  const areaLiteral = "DC"
  const outletLiteral = "Cashier"
  const tenantLiteral = "Tenant"


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 shadow-modern border-b border-modern-light backdrop-blur-sm">
        <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center min-h-17">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div
                className="flex items-center space-x-3 cursor-pointer group transition-all duration-200 hover:scale-105"
                onClick={() => router.push('/')}
              >
                <div className="p-2">
                  <Image src="/logo_bwa_color.svg" alt="logo" width={60} height={60} />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900">Reconciliation</h1>
                  <p className="text-xs text-gray-600 -mt-1">Dashboard</p>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard_testing')}
                className="text-sm cursor-pointer hover:bg-blue-50 text-slate-300 hover:text-blue-700 transition-all duration-200 px-4 py-2 rounded-lg border border-transparent hover:border-blue-200"
              >
                <span className="hidden sm:inline">Custom Data</span>
                <span className="sm:hidden">Data</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  localStorage.removeItem('dashboardState');
                  localStorage.removeItem('topicsHierarchy_');
                  localStorage.removeItem('availableFilters');
                  localStorage.removeItem('tempTopicsHierarchy');
                  setSelectedAreas([]);
                  setSelectedOutlets([]);
                  setSelectedTenant('');
                  setSelectedBusinessDay(new Date().toISOString().split('T')[0]);
                  setSelectedTopics(['POSCARDS']);
                  setFilterState({});
                  window.location.reload();
                }}
                className="text-sm cursor-pointer hover:bg-orange-50 text-slate-300 hover:text-orange-600 transition-all duration-200 px-4 py-2 rounded-lg border border-transparent hover:border-orange-200"
              >
                <span className="hidden sm:inline ">Reset View</span>
                <span className="sm:hidden">Reset</span>
              </Button>
            </div>

            {/* User Profile Section */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 px-3 py-1 bg-white/60 rounded-xl border border-modern-light shadow-subtle">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">LH</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Lhallal</span>
                  <span className="text-xs text-gray-500">lhallal@technorion.com</span>
                </div>
              </div>
              <div className="md:hidden">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">LH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-10 py-4">
        {/* Enhanced Dashboard Title Section */}
        <div className="mb-2 animate-fade-in">
          {/* Breadcrumb Navigation */}


          {/* Selection Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* <div>
                <h1 className="text-display text-gray-900 mb-2">Reconciliation Dashboard</h1>
                <p className="text-caption">Monitor and analyze financial reconciliation data across your organization</p>
              </div> */}
              {/* <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                <span className="hover:text-primary cursor-pointer">Dashboard</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Reconciliation</span>
              </nav> */}
              {tenantsLoading ? (
                <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-xl border border-modern-light shadow-subtle">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600 font-medium">Loading tenants...</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <MultiSelect
                      options={tenantsData.Tenants.map(tenant => ({
                        value: tenant.TenantId.toString(),
                        label: tenant.TenantName
                      }))}
                      selectedValues={selectedTenant ? [selectedTenant] : []}
                      onSelectionChange={(values) => setSelectedTenant(values[0] || '')}
                      showSelectedValues={(selectedValues) => { return `${tenantLiteral}: ${tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedValues[0])?.TenantName}` }}
                      placeholder={`Select ${tenantLiteral}`}
                      className="w-fit min-w-[200px]"
                      minSelections={0}
                      maxSelections={1}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <MultiSelect
                      options={getAvailableAreas().map(area => ({
                        value: area.AreaId.toString(),
                        label: `${area.AreaCode} - ${area.AreaName}`
                      }))}
                      selectedValues={selectedAreas}
                      onSelectionChange={(values) => setSelectedAreas(values)}
                      placeholder={`Select ${areaLiteral}`}
                      className="w-fit min-w-[200px]"
                      minSelections={0}
                      maxSelections={10}
                      showSelectedValues={(selectedValues) => {
                        const areas = getAvailableAreas().filter(area => selectedValues.includes(area.AreaId.toString()));
                        if (areas.length <= 2) {
                          return `${areaLiteral}: ${areas.map(area => area.AreaName).join(', ')}`;
                        } else {
                          return `${areaLiteral}: ${areas.slice(0, 2).map(area => area.AreaName).join(', ')} +${areas.length - 2} more`;
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <MultiSelect
                      options={getAvailableOutlets().map(outlet => ({
                        value: outlet.OutletId.toString(),
                        label: `${outlet.OutletCode} - ${outlet.OutletName}`
                      }))}
                      selectedValues={selectedOutlets}
                      onSelectionChange={(values) => setSelectedOutlets(values)}
                      placeholder={`Select ${outletLiteral}`}
                      className="w-fit min-w-[200px]"
                      minSelections={0}
                      maxSelections={10}
                      showSelectedValues={(selectedValues) => {
                        const outlets = getAvailableOutlets().filter(outlet => selectedValues.includes(outlet.OutletId.toString()));
                        if (outlets.length <= 2) {
                          return `${outletLiteral}: ${outlets.map(outlet => outlet.OutletName).join(', ')}`;
                        } else {
                          return `${outletLiteral}: ${outlets.slice(0, 2).map(outlet => outlet.OutletName).join(', ')} +${outlets.length - 2} more`;
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              {filtersLoading ? (
                <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-xl border border-modern-light shadow-subtle">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600 font-medium">Loading topics and filters...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <MultiSelect
                    options={topicsData.Topics.map(topic => ({
                      value: topic.Tag,
                      label: topic.Label
                    }))}
                    selectedValues={selectedTopics}
                    onSelectionChange={(values) => {
                      setSelectedTopics(values);
                      if (values.length === 0) {
                        setFilterState({});
                      }
                    }}
                    placeholder="Select topics"
                    className="w-fit min-w-[200px]"
                    minSelections={1}
                    showSelectedValues={(selectedValues) => { return `Topics: ${selectedValues.map(value => topicsData.Topics.find(topic => topic.Tag === value)?.Label).join(', ')}` }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {!filtersLoading && (
                <Dialog open={isHierarchyModalOpen} onOpenChange={(open) => {
                  if (open) {
                    handleOpenHierarchyModal();
                  } else {
                    handleCancelHierarchyModal();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="text-sm bg-white text-blue-500 hover:bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:text-white shadow-card hover:shadow-lg transition-all duration-500 px-4 py-2 rounded-lg"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Topics Hierarchy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        <span>Edit Topics Hierarchy</span>
                        <span className="text-sm text-gray-500 font-normal">
                          <br />
                          <br />
                          <span className="text-sm text-gray-500 font-normal">
                            Drag and drop to reorder the hierarchy
                          </span>
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {selectedTopics.map((topicTag) => {
                        const topic = topicsData.Topics.find(t => t.Tag === topicTag);
                        const hierarchy = tempTopicsHierarchy[topicTag] || topicsHierarchy[topicTag] || [];
                        const availableFilters = getAvailableFilterTagsForTopic(topicTag);

                        return (
                          <div key={topicTag} className="border rounded-lg p-4">
                            <h3 className="text-md font-semibold mb-3 flex items-center justify-between">
                              <div className={`
                                    flex items-center gap-2
                                    ${hasHierarchyChanged(topicTag, true) ? 'text-primary' : 'text-gray-900'}
                                  `}>
                                {topic?.Label || topicTag}
                                <span className="text-xs text-gray-500 font-normal">
                                  ({hierarchy.length} levels)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasHierarchyChanged(topicTag, true) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTopicHierarchy(topicTag)}
                                    className="text-xs h-7 px-2"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset
                                  </Button>
                                )}
                              </div>
                            </h3>
                            <div className="space-y-2">
                              {hierarchy.map((filterTag, index) => {
                                const isDragged = draggedItem?.topicTag === topicTag && draggedItem?.index === index;
                                const isDragOver = dragOverIndex?.topicTag === topicTag && dragOverIndex?.index === index;
                                const canDrop = draggedItem?.topicTag === topicTag && draggedItem?.index !== index;

                                return (
                                  <div key={`${topicTag}-${filterTag}-${index}`}>
                                    {/* Drop preview indicator */}
                                    {/* {isDragOver && canDrop && (
                                  <div className="h-0.5 bg-primary rounded-full mx-3 mb-1" />
                                )} */}

                                    <div
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, topicTag, index)}
                                      onDragEnd={handleDragEnd}
                                      onDragOver={(e) => handleDragOver(e, topicTag, index)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDrop(e, topicTag, index)}
                                      style={{
                                        paddingLeft: `${(index + 1) * 10}px`
                                      }}
                                      className={`
                                    flex items-center gap-3 p-2 rounded-md cursor-move transition-colors duration-150
                                    ${isDragged
                                          ? 'opacity-60 bg-blue-50 border border-blue-300'
                                          : isDragOver && canDrop
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                        }
                                    ${!canDrop && draggedItem && draggedItem.topicTag !== topicTag ? 'opacity-40' : ''}
                                  `}
                                    >
                                      <GripVertical className={`w-4 h-4 ${isDragged ? 'text-blue-500' : 'text-gray-400'}`} />
                                      <span className={`text-xs font-medium ${isDragged ? 'text-blue-600' : 'text-gray-600'}`}>
                                        Level <span className={`${isDragged ? 'text-blue-700' : 'text-slate-600'} font-normal`}>{index}</span>
                                      </span>
                                      <span className={`text-sm flex-1 
                                                    ${getMixedFontClass()} 
                                                    ${isDragged ? 'text-blue-700' : ''}
                                                    ${isDefaultFilter(topicTag, filterTag) ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                                        {/* {isDefaultFilter(topicTag, filterTag) && (
                                      <span className="text-xs text-blue-600 mr-1">🔄</span>
                                    )} */}
                                        {getFilterLabel(filterTag)}
                                        {/* {isDefaultFilter(topicTag, filterTag) && (
                                      <span className="text-xs text-gray-500 ml-1">(Default)</span>
                                    )} */}
                                      </span>
                                      {/* Remove button for all filters */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFilterFromHierarchy(topicTag, filterTag)}
                                        // className="text-xs h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        className="text-xs px-2 text-red-500 hover:text-red-700 cursor-pointer"
                                        title={`Remove ${getFilterLabel(filterTag)}`}
                                      >
                                        {/* <X className="w-3 h-3" /> */}
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Drop zone at the end */}
                              {draggedItem?.topicTag === topicTag && (
                                <div
                                  onDragOver={(e) => handleDragOver(e, topicTag, hierarchy.length)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, topicTag, hierarchy.length)}
                                  className={`
                                h-1 rounded-md transition-colors duration-150
                                ${dragOverIndex?.topicTag === topicTag && dragOverIndex?.index === hierarchy.length
                                      ? 'bg-blue-500'
                                      : 'bg-transparent hover:bg-blue-100'
                                    }
                              `}
                                />
                              )}
                              {availableFilters.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  {/* <div className="flex items-center gap-2">
                                 <Plus className="w-4 h-4 text-gray-500" />
                                 <span className="text-xs font-medium text-gray-600">Add Filter</span>
                               </div> */}
                                  <select
                                    className="mt-2 w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        addFilterToHierarchy(topicTag, e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Select a filter to add...</option>
                                    {availableFilters.map(filterTag => (
                                      <option key={filterTag} value={filterTag}>
                                        {/* {isDefaultFilter(topicTag, filterTag) 
                                      ? `🔄 ${getFilterLabel(filterTag)} (Default)` 
                                      : getFilterLabel(filterTag)
                                    } */}
                                        {getFilterLabel(filterTag)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleCancelHierarchyModal}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCloseHierarchyModal}
                        className="text-xs text-white"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>


        {dashboardData && (selectedAreas.length > 0 && selectedOutlets.length > 0 && selectedBusinessDay) && (
          filtersLoading ? (
            <Card className="mb-4 bg-gradient-card shadow-modern border-modern-light animate-fade-in">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-heading text-gray-900">Loading Filters</p>
                    <p className="text-caption">Fetching available filters and topics...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`mb-2 gap-2 bg-gradient-card shadow-modern border-modern-light animate-slide-up group transition-all duration-300 ${Object.keys(filterState).length > 0 ? 'ring-2 ring-blue-100' : ''}`}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <FilterIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-heading text-gray-900">Custom Filters</CardTitle>
                      <p className="text-caption">Refine your data view with advanced filtering options</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {Object.keys(filterState).some(key => filterState[key]?.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilterState({})}
                        className="text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`flex flex-col gap-2`}>
                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                  {availableFilters.map((filter) => (
                    <div key={filter.Tag} className="space-y-3 group">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span>{filter.Label}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {resolveAppliesToTopic(filter.Tag)}
                          </div>
                        </Label>
                      </div>
                      <div className="relative">
                        <MultiSelect
                          options={filter.Values?.map(value => ({
                            value: value.Code,
                            label: value.Label
                          })) || []}
                          selectedValues={filterState[filter.Tag] || []}
                          onSelectionChange={(values) => handleFilterChange(filter.Tag, values)}
                          placeholder={`Select ${filter.Label}`}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Filters Display */}
                {Object.keys(filterState).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-900">Active Filters</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {Object.keys(filterState).length} applied
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Object.keys(filterState).map((key) => {
                        const filter = filtersData.Filters.find(f => f.Tag === key);
                        return (
                          <div key={key} className="group">
                            <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-2 shadow-subtle hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{filter?.Label}:</span>
                                <span className={getMixedFontClass()}>
                                  {(() => {
                                    const selectedLabels = filterState[key].map(code => {
                                      const value = filter?.Values?.find(v => v.Code === code);
                                      return value?.Label || code;
                                    });

                                    if (selectedLabels.length <= 2) {
                                      return selectedLabels.join(', ');
                                    } else {
                                      const firstTwo = selectedLabels.slice(0, 2);
                                      const remaining = selectedLabels.length - 2;
                                      return (
                                        <span className="flex items-center gap-1">
                                          <span>{firstTwo.join(', ')}</span>
                                          <span className="text-blue-600 font-semibold">+{remaining}</span>
                                        </span>
                                      );
                                    }
                                  })()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFilter(key)}
                                  className="ml-1 h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter Button - Only show when there are unapplied changes */}
                {hasUnappliedChanges() && (
                  <div className="flex justify-center pt-2 ">
                    <Button
                      onClick={handleApplyFilters}
                      className="bg-gradient-to-r cursor-pointer from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-lg shadow-card hover:shadow-lg transition-all duration-200 font-semibold animate-pulse"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Applying...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FilterIcon className="w-4 h-4" />
                          <span>Apply Filters</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}

        {/* No Data Message */}
        {!dashboardData && (selectedAreas.length > 0 && selectedOutlets.length > 0 && selectedBusinessDay) && (
          <Card className="mb-2 bg-gradient-card shadow-modern border-modern-light animate-fade-in">
            <CardContent className="p-12 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="space-y-4">
                <h2 className="text-display text-gray-900">No Data Available</h2>
                <p className="text-body text-gray-600 max-w-md mx-auto">
                  There&apos;s no reconciliation data available for the selected combination of area, outlet, and date.
                </p>

                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-blue-900">Areas:</span>
                    <span className="text-sm text-blue-700 ml-1">{selectedAreas.length > 0 ? selectedAreas.join(', ') : 'Not selected'}</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-green-900">Outlets:</span>
                    <span className="text-sm text-green-700 ml-1">{selectedOutlets.length > 0 ? selectedOutlets.join(', ') : 'Not selected'}</span>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-center sm:flex-row items-center gap-4 p-6 bg-white/60 rounded-xl border border-modern-light shadow-subtle mt-8">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-600 hover:text-slate-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200 px-4 py-2 rounded-lg"
                    disabled={!selectedBusinessDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>

                  <div className="flex items-center space-x-0">
                    {/* <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div> */}
                    <span className="text-xs min-w-21 font-semibold text-gray-700 nowrap">Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="text-slate-900 font-semibold border-blue-200 focus:border-blue-400 focus:ring-blue-100 transition-all duration-200"
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-600 hover:text-slate-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200 px-4 py-2 rounded-lg"
                    disabled={!selectedBusinessDay}
                  >
                    <span className="text-sm font-medium">{selectedBusinessDay ? formatDate(getNextDay(selectedBusinessDay)) : ''}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!dashboardData && (selectedAreas.length === 0 || selectedOutlets.length === 0 || !selectedBusinessDay) && (
          <Card className="mb-2 bg-gradient-card shadow-modern border-modern-light animate-fade-in">
            <CardContent className="p-12 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="space-y-4 flex flex-col items-center justify-center">
                <h2 className="text-display text-gray-900">Complete Your Selection</h2>
                <p className="text-body text-gray-600 max-w-md mx-auto">
                  Please select {areaLiteral} and {outletLiteral} to view your reconciliation data.
                </p>

                <div className="flex justify-center items-center gap-4 mt-8">
                  <div className={`px-4 py-2 rounded-lg border ${selectedAreas.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <span className="text-sm font-medium">{areaLiteral}:</span>
                    <span className="text-sm ml-1">{selectedAreas.length > 0 ? 'Selected' : 'Required'}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border ${selectedOutlets.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <span className="text-sm font-medium">{outletLiteral}:</span>
                    <span className="text-sm ml-1">{selectedOutlets.length > 0 ? 'Selected' : 'Required'}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border ${selectedBusinessDay ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <span className="text-sm font-medium">Business Day:</span>
                    <span className="text-sm ml-1">{selectedBusinessDay ? 'Today' : 'Required'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Table */}
        {dashboardData && (
          <Card className="bg-gradient-card p-2 gap-0 shadow-modern border-modern-light animate-fade-in">
            <CardHeader className="pb-0">
              <div className="flex flex-col items-center space-y-0">
                {/* <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2 className="text-heading text-gray-900">Reconciliation Data</h2>
                    <p className="text-caption">Financial reconciliation overview for selected period</p>
                  </div>
                </div> */}

                {/* Enhanced Date Navigation */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-2 py-2 bg-white/60 rounded-xl border border-modern-light shadow-subtle">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-600 hover:text-slate-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200 px-4 py-2 rounded-lg"
                    disabled={!selectedBusinessDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>

                  <div className="flex items-center space-x-3">
                    {/* <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div> */}
                    <span className="text-xs min-w-21 font-semibold text-gray-700 nowrap">Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="text-slate-900 font-semibold border-blue-200 focus:border-blue-400 focus:ring-blue-100 transition-all duration-200"
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-600 hover:text-slate-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200 px-4 py-2 rounded-lg"
                    disabled={!selectedBusinessDay}
                  >
                    <span className="text-sm font-medium">{selectedBusinessDay ? formatDate(getNextDay(selectedBusinessDay)) : ''}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 py-2">
              <ReconciliationTable
                data={dashboardData.ChildNodes}
                filterState={{}}
                viewTransaction={viewTransaction}
                highlightedRowId={highlightedRowId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction Popup */}
      {selectedTransaction && (
        <Transaction
          row={selectedTransaction}
          onClose={closeTransaction}
          selectedTenant={selectedTenant}
          selectedAreas={selectedAreas}
          selectedOutlets={selectedOutlets}
          selectedBusinessDay={selectedBusinessDay}
          dashboardData={dashboardData?.ChildNodes || []}
          tenantsData={tenantsData}
          topicsData={topicsData}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-24 w-24 border-4 border-transparent border-t-blue-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-heading text-gray-900">Initializing Dashboard</p>
            <p className="text-caption">Setting up your reconciliation workspace...</p>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
