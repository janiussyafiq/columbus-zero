import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import apiService from '@/services/api';
import type { GenerateItineraryRequest } from '@/types';

export default function GenerateItineraryPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateItineraryRequest>({
    destination: '',
    durationDays: 7,
    budget: 2000,
    budgetCurrency: 'USD',
    travelStyle: 'cultural',
    preferences: {
      activities: [],
      accommodationType: 'hotel',
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: GenerateItineraryRequest) => apiService.generateItinerary(data),
    onSuccess: (response) => {
      toast.success('Itinerary generated successfully!');
      navigate(`/itinerary/${response.data.itinerary_id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate itinerary');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(formData);
  };

  const handleChange = (field: keyof GenerateItineraryRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
        <p className="text-gray-600 mb-8">
          Tell us about your dream destination and we'll create a personalized itinerary
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination *
            </label>
            <input
              type="text"
              required
              value={formData.destination}
              onChange={(e) => handleChange('destination', e.target.value)}
              placeholder="e.g., Tokyo, Japan"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (days) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="30"
              value={formData.durationDays}
              onChange={(e) => handleChange('durationDays', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget *
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                required
                min="0"
                value={formData.budget}
                onChange={(e) => handleChange('budget', parseFloat(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={formData.budgetCurrency}
                onChange={(e) => handleChange('budgetCurrency', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          {/* Travel Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Travel Style *
            </label>
            <select
              value={formData.travelStyle}
              onChange={(e) => handleChange('travelStyle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cultural">Cultural & Historical</option>
              <option value="adventure">Adventure & Outdoor</option>
              <option value="relaxation">Relaxation & Beach</option>
              <option value="backpacking">Backpacking & Budget</option>
              <option value="luxury">Luxury & Comfort</option>
              <option value="foodie">Food & Cuisine</option>
              <option value="winter">Winter Sports</option>
            </select>
          </div>

          {/* Start Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Generating Your Itinerary...
              </>
            ) : (
              'Generate Itinerary'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
