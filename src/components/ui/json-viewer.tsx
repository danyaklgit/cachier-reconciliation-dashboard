'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  title?: string;
  defaultExpanded?: boolean;
}

interface JsonNodeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  keyName?: string;
  level?: number;
  defaultExpanded?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, keyName, level = 0, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);
  const [copied, setCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCopy = async (value: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getValueType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600';
      case 'number': return 'text-blue-600';
      case 'boolean': return 'text-purple-600';
      case 'null': return 'text-gray-500';
      default: return 'text-gray-800';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatValue = (value: any, type: string): string => {
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    return String(value);
  };

  const indent = '  '.repeat(level);

  if (data === null || typeof data !== 'object') {
    const type = getValueType(data);
    const color = getValueColor(type);
    const formatted = formatValue(data, type);
    
    return (
      <div className="flex items-center group">
        <span className="text-gray-500 text-xs mr-2">{indent}</span>
        {keyName && (
          <>
            <span className="text-blue-800 font-medium">&quot;{keyName}&quot;</span>
            <span className="text-gray-500 mx-1">:</span>
          </>
        )}
        <span className={`${color} font-mono`}>{formatted}</span>
        <button
          onClick={() => handleCopy(data)}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          title="Copy value"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3 text-gray-500" />
          )}
        </button>
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <div className="flex items-center group">
          <span className="text-gray-500 text-xs mr-2">{indent}</span>
          {keyName && (
            <>
              <span className="text-blue-800 font-medium">{keyName}</span>
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
          <span className="text-gray-500 ml-1">[</span>
          <button
            onClick={() => handleCopy(data)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
            title="Copy array"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500" />
            )}
          </button>
        </div>
        <div className="ml-2">
          {data.map((item, index) => (
            <JsonNode
              key={index}
              data={item}
              level={level + 1}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
        <div className="flex items-center">
          <span className="text-gray-500 text-xs mr-2">{indent}</span>
          <span className="text-gray-500">]</span>
        </div>
      </div>
    );
  }

  // Object
  const keys = Object.keys(data);
  return (
    <div>
      <div className="flex items-center group">
        <span className="text-gray-500 text-xs mr-2">{indent}</span>
        {keyName && (
          <>
            <span className="text-blue-800 font-medium">{keyName}</span>
            <span className="text-gray-500 mx-1">:</span>
          </>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center hover:bg-gray-100 rounded p-1"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-500" />
          )}
        </button>
        <span className="text-gray-500 ml-1">{'{'}</span>
        {/* <span className="text-gray-500 text-sm ml-1">object({keys.length})</span> */}
        <span className="text-gray-500">{'}'}</span>
        <button
          onClick={() => handleCopy(data)}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          title="Copy object"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3 text-gray-500" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="ml-2">
          {keys.map((key) => (
            <JsonNode
              key={key}
              data={data[key]}
              keyName={key}
              level={level + 1}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  title, 
  defaultExpanded = false 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!data) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      {(title || data) && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
          <div className="flex items-center gap-2">
            {title && <h3 className="text-sm font-medium text-gray-900">{title}</h3>}
            {/* <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
              {Array.isArray(data) ? `Array (${data.length})` : 'Object'}
            </span> */}
          </div>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            title="Copy all JSON"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy All
              </>
            )}
          </button>
        </div>
      )}
      <div className="p-3 overflow-auto max-h-96 font-mono text-xs">
        <JsonNode data={data} defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
};
