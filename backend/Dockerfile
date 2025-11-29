# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install development and production dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Create the production-ready image
FROM node:20-alpine

WORKDIR /app/backend

# Copy only production dependencies from builder stage
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/node_modules/ ./node_modules/
COPY --from=builder /app/backend/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD [ "npm", "start" ]
