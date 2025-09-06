import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaId, outletId, languageCode = 'ar' } = body;

    const apiUrl = 'http://pluto.swittlelab.com:5255/dashboard';
    const apiKey = 'p9A!t7$KzQwR3xM#Lf2VbJ8hYcN6sZ@G';

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

    console.log('Fetching filters with parameters:', requestBody);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return NextResponse.json(
        { 
          error: `HTTP error! status: ${response.status}`, 
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Filters API response:', data);

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
