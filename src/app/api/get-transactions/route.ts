import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { RequestJson } = body;

    const apiUrl = API_CONFIG.BASE_URL;
    const apiKey = API_CONFIG.API_KEY;

    const requestBody = {
      parameters: [
        { key: 'SP', value: 'GetTransactions' },
        { 
          key: 'RequestJson', 
          value: JSON.stringify(RequestJson)
        }
      ]
    };

    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

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

    let data = await response.json();
    data = {
      ...data,
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
