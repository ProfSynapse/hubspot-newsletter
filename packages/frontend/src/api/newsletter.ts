import axios, { AxiosError } from 'axios';
import { GenerateNewsletterResponse, ApiError } from '../types/newsletter';

const API_BASE = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:3000/api';

export async function generateNewsletter(query: string): Promise<GenerateNewsletterResponse> {
  try {
    const response = await axios.post<GenerateNewsletterResponse>(
      `${API_BASE}/generate`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    throw new Error(axiosError.response?.data?.message || 'Failed to generate newsletter');
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const response = await axios.get(`${backendUrl}/health`);
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}