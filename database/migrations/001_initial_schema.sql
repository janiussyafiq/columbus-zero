-- Columbus Zero Travel AI - Initial Database Schema
-- PostgreSQL Schema for structured data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table (extends Cognito with additional travel-specific data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    home_country VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_cognito_id ON users(cognito_user_id);
CREATE INDEX idx_users_email ON users(email);

-- User Travel Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    travel_style VARCHAR(50), -- backpacking, luxury, adventure, relaxation, cultural, etc.
    budget_preference VARCHAR(50), -- budget, moderate, luxury
    accommodation_preference VARCHAR(50), -- hostel, hotel, airbnb, resort
    food_preference VARCHAR(50), -- local, international, vegetarian, vegan
    activity_preferences JSONB, -- array of preferred activities
    accessibility_needs TEXT,
    dietary_restrictions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Destinations Table
CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    best_time_to_visit VARCHAR(50),
    average_temperature_range VARCHAR(50),
    popular_activities JSONB,
    estimated_daily_budget JSONB, -- {budget: 30, moderate: 80, luxury: 200}
    tags JSONB, -- array of tags like "beach", "mountains", "cultural"
    is_popular BOOLEAN DEFAULT FALSE,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_destinations_country ON destinations(country);
CREATE INDEX idx_destinations_popular ON destinations(is_popular);
CREATE INDEX idx_destinations_tags ON destinations USING GIN(tags);

-- Itineraries Table
CREATE TABLE IF NOT EXISTS itineraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    destination_name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    duration_days INTEGER NOT NULL,
    budget_total DECIMAL(10, 2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    travel_style VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, archived
    itinerary_data JSONB NOT NULL, -- Full AI-generated itinerary JSON
    ai_model_version VARCHAR(50),
    generation_metadata JSONB, -- prompt used, generation time, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX idx_itineraries_destination_id ON itineraries(destination_id);
CREATE INDEX idx_itineraries_status ON itineraries(status);
CREATE INDEX idx_itineraries_dates ON itineraries(start_date, end_date);

-- Itinerary Daily Plans
CREATE TABLE IF NOT EXISTS itinerary_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE,
    title VARCHAR(255),
    description TEXT,
    activities JSONB NOT NULL, -- array of activities with time, location, cost
    meals JSONB, -- breakfast, lunch, dinner recommendations
    transportation JSONB, -- transport details for the day
    estimated_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(itinerary_id, day_number)
);

CREATE INDEX idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);

-- Chat History (for session continuity)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    metadata JSONB, -- additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- User Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_type VARCHAR(50), -- general, itinerary, feature_request, bug_report
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_itinerary_id ON feedback(itinerary_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);

-- Saved Places (user bookmarks)
CREATE TABLE IF NOT EXISTS saved_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    place_name VARCHAR(255) NOT NULL,
    place_type VARCHAR(50), -- restaurant, attraction, accommodation, activity
    location JSONB, -- {lat, lng, address}
    notes TEXT,
    visited BOOLEAN DEFAULT FALSE,
    visited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, destination_id, place_name)
);

CREATE INDEX idx_saved_places_user_id ON saved_places(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_days_updated_at BEFORE UPDATE ON itinerary_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts extended from Cognito';
COMMENT ON TABLE user_preferences IS 'User travel preferences and settings';
COMMENT ON TABLE destinations IS 'Travel destinations database';
COMMENT ON TABLE itineraries IS 'AI-generated travel itineraries';
COMMENT ON TABLE itinerary_days IS 'Daily breakdown of itineraries';
COMMENT ON TABLE chat_messages IS 'Chat history with AI assistant';
COMMENT ON TABLE feedback IS 'User feedback and ratings';
COMMENT ON TABLE saved_places IS 'User bookmarked places';
