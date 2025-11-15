"""
Database connection utilities for PostgreSQL RDS and DynamoDB
"""
import os
import json
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# Singleton connections
_pg_connection = None
_dynamodb_resource = None
_secrets_cache = {}


def get_secret(secret_name: str) -> Dict[str, Any]:
    """Retrieve secret from AWS Secrets Manager with caching"""
    if secret_name in _secrets_cache:
        return _secrets_cache[secret_name]

    client = boto3.client('secretsmanager', region_name=os.getenv('REGION', 'us-east-1'))

    try:
        response = client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response['SecretString'])
        _secrets_cache[secret_name] = secret
        return secret
    except Exception as e:
        logger.error(f"Error retrieving secret {secret_name}: {str(e)}")
        raise


def get_db_connection():
    """Get PostgreSQL database connection with connection pooling"""
    global _pg_connection

    # Check if connection exists and is alive
    if _pg_connection is not None:
        try:
            _pg_connection.isolation_level
            return _pg_connection
        except:
            _pg_connection = None

    # Get database credentials from Secrets Manager
    secret_arn = os.getenv('DB_SECRET_ARN')
    if not secret_arn:
        raise ValueError("DB_SECRET_ARN environment variable not set")

    db_secret = get_secret(secret_arn)

    db_host = db_secret.get('host')
    db_name = os.getenv('DB_NAME', 'columbus_travel')
    db_user = db_secret.get('username')
    db_password = db_secret.get('password')
    db_port = db_secret.get('port', 5432)

    try:
        _pg_connection = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=db_port,
            connect_timeout=5,
            cursor_factory=RealDictCursor
        )
        logger.info("Successfully connected to PostgreSQL database")
        return _pg_connection
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise


def get_dynamodb_resource():
    """Get DynamoDB resource"""
    global _dynamodb_resource

    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource('dynamodb', region_name=os.getenv('REGION', 'us-east-1'))

    return _dynamodb_resource


def get_dynamodb_table(table_name: str):
    """Get specific DynamoDB table"""
    dynamodb = get_dynamodb_resource()
    return dynamodb.Table(table_name)


def execute_query(query: str, params: Optional[tuple] = None, fetch_one: bool = False):
    """Execute a database query and return results"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)

            if query.strip().upper().startswith('SELECT'):
                if fetch_one:
                    return cursor.fetchone()
                return cursor.fetchall()
            else:
                conn.commit()
                return cursor.rowcount
    except Exception as e:
        conn.rollback()
        logger.error(f"Database query error: {str(e)}")
        raise


def close_db_connection():
    """Close database connection (call at end of Lambda execution if needed)"""
    global _pg_connection

    if _pg_connection is not None:
        try:
            _pg_connection.close()
            _pg_connection = None
            logger.info("Database connection closed")
        except Exception as e:
            logger.error(f"Error closing database connection: {str(e)}")
