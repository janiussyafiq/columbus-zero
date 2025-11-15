import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import type {
  ApiResponse,
  GenerateItineraryRequest,
  Itinerary,
  ChatRequest,
  ChatMessage,
  UserPreferences,
  Destination,
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const session = await fetchAuthSession();
          const token = session.tokens?.idToken?.toString();

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error fetching auth token:', error);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Itinerary endpoints
  async generateItinerary(data: GenerateItineraryRequest): Promise<ApiResponse<Itinerary>> {
    const response = await this.api.post('/itinerary/generate', data);
    return response.data;
  }

  async getItinerary(id: string): Promise<ApiResponse<Itinerary>> {
    const response = await this.api.get(`/itinerary/${id}`);
    return response.data;
  }

  async updateItinerary(id: string, data: Partial<Itinerary>): Promise<ApiResponse<Itinerary>> {
    const response = await this.api.put(`/itinerary/${id}`, data);
    return response.data;
  }

  // Chat endpoints
  async sendChatMessage(data: ChatRequest): Promise<ApiResponse<{ message: string; sessionId: string }>> {
    const response = await this.api.post('/chat', data);
    return response.data;
  }

  // User preferences endpoints
  async getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
    const response = await this.api.get('/user/preferences');
    return response.data;
  }

  async updateUserPreferences(data: UserPreferences): Promise<ApiResponse<UserPreferences>> {
    const response = await this.api.post('/user/preferences', data);
    return response.data;
  }

  // Destination endpoints
  async suggestDestinations(params?: {
    budget?: number;
    travelStyle?: string;
  }): Promise<ApiResponse<Destination[]>> {
    const response = await this.api.get('/destinations/suggest', { params });
    return response.data;
  }

  // Transportation endpoints
  async getTransportationGuidance(origin: string, destination: string): Promise<ApiResponse<any>> {
    const response = await this.api.get('/transportation/guidance', {
      params: { origin, destination },
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
