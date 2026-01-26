import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosRequestConfig, Method } from 'axios';

/**
 * ============================================================================
 * GLOBAL API HANDLER
 * ============================================================================
 * Single source of truth for ALL backend API communication
 * 
 * Features:
 * - Automatic auth token management via HTTP-only cookies
 * - Smart cookie handling for auth endpoints (login, register, logout)
 * - Unified error handling and logging
 * - Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * - Direct backend communication with request forwarding
 * 
 * Usage:
 * All API calls from frontend → /api/proxy/* → This handler → Laravel backend
 * ============================================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Cookie configuration for auth token
 */
const AUTH_COOKIE_CONFIG = {
  name: 'auth_token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

/**
 * Make API request to Laravel backend
 */
export async function makeApiRequest(
  endpoint: string,
  method: Method = 'GET',
  data?: any,
  token?: string
) {
  const config: AxiosRequestConfig = {
    method,
    url: `${API_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(data && { data }),
  };

  return axios(config);
}

/**
 * Set auth token cookie
 */
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    ...AUTH_COOKIE_CONFIG,
    value: token,
  });
}

/**
 * Clear auth token cookie
 */
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    ...AUTH_COOKIE_CONFIG,
    value: '',
    maxAge: 0,
  });
}

/**
 * Get auth token from request
 */
export function getAuthToken(request: NextRequest): string | undefined {
  return request.cookies.get(AUTH_COOKIE_CONFIG.name)?.value;
}

/**
 * Handle auth request (login, register, register-tenant)
 * Automatically sets HTTP-only cookie with token
 */
export async function handleAuthRequest(
  request: NextRequest,
  endpoint: string
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const response = await makeApiRequest(endpoint, 'POST', body);

    const { token, ...userData } = response.data.data;

    // Create response with user data
    const nextResponse = NextResponse.json({
      success: true,
      message: response.data.message,
      data: userData,
    });

    // Set HTTP-only cookie with the token
    if (token) {
      setAuthCookie(nextResponse, token);
    }

    return nextResponse;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error.response?.data || error.message);

    return NextResponse.json(
      {
        success: false,
        message: error.response?.data?.message || 'Request failed',
        errors: error.response?.data?.errors,
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * Handle logout request
 * Calls backend logout and clears HTTP-only cookie
 */
export async function handleLogoutRequest(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = getAuthToken(request);

    if (token) {
      // Call backend logout endpoint
      try {
        await makeApiRequest('/logout', 'POST', {}, token);
      } catch (error) {
        console.error('Backend logout error:', error);
        // Continue to clear cookie even if backend call fails
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the auth cookie
    clearAuthCookie(response);

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Logout failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoints that need special cookie handling
 */
const LOGOUT_ENDPOINTS = ['/api/v1/logout', '/api/v1/admin/logout']; // Endpoints that clear cookies

/**
 * Generic API proxy handler
 * Forwards ALL requests to Laravel backend with auth token from cookie
 * Automatically handles cookie setting for any endpoint that returns a token
 */
export async function handleProxyRequest(
  request: NextRequest,
  method: Method
): Promise<NextResponse> {
  try {
    // Get the API path from the URL
    const url = new URL(request.url);
    const apiPath = url.pathname.replace('/api/proxy', '');
    const queryString = url.search;
    const fullPath = `${apiPath}${queryString}`;

    // Get auth token from cookie
    const token = getAuthToken(request);

    // Get request body for POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.json();
      } catch {
        // No body or invalid JSON
      }
    }

    console.log(`[Proxy] ${method} ${apiPath}`);

    // Make request to Laravel backend
    const response = await axios({
      method,
      url: `${API_URL}${apiPath}${queryString}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      data: body,
      validateStatus: () => true, // Don't throw on any status
    });

    // Create Next.js response
    const nextResponse = NextResponse.json(response.data, { status: response.status });

    // Smart cookie handling: If response contains a token, set it as cookie
    // This works for ANY endpoint (login, register, admin/login, tenant/register, etc.)
    if (response.data.data?.token) {
      console.log('[Proxy] Setting auth cookie for:', apiPath);
      setAuthCookie(nextResponse, response.data.data.token);
    }

    // Handle logout endpoints - clear cookie
    if (LOGOUT_ENDPOINTS.includes(apiPath)) {
      console.log('[Proxy] Clearing auth cookie');
      clearAuthCookie(nextResponse);
    }

    return nextResponse;
  } catch (error: any) {
    console.error('[Proxy] Error:', error.message);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Proxy request failed',
        error: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
