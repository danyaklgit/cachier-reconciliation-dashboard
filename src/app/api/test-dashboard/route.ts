import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Making request to external API...');
    
    // Get parameters from request body, or use defaults
    const body = await request.json();
    const requestBody = {
      parameters: body.parameters || [
        { key: "LanguageCode", value: "en" },
        { key: "MerchantCode", value: "42" },
        { key: "BusinessDay", value: "10/10/2025" },
        { key: "DashboardHierarchy", value: "" }
      ]
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://pluto.swittlelab.com:5255/dashboard', {
      method: 'POST',
      headers: {
        'x-api-key': 'p9A!t7$KzQwR3xM#Lf2VbJ8hYcN6sZ@G',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('Success response:', JSON.stringify(data, null, 2));
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
