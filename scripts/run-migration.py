#!/usr/bin/env python3
"""
Run database migrations on RDS
This script connects to RDS and runs the initial schema migration
"""
import sys
import os
import psycopg2
import boto3
import json

def get_db_credentials():
    """Get database credentials from Secrets Manager"""
    secret_arn = "arn:aws:secretsmanager:us-east-1:878302603905:secret:columbus-zero-db-credentials-dev-InwXL3"

    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response['SecretString'])

def run_migration():
    """Run the database migration"""
    print("🔄 Getting database credentials...")
    creds = get_db_credentials()

    print(f"📡 Connecting to database at {creds['host']}...")

    # Note: This will only work if run from within the VPC or through a bastion
    # For now, we'll print instructions instead
    print("\n⚠️  Database is in a private VPC subnet.")
    print("You have two options to run the migration:\n")

    print("Option 1: Use AWS Lambda Console")
    print("1. Go to AWS Lambda console")
    print("2. Create a test function with VPC access")
    print("3. Run the migration SQL from there\n")

    print("Option 2: Use psql from a bastion host or EC2")
    print(f"   Host: {creds['host']}")
    print(f"   Database: {creds['dbname']}")
    print(f"   Username: {creds['username']}")
    print(f"   Password: {creds['password']}")
    print(f"   Port: {creds['port']}\n")

    print("Run: psql -h {host} -U {username} -d {dbname} -f database/migrations/001_initial_schema.sql".format(**creds))

if __name__ == "__main__":
    run_migration()
