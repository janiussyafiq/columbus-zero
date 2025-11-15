"""
Update existing itinerary
"""
import os
import json
import logging
from typing import Dict, Any
import sys

sys.path.append('/opt/python')

from utils.database import execute_query
from utils.response import success_response, not_found_response, forbidden_response, bad_request_response, handle_error
from utils.auth import get_user_from_event

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for updating itinerary

    Path parameter: id (itinerary ID)
    Body: fields to update
    """
    try:
        logger.info("Update itinerary request received")

        # Get authenticated user
        user = get_user_from_event(event)
        if not user:
            return forbidden_response("User authentication required")

        user_id = user['user_id']

        # Get itinerary ID from path parameters
        path_params = event.get('pathParameters', {})
        itinerary_id = path_params.get('id')

        if not itinerary_id:
            return bad_request_response("Itinerary ID required")

        # Parse request body
        body = json.loads(event.get('body', '{}'))

        # Check if user owns this itinerary
        check_query = """
            SELECT user_id FROM itineraries
            WHERE id = %s AND user_id = (SELECT id FROM users WHERE cognito_user_id = %s)
        """
        existing = execute_query(check_query, (itinerary_id, user_id), fetch_one=True)

        if not existing:
            return forbidden_response("You don't have permission to update this itinerary")

        # Build update query dynamically
        allowed_fields = ['title', 'start_date', 'end_date', 'status', 'itinerary_data', 'is_public']
        updates = []
        params = []

        for field in allowed_fields:
            if field in body:
                updates.append(f"{field} = %s")
                params.append(json.dumps(body[field]) if field == 'itinerary_data' else body[field])

        if not updates:
            return bad_request_response("No valid fields to update")

        params.append(itinerary_id)

        update_query = f"""
            UPDATE itineraries
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, updated_at
        """

        result = execute_query(update_query, tuple(params), fetch_one=True)

        logger.info(f"Itinerary updated: {itinerary_id}")

        return success_response({
            'itinerary_id': str(result['id']),
            'updated_at': result['updated_at']
        }, "Itinerary updated successfully")

    except Exception as e:
        logger.error(f"Error updating itinerary: {str(e)}", exc_info=True)
        return handle_error(e)
