FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy built application
COPY dist/ ./dist/
COPY assets/ ./assets/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3500

# Expose port
EXPOSE 3500

# Start the application
CMD ["node", "dist/index.js"]