import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, DollarSign } from 'lucide-react';

export default function HomePage() {
  // In a real app, this would fetch user's itineraries from the API
  const itineraries = [
    {
      id: '1',
      title: '7-Day Adventure in Tokyo',
      destination: 'Tokyo, Japan',
      duration: '7 days',
      budget: '$2,000',
      status: 'active',
    },
    // Add more mock itineraries as needed
  ];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-4">Welcome to Columbus Zero</h1>
        <p className="text-lg mb-6">
          Your AI-powered travel companion for creating perfect itineraries
        </p>
        <Link
          to="/generate"
          className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          <Plus className="h-5 w-5 mr-2" />
          Plan a New Trip
        </Link>
      </div>

      {/* Itineraries list */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Itineraries</h2>
          <Link
            to="/generate"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Create New
          </Link>
        </div>

        {itineraries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No itineraries yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start planning your next adventure with AI assistance
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Itinerary
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((itinerary) => (
              <Link
                key={itinerary.id}
                to={`/itinerary/${itinerary.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {itinerary.title}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {itinerary.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {itinerary.destination}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {itinerary.duration}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {itinerary.budget}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">AI Chat Assistant</h3>
          <p className="text-sm text-gray-600 mb-4">
            Ask questions about destinations, get travel tips, and refine your plans
          </p>
          <Link
            to="/chat"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Start chatting →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Discover Destinations</h3>
          <p className="text-sm text-gray-600 mb-4">
            Get AI-powered destination suggestions based on your preferences
          </p>
          <Link
            to="/discover"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Explore now →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Travel Preferences</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set your travel style and preferences for better recommendations
          </p>
          <Link
            to="/profile"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Update preferences →
          </Link>
        </div>
      </div>
    </div>
  );
}
