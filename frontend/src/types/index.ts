// Type definitions for Columbus Zero

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  preferredCurrency?: string;
  homeCountry?: string;
}

export interface UserPreferences {
  travelStyle?: string;
  budgetPreference?: string;
  accommodationPreference?: string;
  foodPreference?: string;
  activityPreferences?: string[];
  dietaryRestrictions?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  city?: string;
  description?: string;
  tags?: string[];
  popularActivities?: string[];
  estimatedDailyBudget?: {
    budget: number;
    moderate: number;
    luxury: number;
  };
}

export interface Activity {
  time: string;
  activity: string;
  location: string;
  description: string;
  estimatedCost: number;
  durationMinutes: number;
}

export interface Meal {
  name: string;
  location: string;
  estimatedCost: number;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  activities: Activity[];
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
  };
  transportation: string;
  dailyCost: number;
}

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  overview: string;
  totalEstimatedCost: number;
  days: ItineraryDay[];
  tips: string[];
  emergencyContacts?: Record<string, string>;
  packingList?: string[];
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateItineraryRequest {
  destination: string;
  durationDays: number;
  budget: number;
  budgetCurrency: string;
  travelStyle: string;
  startDate?: string;
  preferences?: {
    activities?: string[];
    accommodationType?: string;
    dietaryRestrictions?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  itineraryId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
