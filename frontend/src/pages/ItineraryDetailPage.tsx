import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Calendar, DollarSign, Clock } from 'lucide-react';
import apiService from '@/services/api';

export default function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['itinerary', id],
    queryFn: () => apiService.getItinerary(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load itinerary</p>
      </div>
    );
  }

  const itinerary = data.data.itinerary_data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{itinerary.title}</h1>
        <p className="text-gray-600 mb-6">{itinerary.overview}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center text-gray-600">
            <MapPin className="h-5 w-5 mr-2" />
            <span>{itinerary.destination}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{itinerary.days.length} days</span>
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-5 w-5 mr-2" />
            <span>${itinerary.totalEstimatedCost}</span>
          </div>
        </div>
      </div>

      {/* Daily Itinerary */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Daily Itinerary</h2>
        {itinerary.days.map((day: any) => (
          <div key={day.dayNumber} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Day {day.dayNumber}: {day.title}
              </h3>
              <span className="text-gray-600">
                <DollarSign className="inline h-4 w-4" />${day.dailyCost}
              </span>
            </div>

            {/* Activities */}
            <div className="space-y-4">
              {day.activities.map((activity: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {activity.time} • {activity.durationMinutes} min
                      </div>
                      <h4 className="font-semibold text-gray-900">{activity.activity}</h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {activity.location}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600 ml-4">
                      ${activity.estimatedCost}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Meals */}
            {day.meals && Object.keys(day.meals).length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Meals</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(day.meals).map(([type, meal]: [string, any]) => (
                    <div key={type} className="text-sm">
                      <p className="font-medium text-gray-900 capitalize">{type}</p>
                      <p className="text-gray-600">{meal.name}</p>
                      <p className="text-gray-500 text-xs">${meal.estimatedCost}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      {itinerary.tips && itinerary.tips.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Tips</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {itinerary.tips.map((tip: string, idx: number) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
