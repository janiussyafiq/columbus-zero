"""
Retrieve saved itinerary
"""
import os
import json
import logging
from typing import Dict, Any
import sys

sys.path.append('/opt/python')

from utils.database import execute_query
from utils.response import success_response, not_found_response, forbidden_response, handle_error
from utils.auth import get_user_from_event

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for retrieving itinerary

    Path parameter: id (itinerary ID)
    """
    try:
        logger.info("Get itinerary request received")

        # Get authenticated user
        user = get_user_from_event(event)
        if not user:
            return forbidden_response("User authentication required")

        user_id = user['user_id']

        # Get itinerary ID from path parameters
        path_params = event.get('pathParameters', {})
        itinerary_id = path_params.get('id')

        if not itinerary_id:
            return not_found_response("Itinerary ID required")

        # Retrieve itinerary from database
        query = """
            SELECT i.*, u.email as user_email
            FROM itineraries i
            JOIN users u ON i.user_id = u.id
            WHERE i.id = %s
        """

        itinerary = execute_query(query, (itinerary_id,), fetch_one=True)

        if not itinerary:
            return not_found_response("Itinerary not found")

        # Check if user owns this itinerary or it's public
        itinerary_dict = dict(itinerary)
        user_owns = itinerary_dict.get('user_id') == user_id
        is_public = itinerary_dict.get('is_public', False)

        if not user_owns and not is_public:
            return forbidden_response("You don't have permission to view this itinerary")

        # Increment view count if not owner
        if not user_owns:
            update_query = "UPDATE itineraries SET view_count = view_count + 1 WHERE id = %s"
            execute_query(update_query, (itinerary_id,))

        # Parse itinerary_data JSON
        if 'itinerary_data' in itinerary_dict and isinstance(itinerary_dict['itinerary_data'], str):
            itinerary_dict['itinerary_data'] = json.loads(itinerary_dict['itinerary_data'])

        logger.info(f"Itinerary retrieved: {itinerary_id}")

        return success_response(itinerary_dict, "Itinerary retrieved successfully")

    except Exception as e:
        logger.error(f"Error retrieving itinerary: {str(e)}", exc_info=True)
        return handle_error(e)
