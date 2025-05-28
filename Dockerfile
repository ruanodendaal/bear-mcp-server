# Use the official Node.js 16 LTS image as the base
FROM node:16-slim

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Make the server script executable
RUN chmod +x src/bear-mcp-server.js

# Define the default command to run the server
CMD ["node", "src/bear-mcp-server.js"]
