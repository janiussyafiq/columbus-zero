-- Sample Destinations Data for Columbus Zero
-- Popular travel destinations with basic information

INSERT INTO destinations (name, country, city, region, latitude, longitude, description, best_time_to_visit, popular_activities, estimated_daily_budget, tags, is_popular, popularity_score) VALUES
(
    'Tokyo',
    'Japan',
    'Tokyo',
    'Kanto',
    35.6762,
    139.6503,
    'A vibrant metropolis blending traditional culture with cutting-edge technology, offering world-class cuisine, shopping, and cultural experiences.',
    'March-May, September-November',
    '["temples", "sushi", "shopping", "anime", "nightlife", "museums"]'::jsonb,
    '{"budget": 60, "moderate": 120, "luxury": 300}'::jsonb,
    '["urban", "cultural", "food", "technology", "shopping"]'::jsonb,
    true,
    95
),
(
    'Paris',
    'France',
    'Paris',
    'Île-de-France',
    48.8566,
    2.3522,
    'The City of Light, renowned for art, fashion, gastronomy, and culture. Home to iconic landmarks like the Eiffel Tower and Louvre.',
    'April-June, September-October',
    '["museums", "cafe culture", "architecture", "shopping", "wine tasting", "romantic walks"]'::jsonb,
    '{"budget": 70, "moderate": 150, "luxury": 400}'::jsonb,
    '["romantic", "cultural", "art", "food", "historical"]'::jsonb,
    true,
    98
),
(
    'Bali',
    'Indonesia',
    'Denpasar',
    'Bali',
    -8.3405,
    115.0920,
    'Tropical paradise known for beaches, rice terraces, temples, and vibrant culture. Perfect for relaxation and adventure.',
    'April-October',
    '["surfing", "yoga", "temples", "rice terraces", "diving", "beach relaxation"]'::jsonb,
    '{"budget": 25, "moderate": 60, "luxury": 200}'::jsonb,
    '["beach", "adventure", "spiritual", "nature", "relaxation"]'::jsonb,
    true,
    92
),
(
    'New York City',
    'United States',
    'New York',
    'New York',
    40.7128,
    -74.0060,
    'The city that never sleeps. Global hub for culture, entertainment, finance, and gastronomy with endless attractions.',
    'April-June, September-November',
    '["museums", "broadway", "shopping", "fine dining", "nightlife", "sightseeing"]'::jsonb,
    '{"budget": 80, "moderate": 180, "luxury": 500}'::jsonb,
    '["urban", "cultural", "entertainment", "food", "shopping"]'::jsonb,
    true,
    97
),
(
    'Barcelona',
    'Spain',
    'Barcelona',
    'Catalonia',
    41.3851,
    2.1734,
    'Mediterranean coastal city famous for Gaudí architecture, beaches, tapas, and vibrant street life.',
    'May-June, September-October',
    '["architecture", "beaches", "tapas", "nightlife", "art", "festivals"]'::jsonb,
    '{"budget": 50, "moderate": 100, "luxury": 250}'::jsonb,
    '["beach", "cultural", "art", "food", "nightlife"]'::jsonb,
    true,
    90
),
(
    'Reykjavik',
    'Iceland',
    'Reykjavik',
    'Capital Region',
    64.1466,
    -21.9426,
    'Gateway to Iceland natural wonders including Northern Lights, geothermal spas, and volcanic landscapes.',
    'June-August, December-March',
    '["northern lights", "blue lagoon", "hiking", "whale watching", "glaciers", "hot springs"]'::jsonb,
    '{"budget": 100, "moderate": 180, "luxury": 350}'::jsonb,
    '["nature", "adventure", "winter sports", "unique", "photography"]'::jsonb,
    true,
    88
),
(
    'Bangkok',
    'Thailand',
    'Bangkok',
    'Central Thailand',
    13.7563,
    100.5018,
    'Bustling capital known for ornate temples, vibrant street life, markets, and incredible street food.',
    'November-February',
    '["temples", "street food", "markets", "nightlife", "massage", "shopping"]'::jsonb,
    '{"budget": 20, "moderate": 50, "luxury": 150}'::jsonb,
    '["urban", "cultural", "food", "budget-friendly", "nightlife"]'::jsonb,
    true,
    93
),
(
    'Santorini',
    'Greece',
    'Thira',
    'Cyclades',
    36.3932,
    25.4615,
    'Iconic Greek island with white-washed buildings, blue domes, stunning sunsets, and volcanic beaches.',
    'April-November',
    '["sunsets", "wine tasting", "beaches", "sailing", "photography", "romantic dining"]'::jsonb,
    '{"budget": 60, "moderate": 130, "luxury": 350}'::jsonb,
    '["romantic", "beach", "relaxation", "photography", "wine"]'::jsonb,
    true,
    91
),
(
    'Dubai',
    'United Arab Emirates',
    'Dubai',
    'Dubai',
    25.2048,
    55.2708,
    'Futuristic city with luxury shopping, ultramodern architecture, and lively nightlife scene.',
    'November-March',
    '["shopping", "skyscrapers", "desert safari", "luxury dining", "beach clubs", "water parks"]'::jsonb,
    '{"budget": 80, "moderate": 180, "luxury": 500}'::jsonb,
    '["luxury", "urban", "shopping", "beach", "desert"]'::jsonb,
    true,
    89
),
(
    'Patagonia',
    'Argentina/Chile',
    'El Calafate',
    'Patagonia',
    -50.3375,
    -72.2650,
    'Vast wilderness region offering glaciers, mountains, and pristine landscapes for adventurous travelers.',
    'November-March',
    '["hiking", "glaciers", "wildlife", "photography", "trekking", "camping"]'::jsonb,
    '{"budget": 50, "moderate": 100, "luxury": 250}'::jsonb,
    '["adventure", "nature", "hiking", "photography", "remote"]'::jsonb,
    true,
    85
);

-- Update popularity scores based on typical tourist numbers
UPDATE destinations SET popularity_score = 98 WHERE name = 'Paris';
UPDATE destinations SET popularity_score = 97 WHERE name = 'New York City';
UPDATE destinations SET popularity_score = 95 WHERE name = 'Tokyo';
UPDATE destinations SET popularity_score = 93 WHERE name = 'Bangkok';
UPDATE destinations SET popularity_score = 92 WHERE name = 'Bali';
