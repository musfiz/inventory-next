import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Register User API Route Handler
 * Handles user registration and sets HTTP-only cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward registration request to Laravel backend
    const response = await axios.post(`${API_URL}/register`, body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const { token, ...userData } = response.data.data;

    // Create response with user data
    const nextResponse = NextResponse.json({
      success: true,
      message: response.data.message,
      data: userData,
    });

    // Set HTTP-only cookie with the token
    if (token) {
      nextResponse.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return nextResponse;
  } catch (error: any) {
    console.error('User registration error:', error.response?.data || error.message);
    
    return NextResponse.json(
      {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors,
      },
      { status: error.response?.status || 500 }
    );
  }
}
