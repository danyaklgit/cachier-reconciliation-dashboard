import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaId, outletId, languageCode = 'ar' } = body;

    const apiUrl = API_CONFIG.BASE_URL;
    const apiKey = API_CONFIG.API_KEY;

    console.log('API URL:', apiUrl);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    const requestBody = {
      parameters: [
        { key: 'SP', value: 'GetFilters' },
        { 
          key: 'RequestJson', 
          value: JSON.stringify({
            AreaId: areaId,
            OutletId: outletId,
            LanguageCode: languageCode
          })
        }
      ]
    };

    console.log('Fetching filters with parameters:', JSON.stringify(requestBody, null, 2));

    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };
    
    console.log('Making request to external API...');
    console.log('Request headers:', headers);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', response.status, errorText);
      return NextResponse.json(
        { 
          error: `HTTP error! status: ${response.status}`, 
          details: errorText,
          apiUrl: apiUrl,
          hasApiKey: !!apiKey
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log('Filters API response:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch filters', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
