"""
Generate AI-powered travel itinerary using Anthropic Claude
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
import sys

# Add shared utilities to path
sys.path.append('/opt/python')

from utils.database import execute_query, get_secret
from utils.response import success_response, bad_request_response, handle_error
from utils.auth import get_user_from_event

import anthropic

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for generating travel itineraries

    Expected request body:
    {
        "destination": "Tokyo, Japan",
        "duration_days": 7,
        "budget": 2000,
        "budget_currency": "USD",
        "travel_style": "cultural",
        "start_date": "2024-06-01",
        "preferences": {
            "activities": ["temples", "food", "museums"],
            "accommodation_type": "hotel",
            "dietary_restrictions": null
        }
    }
    """
    try:
        logger.info("Generate itinerary request received")

        # Get authenticated user
        user = get_user_from_event(event)
        if not user:
            return bad_request_response("User authentication required")

        user_id = user['user_id']

        # Parse request body
        body = json.loads(event.get('body', '{}'))

        # Validate required fields
        required_fields = ['destination', 'duration_days', 'budget', 'travel_style']
        missing_fields = [field for field in required_fields if field not in body]

        if missing_fields:
            return bad_request_response(f"Missing required fields: {', '.join(missing_fields)}")

        destination = body['destination']
        duration_days = int(body['duration_days'])
        budget = float(body['budget'])
        budget_currency = body.get('budget_currency', 'USD')
        travel_style = body['travel_style']
        start_date_str = body.get('start_date')
        preferences = body.get('preferences', {})

        # Validate duration
        if duration_days < 1 or duration_days > 30:
            return bad_request_response("Duration must be between 1 and 30 days")

        # Get user preferences from database
        user_prefs_query = """
            SELECT travel_style, budget_preference, accommodation_preference,
                   food_preference, activity_preferences, dietary_restrictions
            FROM user_preferences
            WHERE user_id = (SELECT id FROM users WHERE cognito_user_id = %s)
        """
        user_db_prefs = execute_query(user_prefs_query, (user_id,), fetch_one=True)

        # Generate itinerary using Claude
        itinerary_data = generate_itinerary_with_claude(
            destination=destination,
            duration_days=duration_days,
            budget=budget,
            budget_currency=budget_currency,
            travel_style=travel_style,
            preferences=preferences,
            user_db_prefs=dict(user_db_prefs) if user_db_prefs else None
        )

        # Save itinerary to database
        start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
        end_date = start_date + timedelta(days=duration_days - 1) if start_date else None

        insert_query = """
            INSERT INTO itineraries (
                user_id, title, destination_name, start_date, end_date,
                duration_days, budget_total, budget_currency, travel_style,
                status, itinerary_data, ai_model_version
            ) VALUES (
                (SELECT id FROM users WHERE cognito_user_id = %s),
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id, created_at
        """

        result = execute_query(insert_query, (
            user_id,
            itinerary_data['title'],
            destination,
            start_date,
            end_date,
            duration_days,
            budget,
            budget_currency,
            travel_style,
            'draft',
            json.dumps(itinerary_data),
            'claude-3-sonnet-20240229'
        ), fetch_one=True)

        itinerary_id = result['id']

        logger.info(f"Itinerary created successfully: {itinerary_id}")

        return success_response({
            'itinerary_id': str(itinerary_id),
            'itinerary': itinerary_data,
            'created_at': result['created_at']
        }, "Itinerary generated successfully")

    except Exception as e:
        logger.error(f"Error generating itinerary: {str(e)}", exc_info=True)
        return handle_error(e)


def generate_itinerary_with_claude(
    destination: str,
    duration_days: int,
    budget: float,
    budget_currency: str,
    travel_style: str,
    preferences: Dict[str, Any],
    user_db_prefs: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Generate travel itinerary using Anthropic Claude API

    Returns:
        Structured itinerary data
    """
    # Get Anthropic API key from Secrets Manager
    api_key_secret = os.getenv('ANTHROPIC_API_KEY_SECRET', 'ANTHROPIC_API_KEY')
    secret = get_secret(api_key_secret)
    api_key = secret.get('api_key') or secret.get('ANTHROPIC_API_KEY')

    client = anthropic.Anthropic(api_key=api_key)

    # Build comprehensive prompt
    prompt = f"""You are an expert travel planner. Create a detailed {duration_days}-day itinerary for {destination}.

Trip Details:
- Destination: {destination}
- Duration: {duration_days} days
- Total Budget: {budget} {budget_currency}
- Travel Style: {travel_style}

User Preferences:
{json.dumps(preferences, indent=2)}

Please create a comprehensive day-by-day itinerary that includes:
1. Daily activities with specific times and locations
2. Restaurant recommendations for breakfast, lunch, and dinner
3. Transportation suggestions between locations
4. Estimated costs for each activity
5. Practical tips and local insights
6. Emergency contacts and important information

Format the response as a structured JSON with this schema:
{{
    "title": "Trip title",
    "destination": "{destination}",
    "overview": "Brief overview of the trip",
    "total_estimated_cost": {budget},
    "days": [
        {{
            "day_number": 1,
            "date": "Day 1",
            "title": "Day title",
            "activities": [
                {{
                    "time": "09:00",
                    "activity": "Activity name",
                    "location": "Location name",
                    "description": "Detailed description",
                    "estimated_cost": 50,
                    "duration_minutes": 120
                }}
            ],
            "meals": {{
                "breakfast": {{"name": "Restaurant", "location": "Address", "estimated_cost": 15}},
                "lunch": {{"name": "Restaurant", "location": "Address", "estimated_cost": 20}},
                "dinner": {{"name": "Restaurant", "location": "Address", "estimated_cost": 35}}
            }},
            "transportation": "Transportation details for the day",
            "daily_cost": 200
        }}
    ],
    "tips": ["Tip 1", "Tip 2"],
    "emergency_contacts": {{"police": "number", "ambulance": "number"}},
    "packing_list": ["Item 1", "Item 2"]
}}

Ensure the itinerary is realistic, well-paced, and fits within the budget."""

    try:
        # Call Claude API
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4096,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse response
        response_text = message.content[0].text

        # Extract JSON from response (Claude might wrap it in markdown)
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()

        itinerary_data = json.loads(response_text)

        logger.info("Successfully generated itinerary with Claude")
        return itinerary_data

    except Exception as e:
        logger.error(f"Error calling Claude API: {str(e)}")
        # Fallback to basic itinerary structure
        return create_fallback_itinerary(destination, duration_days, budget, budget_currency)


def create_fallback_itinerary(destination: str, duration_days: int, budget: float, currency: str) -> Dict[str, Any]:
    """Create a basic fallback itinerary if AI generation fails"""
    return {
        "title": f"{duration_days}-Day Trip to {destination}",
        "destination": destination,
        "overview": f"A {duration_days}-day adventure in {destination}",
        "total_estimated_cost": budget,
        "days": [
            {
                "day_number": i + 1,
                "date": f"Day {i + 1}",
                "title": f"Explore {destination}",
                "activities": [],
                "meals": {},
                "transportation": "To be planned",
                "daily_cost": budget / duration_days
            }
            for i in range(duration_days)
        ],
        "tips": ["Plan ahead", "Stay safe", "Have fun"],
        "emergency_contacts": {},
        "packing_list": []
    }
