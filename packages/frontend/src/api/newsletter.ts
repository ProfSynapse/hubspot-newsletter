import axios, { AxiosError } from 'axios';
import { GenerateNewsletterResponse, CurateArticlesResponse, ApiError } from '../types/newsletter';

const API_BASE = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:3000/api';

// Phase 1: Curate articles
export async function curateArticles(query: string): Promise<CurateArticlesResponse> {
  try {
    const response = await axios.post<CurateArticlesResponse>(
      `${API_BASE}/curate-articles`,
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
    throw new Error(axiosError.response?.data?.message || 'Failed to curate articles');
  }
}

// Phase 2: Generate newsletter from curated articles
export async function generateFromCurated(query: string, articleIds: number[]): Promise<GenerateNewsletterResponse> {
  try {
    const response = await axios.post<GenerateNewsletterResponse>(
      `${API_BASE}/generate-from-curated`,
      { query, articleIds },
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

// Legacy single-phase generation (backwards compatibility)
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