import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    
    // Get parameters from request body
    const body = await request.json();
    const { RequestJson } = body;
    
    const requestBody = {
      parameters: [
        { key: "RequestJson", value: JSON.stringify(RequestJson) }
      ]
    };
    
    
    const response = await fetch(API_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An error occurred',
        details: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    );
  }
}
