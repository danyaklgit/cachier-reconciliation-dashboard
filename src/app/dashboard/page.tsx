'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { ChevronLeft, ChevronRight, CreditCard, FilterIcon, X, Settings, GripVertical, RotateCcw } from 'lucide-react';
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
    setSelectedTransaction(row);
  };

  const closeTransaction = () => {
    setSelectedTransaction(null);
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

  const resolveAppliesToTopic = (filterTag: string) => {
    return topicsData.Topics.filter(topic => topic.AvailableFilterTags.includes(filterTag))?.map(topic => {
      return <div key={topic.Tag} className="text-xs text-primary opacity-60 font-medium">
        {/* {topic.Label} */}
        {topic.Tag === 'POS_CARDS' && (
          <Tooltip>
            <TooltipTrigger>
              <CreditCard className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
          </Tooltip>

        )}
        {topic.Tag === 'CASH' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="icon-saudi_riyal text-sm w-4 h-4">&#xea;</span>
            </TooltipTrigger>
            <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
          </Tooltip>
        )}
        {topic.Tag !== 'CASH' && topic.Tag !== 'POS_CARDS' && (
          <Tooltip>
            <TooltipTrigger>
              <FilterIcon className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent>This filter applies to {topic.Label}</TooltipContent>
          </Tooltip>
        )}
      </div>;
    });
  };

  const areaLiteral = "DC"
  const outletLiteral = "Cashier"
  const tenantLiteral = "Tenant"


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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard_testing')}
                className="text-xs cursor-pointer hover:bg-gray-100 text-slate-500 hover:text-primary"
              >
                Custom Data
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
                className="text-xs cursor-pointer hover:bg-gray-100 text-slate-500 hover:text-primary"
              >
                Reset view
              </Button>
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

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Dashboard Title */}
        <div className="mb-1">

          {/* Selection Controls */}
          <div className="flex items-center mb-2 justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reconciliation Dashboard</h1>

              </div>
              {tenantsLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Loading tenants...</span>
                </div>
              ) : (<>
                <div className="space-y-2">

                  <MultiSelect
                    options={tenantsData.Tenants.map(tenant => ({
                      value: tenant.TenantId.toString(),
                      label: tenant.TenantName
                    }))}
                    selectedValues={selectedTenant ? [selectedTenant] : []}
                    onSelectionChange={(values) => setSelectedTenant(values[0] || '')}
                    showSelectedValues={(selectedValues) => { return `${tenantLiteral}: ${tenantsData.Tenants.find(tenant => tenant.TenantId.toString() === selectedValues[0])?.TenantName}` }}
                    placeholder={`Select ${tenantLiteral}`}
                    className="w-fit"
                    minSelections={0}
                    maxSelections={1}
                  />

                </div>
                <div className="space-y-2 flex items-center gap-2">
                  <MultiSelect
                    options={getAvailableAreas().map(area => ({
                      value: area.AreaId.toString(),
                      label: `${area.AreaCode} - ${area.AreaName}`
                    }))}
                    selectedValues={selectedAreas}
                    onSelectionChange={(values) => setSelectedAreas(values)}
                    placeholder={`Select ${areaLiteral}`}
                    className="w-fit"
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
                <div className="space-y-2">
                  <MultiSelect
                    options={getAvailableOutlets().map(outlet => ({
                      value: outlet.OutletId.toString(),
                      label: `${outlet.OutletCode} - ${outlet.OutletName}`
                    }))}
                    selectedValues={selectedOutlets}
                    onSelectionChange={(values) => setSelectedOutlets(values)}
                    placeholder={`Select ${outletLiteral}`}
                    className="w-fit"
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
              </>)}
              {filtersLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Loading topics and filters...</span>
                </div>
              ) : (
                <div className="space-y-2">
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
                    className="w-fit"
                    minSelections={1}
                    showSelectedValues={(selectedValues) => { return `Topics: ${selectedValues.map(value => topicsData.Topics.find(topic => topic.Tag === value)?.Label).join(', ')}` }}
                  />
                </div>
              )}
            </div>
            {!filtersLoading && <Dialog open={isHierarchyModalOpen} onOpenChange={(open) => {
              if (open) {
                handleOpenHierarchyModal();
              } else {
                handleCancelHierarchyModal();
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  // variant="default"
                  size="sm"
                  className="text-xs bg-white text-primary cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-1" />
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
            </Dialog>}



            {/* <div className="space-y-2 flex items-bottom justify-end gap-2 justify-self-end">
              

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
            </div> */}
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

        {dashboardData && (selectedAreas.length > 0 && selectedOutlets.length > 0 && selectedBusinessDay) && (
          filtersLoading ? (
            <Card className="mb-4 p-4 bg-white">
              <CardHeader>
                {/* <CardTitle className="text-lg font-bold text-gray-900">Custom Filters</CardTitle> */}
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-0">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900">Loading Filters</p>
                    <p className="text-sm text-gray-600">Fetching available filters and topics...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={
              `mb-4 p-4 px-1 gap-1 group ${Object.keys(filterState).length > 0 ? 'bg-white' : 'bg-white/50'}`
            }>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">Custom Filters</CardTitle>
                  <div className="flex items-center gap-2">

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
                </div>
              </CardHeader>
              <CardContent className={`flex flex-col ${Object.keys(filterState).length > 0 ? 'gap-4' : 'gap-1'}`}>


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">


                  {/* Dynamic Filters */}
                  {availableFilters.map((filter) => (
                    <div key={filter.Tag} className="space-y-2">
                      <Label className="flex text-sm items-end gap-2">
                        <span className="text-sm pt-1">{filter.Label}</span>
                        <div className="text-xs flex items-end gap-2 font-medium text-primary opacity-50 group-hover:opacity-100 duration-300 transition-all">{resolveAppliesToTopic(filter.Tag)}</div>
                      </Label>
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
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* selected filters */}
                  {Object.keys(filterState).map((key) => {
                    const filter = filtersData.Filters.find(f => f.Tag === key);
                    return (
                      <Badge key={key} className="bg-gray-100 rounded-md p-1 px-2 group">
                        <Label>{filter?.Label}</Label>
                        <p className={getMixedFontClass()}>
                          {(() => {
                            const selectedLabels = filterState[key].map(code => {
                              const value = filter?.Values?.find(v => v.Code === code);
                              return value?.Label || code;
                            });

                            if (selectedLabels.length <= 3) {
                              return selectedLabels.join(', ');
                            } else {
                              const firstThree = selectedLabels.slice(0, 3);
                              const remaining = selectedLabels.length - 3;
                              return <span className="flex items-center gap-1">
                                <span>{firstThree.join(', ')}</span>
                                <span className='text-primary'> + {remaining}</span>
                              </span>;
                            }
                          })()}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => removeFilter(key)} className="ml-2 group-hover:bg-gray-200 hover:text-red-700 cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>

                {/* Filter Button - Only show when there are unapplied changes */}
                {hasUnappliedChanges() && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={handleApplyFilters}
                      className="bg-primary text-white px-6 py-2 animate-pulse hover:font-semibold cursor-pointer"
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? 'Loading...' : 'Apply Filters'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}

        {/* No Data Message */}
        {!dashboardData && (selectedAreas.length > 0 && selectedOutlets.length > 0 && selectedBusinessDay) && (
          <Card className="mb-8 p-4 bg-white">
            <CardContent className="p-6 text-center">
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
                  <span className="font-medium">Areas:</span> {selectedAreas.length > 0 ? selectedAreas.join(', ') : 'Not selected'}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Outlets:</span> {selectedOutlets.length > 0 ? selectedOutlets.join(', ') : 'Not selected'}
                </p>
                <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-end justify-center space-x-10 mt-0">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span><ChevronLeft className="h-4 w-4" /></span>
                    <span>{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>
                  <div className="font-semibold flex  items-center space-x-2 gap-2">
                    <span className='text-sm'>Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="w-auto text-slate-900 text-semibold"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-gray-200"
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

        {!dashboardData && (selectedAreas.length === 0 || selectedOutlets.length === 0 || !selectedBusinessDay) && (<Card className="mb-8 p-4 bg-white">
          <CardContent className="p-3 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {/* <h2 className="text-2xl font-semibold text-gray-900 mb-3">Please select an area and outlet</h2> */}
            <p className="text-gray-600 mb-0">
              Please select {areaLiteral} and {outletLiteral} to continue.
            </p>
          </CardContent>
        </Card>)}

        {/* Main Dashboard Table */}
        {dashboardData && (
          <Card className="bg-white p-4 gap-2">
            <CardHeader>
              <div className="text-center">
                {/* <h2 className="text-2xl font-bold text-gray-900">
                {dashboardData.AreaCode} ({dashboardData.OutletCode}) 
              </h2> */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-end justify-center space-x-10 mt-0">
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('prev')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-gray-200"
                    disabled={!selectedBusinessDay}
                  >
                    <span><ChevronLeft className="h-4 w-4" /></span>
                    <span>{selectedBusinessDay ? formatDate(getPreviousDay(selectedBusinessDay)) : ''}</span>
                  </Button>
                  <div className="font-semibold flex  items-center space-x-2 gap-2">
                    <span className='text-sm'>Business Day:</span>
                    <Input
                      type="date"
                      value={selectedBusinessDay || ''}
                      onChange={(e) => setSelectedBusinessDay(e.target.value)}
                      className="w-auto text-slate-900 text-semibold"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigateToDate('next')}
                    className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-gray-200"
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
                viewTransaction={viewTransaction}
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
        />
      )}
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
