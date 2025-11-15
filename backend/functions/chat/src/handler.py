"""
Interactive chat with AI for travel questions
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List
import sys
import uuid

sys.path.append('/opt/python')

from utils.database import get_dynamodb_table, execute_query, get_secret
from utils.response import success_response, bad_request_response, handle_error
from utils.auth import get_user_from_event

import anthropic

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for chat interactions

    Expected request body:
    {
        "message": "What are the best places to visit in Tokyo?",
        "session_id": "optional-session-id",
        "itinerary_id": "optional-itinerary-id"
    }
    """
    try:
        logger.info("Chat request received")

        # Get authenticated user
        user = get_user_from_event(event)
        if not user:
            return bad_request_response("User authentication required")

        user_id = user['user_id']

        # Parse request body
        body = json.loads(event.get('body', '{}'))

        message = body.get('message', '').strip()
        if not message:
            return bad_request_response("Message is required")

        session_id = body.get('session_id') or str(uuid.uuid4())
        itinerary_id = body.get('itinerary_id')

        # Get chat history from DynamoDB
        sessions_table = get_dynamodb_table(os.getenv('SESSIONS_TABLE'))
        chat_history = get_chat_history(sessions_table, session_id, user_id)

        # Get itinerary context if provided
        itinerary_context = None
        if itinerary_id:
            itinerary_context = get_itinerary_context(itinerary_id, user_id)

        # Generate AI response
        ai_response = generate_chat_response(message, chat_history, itinerary_context)

        # Save messages to DynamoDB
        timestamp = int(datetime.now().timestamp() * 1000)
        ttl = int((datetime.now().timestamp() + 86400 * 7))  # 7 days TTL

        # Save user message
        sessions_table.put_item(Item={
            'sessionId': session_id,
            'timestamp': timestamp,
            'userId': user_id,
            'role': 'user',
            'content': message,
            'itineraryId': itinerary_id,
            'ttl': ttl
        })

        # Save assistant response
        sessions_table.put_item(Item={
            'sessionId': session_id,
            'timestamp': timestamp + 1,
            'userId': user_id,
            'role': 'assistant',
            'content': ai_response,
            'itineraryId': itinerary_id,
            'ttl': ttl
        })

        logger.info(f"Chat interaction completed for session: {session_id}")

        return success_response({
            'session_id': session_id,
            'message': ai_response,
            'timestamp': timestamp
        }, "Chat response generated")

    except Exception as e:
        logger.error(f"Error in chat handler: {str(e)}", exc_info=True)
        return handle_error(e)


def get_chat_history(table, session_id: str, user_id: str, limit: int = 10) -> List[Dict[str, str]]:
    """Retrieve recent chat history from DynamoDB"""
    try:
        response = table.query(
            KeyConditionExpression='sessionId = :sid',
            ExpressionAttributeValues={':sid': session_id},
            ScanIndexForward=False,  # Most recent first
            Limit=limit * 2  # Get both user and assistant messages
        )

        messages = []
        for item in reversed(response.get('Items', [])):
            messages.append({
                'role': item['role'],
                'content': item['content']
            })

        return messages
    except Exception as e:
        logger.warning(f"Error retrieving chat history: {str(e)}")
        return []


def get_itinerary_context(itinerary_id: str, user_id: str) -> Dict[str, Any]:
    """Get itinerary details for context"""
    try:
        query = """
            SELECT destination_name, duration_days, travel_style, itinerary_data
            FROM itineraries
            WHERE id = %s AND user_id = (SELECT id FROM users WHERE cognito_user_id = %s)
        """
        result = execute_query(query, (itinerary_id, user_id), fetch_one=True)

        if result:
            context = dict(result)
            if isinstance(context.get('itinerary_data'), str):
                context['itinerary_data'] = json.loads(context['itinerary_data'])
            return context

        return None
    except Exception as e:
        logger.warning(f"Error retrieving itinerary context: {str(e)}")
        return None


def generate_chat_response(
    message: str,
    chat_history: List[Dict[str, str]],
    itinerary_context: Dict[str, Any] = None
) -> str:
    """Generate AI response using Claude"""
    try:
        # Get Anthropic API key
        api_key_secret = os.getenv('ANTHROPIC_API_KEY_SECRET', 'ANTHROPIC_API_KEY')
        secret = get_secret(api_key_secret)
        api_key = secret.get('api_key') or secret.get('ANTHROPIC_API_KEY')

        client = anthropic.Anthropic(api_key=api_key)

        # Build system prompt
        system_prompt = """You are a knowledgeable and friendly travel assistant. Help users with:
- Travel planning and itinerary suggestions
- Destination recommendations
- Budget advice
- Cultural tips and local insights
- Transportation guidance
- Safety information
- Food and restaurant suggestions

Provide accurate, helpful, and engaging responses. Be concise but informative."""

        # Add itinerary context if available
        if itinerary_context:
            system_prompt += f"\n\nCurrent itinerary context:\n"
            system_prompt += f"Destination: {itinerary_context.get('destination_name')}\n"
            system_prompt += f"Duration: {itinerary_context.get('duration_days')} days\n"
            system_prompt += f"Travel Style: {itinerary_context.get('travel_style')}\n"

        # Build messages list
        messages = chat_history + [{"role": "user", "content": message}]

        # Call Claude API
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=messages
        )

        ai_message = response.content[0].text

        logger.info("Successfully generated chat response")
        return ai_message

    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        return "I'm sorry, I encountered an error processing your request. Please try again."
