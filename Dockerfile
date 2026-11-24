# Base image: Node.js 20
FROM node:20-bookworm-slim

# Working directory inside the container
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Copy container entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Application port
EXPOSE 3000

# Start application through entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]