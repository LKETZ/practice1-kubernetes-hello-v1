# Use official Node.js image
FROM node:18-slim
# Create app directory
WORKDIR /usr/src/app
# Copy app source
COPY app.js .
# Expose port
EXPOSE 3000
# Run the app
CMD [ "node", "app.js" ]