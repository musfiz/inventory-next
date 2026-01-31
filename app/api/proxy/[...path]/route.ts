import { NextRequest } from 'next/server';
import apiClient from "@/lib/api/axios";
/**
 * API Proxy Route Handler
 * Proxies all API requests and adds auth token from HTTP-only cookie
 */
export async function GET(request: NextRequest) {
  return handleProxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request, 'DELETE');
}
