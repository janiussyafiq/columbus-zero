"""
One-time migration Lambda function
Run this manually to initialize the database schema
"""
import os
import sys
sys.path.append('/opt/python')

from utils.database import get_db_connection
import logging

logger = logging.getLogger()
logger.setLevel('INFO')

MIGRATION_SQL = """
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

CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON users(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User Travel Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    travel_style VARCHAR(50),
    budget_preference VARCHAR(50),
    accommodation_preference VARCHAR(50),
    food_preference VARCHAR(50),
    activity_preferences JSONB,
    accessibility_needs TEXT,
    dietary_restrictions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

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
    estimated_daily_budget JSONB,
    tags JSONB,
    is_popular BOOLEAN DEFAULT FALSE,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);
CREATE INDEX IF NOT EXISTS idx_destinations_popular ON destinations(is_popular);
CREATE INDEX IF NOT EXISTS idx_destinations_tags ON destinations USING GIN(tags);

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
    status VARCHAR(50) DEFAULT 'draft',
    itinerary_data JSONB NOT NULL,
    ai_model_version VARCHAR(50),
    generation_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_destination_id ON itineraries(destination_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_itineraries_dates ON itineraries(start_date, end_date);

-- Chat History
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_destinations_updated_at ON destinations;
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"""

def handler(event, context):
    """Run database migration"""
    try:
        logger.info("Starting database migration...")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute migration
        cursor.execute(MIGRATION_SQL)
        conn.commit()

        logger.info("Migration completed successfully!")

        return {
            'statusCode': 200,
            'body': 'Migration completed successfully'
        }

    except Exception as e:
        logger.error(f"Migration failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': f'Migration failed: {str(e)}'
        }
