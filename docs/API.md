# Columbus Zero API Documentation

Base URL: `https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/{environment}`

All endpoints require authentication via Cognito JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

## Table of Contents

- [Authentication](#authentication)
- [Itinerary Endpoints](#itinerary-endpoints)
- [Chat Endpoints](#chat-endpoints)
- [User Endpoints](#user-endpoints)
- [Transportation Endpoints](#transportation-endpoints)
- [Destination Endpoints](#destination-endpoints)
- [Error Responses](#error-responses)

## Authentication

Authentication is handled by AWS Cognito. Obtain a JWT token through the Cognito hosted UI or programmatically using AWS Amplify.

## Itinerary Endpoints

### Generate Itinerary

Generate a new AI-powered travel itinerary.

**Endpoint:** `POST /itinerary/generate`

**Request Body:**
```json
{
  "destination": "Tokyo, Japan",
  "durationDays": 7,
  "budget": 2000,
  "budgetCurrency": "USD",
  "travelStyle": "cultural",
  "startDate": "2024-06-01",
  "preferences": {
    "activities": ["temples", "food", "museums"],
    "accommodationType": "hotel",
    "dietaryRestrictions": "vegetarian"
  }
}
```

**Parameters:**
- `destination` (string, required): Destination city and country
- `durationDays` (integer, required): Trip duration (1-30 days)
- `budget` (number, required): Total budget
- `budgetCurrency` (string, optional): Currency code (default: "USD")
- `travelStyle` (string, required): One of: cultural, adventure, relaxation, backpacking, luxury, foodie, winter
- `startDate` (string, optional): ISO 8601 date format
- `preferences` (object, optional): Additional preferences

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Itinerary generated successfully",
  "data": {
    "itinerary_id": "uuid",
    "itinerary": {
      "title": "7-Day Cultural Adventure in Tokyo",
      "destination": "Tokyo, Japan",
      "overview": "Experience the perfect blend of tradition and modernity...",
      "totalEstimatedCost": 2000,
      "days": [
        {
          "dayNumber": 1,
          "date": "Day 1",
          "title": "Arrival and Shibuya Exploration",
          "activities": [
            {
              "time": "10:00",
              "activity": "Visit Meiji Shrine",
              "location": "Yoyogi Park, Shibuya",
              "description": "Beautiful Shinto shrine surrounded by forest...",
              "estimatedCost": 0,
              "durationMinutes": 90
            }
          ],
          "meals": {
            "breakfast": {
              "name": "Hotel Breakfast",
              "location": "Hotel",
              "estimatedCost": 15
            },
            "lunch": {
              "name": "Ichiran Ramen",
              "location": "Shibuya",
              "estimatedCost": 12
            },
            "dinner": {
              "name": "Gonpachi",
              "location": "Nishi-Azabu",
              "estimatedCost": 45
            }
          },
          "transportation": "Tokyo Metro day pass (¥800)",
          "dailyCost": 285
        }
      ],
      "tips": [
        "Get a Suica/Pasmo card for convenient transportation",
        "Most restaurants don't accept credit cards - bring cash"
      ],
      "emergencyContacts": {
        "police": "110",
        "ambulance": "119"
      },
      "packingList": [
        "Comfortable walking shoes",
        "Power adapter (Type A/B)",
        "Pocket WiFi or SIM card"
      ]
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get Itinerary

Retrieve a saved itinerary.

**Endpoint:** `GET /itinerary/{id}`

**Path Parameters:**
- `id` (string, required): Itinerary UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Itinerary retrieved successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "7-Day Cultural Adventure in Tokyo",
    "destination_name": "Tokyo, Japan",
    "start_date": "2024-06-01",
    "end_date": "2024-06-07",
    "duration_days": 7,
    "budget_total": 2000,
    "budget_currency": "USD",
    "travel_style": "cultural",
    "status": "active",
    "itinerary_data": { ... },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Update Itinerary

Update an existing itinerary.

**Endpoint:** `PUT /itinerary/{id}`

**Path Parameters:**
- `id` (string, required): Itinerary UUID

**Request Body:**
```json
{
  "title": "Updated Trip Title",
  "status": "completed",
  "itinerary_data": { ... }
}
```

**Allowed Fields:**
- `title` (string)
- `start_date` (string)
- `end_date` (string)
- `status` (string): draft, active, completed, archived
- `itinerary_data` (object)
- `is_public` (boolean)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Itinerary updated successfully",
  "data": {
    "itinerary_id": "uuid",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

## Chat Endpoints

### Send Chat Message

Interactive chat with AI assistant for travel questions.

**Endpoint:** `POST /chat`

**Request Body:**
```json
{
  "message": "What are the best temples to visit in Kyoto?",
  "sessionId": "optional-session-uuid",
  "itineraryId": "optional-itinerary-uuid"
}
```

**Parameters:**
- `message` (string, required): User message
- `sessionId` (string, optional): Session ID for conversation continuity
- `itineraryId` (string, optional): Related itinerary for context

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Chat response generated",
  "data": {
    "session_id": "uuid",
    "message": "Kyoto has many stunning temples! Here are the top 5...",
    "timestamp": 1705318800000
  }
}
```

## User Endpoints

### Get User Preferences

Retrieve user travel preferences.

**Endpoint:** `GET /user/preferences`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User preferences retrieved",
  "data": {
    "travel_style": "cultural",
    "budget_preference": "moderate",
    "accommodation_preference": "hotel",
    "food_preference": "local",
    "activity_preferences": ["temples", "museums", "hiking"],
    "dietary_restrictions": "vegetarian"
  }
}
```

### Update User Preferences

Save or update user travel preferences.

**Endpoint:** `POST /user/preferences`

**Request Body:**
```json
{
  "travel_style": "adventure",
  "budget_preference": "budget",
  "accommodation_preference": "hostel",
  "food_preference": "local",
  "activity_preferences": ["hiking", "camping", "diving"],
  "dietary_restrictions": null
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User preferences updated",
  "data": { ... }
}
```

## Transportation Endpoints

### Get Transportation Guidance

Get real-time transportation recommendations using Google Maps.

**Endpoint:** `GET /transportation/guidance`

**Query Parameters:**
- `origin` (string, required): Starting location
- `destination` (string, required): Ending location

**Example:** `GET /transportation/guidance?origin=Shibuya%20Station&destination=Tokyo%20Tower`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Transportation guidance retrieved",
  "data": {
    "routes": [
      {
        "mode": "transit",
        "duration": "25 minutes",
        "steps": [
          {
            "instruction": "Take Yamanote Line from Shibuya to Hamamatsucho",
            "duration": "15 min",
            "fare": "¥200"
          },
          {
            "instruction": "Walk to Tokyo Tower",
            "duration": "10 min"
          }
        ],
        "totalCost": "¥200"
      }
    ]
  }
}
```

## Destination Endpoints

### Suggest Destinations

Get AI-powered destination suggestions.

**Endpoint:** `GET /destinations/suggest`

**Query Parameters:**
- `budget` (number, optional): Budget in USD
- `travelStyle` (string, optional): Travel style preference

**Example:** `GET /destinations/suggest?budget=2000&travelStyle=adventure`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Destination suggestions retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "Patagonia",
      "country": "Argentina/Chile",
      "description": "Vast wilderness with stunning glaciers and mountains",
      "tags": ["adventure", "nature", "hiking"],
      "estimatedDailyBudget": {
        "budget": 50,
        "moderate": 100,
        "luxury": 250
      },
      "popularActivities": ["hiking", "glaciers", "wildlife"]
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Example Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: destination, durationDays"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "User authentication required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Itinerary not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "An unexpected error occurred",
  "error": "Error details (only in non-production)"
}
```

## Rate Limiting

API Gateway enforces rate limiting:

- **Development:** 50 requests/second, burst of 100
- **Staging:** 100 requests/second, burst of 200
- **Production:** 2000 requests/second, burst of 5000

When rate limit is exceeded, the API returns `429 Too Many Requests`.

## Pagination

For endpoints that return lists (future enhancement), pagination will follow this pattern:

```
GET /endpoint?limit=20&offset=0
```

Response will include pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```
