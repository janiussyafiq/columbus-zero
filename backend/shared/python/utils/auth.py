"""
Authentication and authorization utilities for Cognito
"""
import os
import json
import boto3
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger()


def get_user_from_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract user information from API Gateway event (Cognito authorizer)

    Args:
        event: API Gateway event

    Returns:
        User information dictionary or None
    """
    try:
        # Get user from Cognito authorizer claims
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})

        if not claims:
            logger.warning("No Cognito claims found in event")
            return None

        return {
            'user_id': claims.get('sub'),
            'cognito_username': claims.get('cognito:username'),
            'email': claims.get('email'),
            'email_verified': claims.get('email_verified') == 'true',
        }
    except Exception as e:
        logger.error(f"Error extracting user from event: {str(e)}")
        return None


def get_cognito_user(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve user details from Cognito

    Args:
        user_id: Cognito user sub (UUID)

    Returns:
        User details or None
    """
    try:
        client = boto3.client('cognito-idp', region_name=os.getenv('REGION', 'us-east-1'))
        user_pool_id = os.getenv('USER_POOL_ID')

        if not user_pool_id:
            raise ValueError("USER_POOL_ID environment variable not set")

        response = client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )

        # Parse user attributes
        attributes = {attr['Name']: attr['Value'] for attr in response.get('UserAttributes', [])}

        return {
            'user_id': user_id,
            'username': response.get('Username'),
            'email': attributes.get('email'),
            'email_verified': attributes.get('email_verified') == 'true',
            'created_at': response.get('UserCreateDate'),
            'enabled': response.get('Enabled', False),
            'status': response.get('UserStatus'),
        }
    except Exception as e:
        logger.error(f"Error retrieving Cognito user: {str(e)}")
        return None


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify JWT token from Cognito (if manual verification needed)

    Args:
        token: JWT token

    Returns:
        Decoded token claims or None
    """
    # Note: In most cases, API Gateway Cognito authorizer handles this automatically
    # This function is here for cases where manual verification is needed

    try:
        # Import jwt library (would need to be added to requirements)
        import jwt
        from jwt import PyJWKClient

        region = os.getenv('REGION', 'us-east-1')
        user_pool_id = os.getenv('USER_POOL_ID')

        # Get JWKS URL
        jwks_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'

        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify and decode token
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            options={"verify_exp": True}
        )

        return decoded
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        return None
