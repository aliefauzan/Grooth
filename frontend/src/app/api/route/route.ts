import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const duration = searchParams.get('duration');
    const distance = searchParams.get('distance');
    const routeType = searchParams.get('routeType');

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from or to parameters' }, { status: 400 });
    }

    // Build query parameters for backend API
    const queryParams = new URLSearchParams({
      from,
      to,
      ...(type && { type }),
      ...(duration && { duration }),
      ...(distance && { distance }),
      ...(routeType && { routeType })
    });

    // Call the backend API
    const backendUrl = `http://localhost:5000/api/route?${queryParams.toString()}`;
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route from backend' },
      { status: 500 }
    );
  }
}
