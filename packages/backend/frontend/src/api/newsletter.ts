import axios, { AxiosError } from 'axios';
import { GenerateNewsletterResponse, ApiError } from '../types/newsletter';

const API_BASE = (import.meta as any).env?.PROD ? '/api' : 'http://localhost:3000/api';

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
    const response = await axios.get(`${API_BASE}/health`);
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}