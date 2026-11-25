#!/bin/bash

# Stop execution if any command fails
set -e

echo "Starting CleanPro deployment..."

# Download the latest Docker image from GHCR
docker compose pull

# Recreate the container using the latest image
docker compose up -d

# Display container status
docker compose ps

echo "CleanPro deployment completed successfully!"