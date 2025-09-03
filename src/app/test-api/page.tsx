'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestApiPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Default parameters
  const [parameters, setParameters] = useState([
    { key: "LanguageCode", value: "en" },
    { key: "MerchantCode", value: "ABP" },
    { key: "BusinessDay", value: "2025-08-27" },
    { key: "CumulativeFromDate", value: "2025-08-25" },
    { key: "TerminalCodes", value: "19001220004,19001220005" },
    { key: "AreaId", value: "1245" },
    { key: "OutletId", value: "9865" },
    { key: "DashboardHierarchy", value: "BRAND|DRIVER|ROUTE|CUSTOMER" }
  ]);

  const addParameter = () => {
    setParameters([...parameters, { key: "", value: "" }]);
  };

  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
    }
  };

  const updateParameter = (index: number, field: 'key' | 'value', value: string) => {
    const newParameters = [...parameters];
    newParameters[index][field] = value;
    setParameters(newParameters);
  };

  const testApi = async () => {
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const response = await fetch('/api/test-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Show the actual API error message
        setError(data.error || `HTTP error! status: ${response.status}`);
        if (data.details) {
          console.error('Error details:', data.details);
        }
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Test Page</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Dashboard API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Parameters</h3>
                <Button onClick={addParameter} variant="outline" size="sm">
                  Add Parameter
                </Button>
              </div>
              
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Parameter key"
                      value={param.key}
                      onChange={(e) => updateParameter(index, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Parameter value"
                      value={param.value}
                      onChange={(e) => updateParameter(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    {parameters.length > 1 && (
                      <Button
                        onClick={() => removeParameter(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={testApi} 
              disabled={loading}
              className="mb-4 text-white"
            >
              {loading ? 'Testing API...' : 'Test API Call'}
            </Button>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-red-800 font-semibold mb-2">Error:</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {response && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="text-green-800 font-semibold mb-2">Response:</h3>
                <pre className="text-green-700 text-sm overflow-auto whitespace-pre-wrap">
                  {response}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Endpoint:</strong> http://pluto.swittlelab.com:5255/dashboard</p>
              <p><strong>Method:</strong> POST</p>
              <p><strong>Headers:</strong> x-api-key, Content-Type: application/json</p>
              <p><strong>Parameters:</strong> LanguageCode, MerchantCode, BusinessDay, DashboardHierarchy</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
