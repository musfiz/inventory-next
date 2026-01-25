import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * API Proxy Route Handler
 * Proxies all API requests and adds auth token from HTTP-only cookie
 */
export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE');
}

async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Get the API path from the URL
    const url = new URL(request.url);
    const apiPath = url.pathname.replace('/api/proxy', '');
    const queryString = url.search;

    // Get auth token from cookie
    const token = request.cookies.get('auth_token')?.value;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get request body for POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.json();
      } catch {
        // No body or invalid JSON
      }
    }

    // Make request to Laravel backend
    const response = await axios({
      method,
      url: `${API_URL}${apiPath}${queryString}`,
      headers,
      data: body,
      validateStatus: () => true, // Don't throw on any status
    });

    // Return response
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Proxy request failed',
      },
      { status: 500 }
    );
  }
}
