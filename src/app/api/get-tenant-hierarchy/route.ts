import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaId, outletId, languageCode = 'ar' } = body;
    
    const apiUrl = API_CONFIG.BASE_URL;
    const apiKey = API_CONFIG.API_KEY;
    
    const requestBody = {
      parameters: [
        { key: 'SP', value: 'GetTenantHierarchy' },
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
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in get-tenant-hierarchy API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant hierarchy data' },
      { status: 500 }
    );
  }
}
