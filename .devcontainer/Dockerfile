FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Create workspace
WORKDIR /workspace

# Set up node user
USER node

# Install global tools
RUN npm install -g tsx prisma

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install

# Set the default shell
SHELL ["/bin/bash", "-c"]