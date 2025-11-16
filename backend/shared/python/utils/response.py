"""
HTTP response utilities for API Gateway Lambda integrations
"""
import json
import os
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger()


def get_cors_headers() -> Dict[str, str]:
    """
    Get CORS headers based on environment configuration

    Returns:
        Dictionary of CORS headers
    """
    # Get allowed origins from environment variable
    allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')

    # For simplicity, use the first allowed origin
    # In production, you might want to check the Origin header from the request
    origin = allowed_origins[0].strip()

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    }


def create_response(
    status_code: int,
    body: Any,
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create a standardized API Gateway response

    Args:
        status_code: HTTP status code
        body: Response body (will be JSON serialized)
        headers: Additional headers

    Returns:
        API Gateway response dictionary
    """
    default_headers = {
        'Content-Type': 'application/json',
    }

    # Add CORS headers
    default_headers.update(get_cors_headers())

    if headers:
        default_headers.update(headers)

    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body, default=str)
    }


def success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """Create a 200 OK response"""
    return create_response(200, {
        'success': True,
        'message': message,
        'data': data
    })


def created_response(data: Any, message: str = "Resource created") -> Dict[str, Any]:
    """Create a 201 Created response"""
    return create_response(201, {
        'success': True,
        'message': message,
        'data': data
    })


def bad_request_response(message: str, errors: Optional[Any] = None) -> Dict[str, Any]:
    """Create a 400 Bad Request response"""
    body = {
        'success': False,
        'message': message
    }

    if errors:
        body['errors'] = errors

    return create_response(400, body)


def unauthorized_response(message: str = "Unauthorized") -> Dict[str, Any]:
    """Create a 401 Unauthorized response"""
    return create_response(401, {
        'success': False,
        'message': message
    })


def forbidden_response(message: str = "Forbidden") -> Dict[str, Any]:
    """Create a 403 Forbidden response"""
    return create_response(403, {
        'success': False,
        'message': message
    })


def not_found_response(message: str = "Resource not found") -> Dict[str, Any]:
    """Create a 404 Not Found response"""
    return create_response(404, {
        'success': False,
        'message': message
    })


def server_error_response(message: str = "Internal server error", error: Optional[str] = None) -> Dict[str, Any]:
    """Create a 500 Internal Server Error response"""
    body = {
        'success': False,
        'message': message
    }

    if error:
        logger.error(f"Server error: {error}")
        body['error'] = error

    return create_response(500, body)


def handle_error(e: Exception) -> Dict[str, Any]:
    """
    Handle exceptions and return appropriate error response

    Args:
        e: Exception instance

    Returns:
        Error response
    """
    error_message = str(e)
    logger.error(f"Error occurred: {error_message}", exc_info=True)

    # Check for specific error types
    if "ValidationError" in type(e).__name__:
        return bad_request_response(error_message)
    elif "NotFound" in type(e).__name__:
        return not_found_response(error_message)
    elif "Unauthorized" in type(e).__name__:
        return unauthorized_response(error_message)
    else:
        return server_error_response("An unexpected error occurred", error_message)
