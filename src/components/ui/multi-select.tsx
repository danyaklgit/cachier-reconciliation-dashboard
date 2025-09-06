'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMixedFontClass } from '@/lib/font-utils';
export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minSelections?: number;
  showSelectedValues?: (selectedValues: string[]) => string;
  maxSelections?: number;
}

export function MultiSelect({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options",
  className = "w-48",
  disabled = false,
  minSelections = 0,
  showSelectedValues = (selectedValues: string[]) => `${selectedValues.length} selected`,
  maxSelections = 0
}: MultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset scroll position when search changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [debouncedSearchTerm]);

  // Filter options based on debounced search term
  const filteredOptions = useMemo(() => {
    if (!debouncedSearchTerm) return options;
    
    // Normalize search term for better Arabic text matching
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .trim()
        // Remove diacritics and normalize Arabic characters
        .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
        // Normalize Arabic alef variations
        .replace(/[\u0622\u0623\u0625]/g, '\u0627')
        // Normalize Arabic yeh variations
        .replace(/[\u064A\u0649]/g, '\u064A')
        // Normalize Arabic teh marbuta
        .replace(/\u0629/g, '\u0647');
    };
    
    const normalizedSearchTerm = normalizeText(debouncedSearchTerm);
    
    return options.filter(option => {
      const normalizedLabel = normalizeText(option.label);
      const normalizedValue = normalizeText(option.value);
      
      return normalizedLabel.includes(normalizedSearchTerm) || 
             normalizedValue.includes(normalizedSearchTerm);
    });
  }, [options, debouncedSearchTerm]);

  // Virtual scrolling constants
  const ITEM_HEIGHT = 40; // Height of each option item
  const CONTAINER_HEIGHT = 240; // Max height of the scrollable container
  const VISIBLE_ITEMS = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT);
  const BUFFER_SIZE = 5; // Extra items to render for smooth scrolling

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    filteredOptions.length - 1,
    startIndex + VISIBLE_ITEMS + BUFFER_SIZE * 2
  );

  // Get visible options
  const visibleOptions = filteredOptions.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered options
      const filteredValues = filteredOptions.map(option => option.value);
      const newSelection = selectedValues.filter(value => !filteredValues.includes(value));
      
      // If we would go below minimum selections, automatically select the first option
      if (newSelection.length < minSelections) {
        const firstOption = options[0];
        if (firstOption && !newSelection.includes(firstOption.value)) {
          newSelection.push(firstOption.value);
        }
        toast.success('We automatically selected the first option', { position: 'top-right' });
      }
      
      onSelectionChange(newSelection);
    } else {
      // Select all filtered options, but respect maxSelections
      const filteredValues = filteredOptions.map(option => option.value);
      let newSelection = [...new Set([...selectedValues, ...filteredValues])];
      
      // If maxSelections is set, limit the selection
      if (maxSelections && newSelection.length > maxSelections) {
        newSelection = newSelection.slice(0, maxSelections);
      }
      
      onSelectionChange(newSelection);
    }
  };

  const handleOptionChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      let newSelection: string[];
      
      // If maxSelections is 1, replace the current selection
      if (maxSelections === 1) {
        newSelection = [optionValue];
      } else if (maxSelections && selectedValues.length >= maxSelections) {
        // If we've reached the maximum, don't add more
        return;
      } else {
        newSelection = [...selectedValues, optionValue];
      }
      
      onSelectionChange(newSelection);
    } else {
      const newSelection = selectedValues.filter(value => value !== optionValue);
      
      // If we would go below minimum selections, automatically select the first option
      if (newSelection.length < minSelections) {
        const firstOption = options[0];
        if (firstOption && !newSelection.includes(firstOption.value)) {
          newSelection.push(firstOption.value);
        }
      }
      onSelectionChange(newSelection);
    }
  };

  const isAllSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => selectedValues.includes(option.value));

  const isPartiallySelected = filteredOptions.some(option => selectedValues.includes(option.value)) && 
    !isAllSelected;

  const displayText = selectedValues.length > 0
    ? showSelectedValues(selectedValues)
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`${className} justify-between text-left font-normal bg-white cursor-pointer ${
            selectedValues.length > 0 ? 'text-primary' : 'text-gray-500'
          }`}
          disabled={disabled}
        >
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Options</span>
            {selectedValues.length > minSelections && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  let newSelection: string[] = [];
                  
                  // If we have minimum selections, automatically select the first option
                  if (minSelections > 0) {
                    const firstOption = options[0];
                    if (firstOption) {
                      newSelection = [firstOption.value];
                    }
                  }
                  
                  onSelectionChange(newSelection);
                }}
                className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </Button>
            )}
          </div>
          
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${options.length} options...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-8 pr-15 h-7 text-sm ${getMixedFontClass()}`}
              dir="auto"
            />
            {searchTerm && searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
              </div>
            )}
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className='absolute text-red-400 right-1.5 top-1/2 transform -translate-y-1/2'
                onClick={() => setSearchTerm('')}
              >
                clear
              </Button>
            )}
          </div>
        </div>
        
        <div className=" p-1">
          {/* Select All checkbox */}
          {filteredOptions.length > 0 && (
            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md border-b">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                ref={(el) => {
                  if (el && el instanceof HTMLInputElement) {
                    el.indeterminate = isPartiallySelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer flex-1"
              >
                Select All ({filteredOptions.length})
              </label>
            </div>
          )}
          
          {/* Virtual scrolling container */}
          {filteredOptions.length > 0 ? (
            <div
              ref={scrollContainerRef}
              className="relative"
              style={{ height: CONTAINER_HEIGHT, overflow: 'auto' }}
              onScroll={handleScroll}
            >
              {/* Spacer for items before visible range */}
              <div style={{ height: startIndex * ITEM_HEIGHT }} />
              
              {/* Visible options */}
              {visibleOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md"
                  style={{ height: ITEM_HEIGHT }}
                >
                  <Checkbox
                    id={`option-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => handleOptionChange(option.value, checked as boolean)}
                  />
                  <label
                    htmlFor={`option-${option.value}`}
                    className={`text-sm cursor-pointer flex-1 truncate ${getMixedFontClass()}`}
                    title={option.label}
                    dir="auto"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
              
              {/* Spacer for items after visible range */}
              <div style={{ height: (filteredOptions.length - endIndex - 1) * ITEM_HEIGHT }} />
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchTerm ? 'No options found' : 'No options available'}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
