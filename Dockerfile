# Use official Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json .

# Install dependencies
RUN npm install

# Copy app source
COPY app.js .

# Expose port
EXPOSE 3000

# Run the app
CMD [ "node", "app.js" ]