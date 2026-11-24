#!/bin/sh

# Stop if any command fails
set -e

echo "Starting CleanPro container..."

# Initialize database only if it does not exist
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found. Initializing..."
    npm run init-db
else
    echo "Existing database found. Keeping current data."
fi

# Start application
echo "Starting CleanPro application..."
exec npm start