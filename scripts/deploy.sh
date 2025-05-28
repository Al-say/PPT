#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Start/restart the application with PM2
if pm2 list | grep -q "ppt-server"; then
    echo "Restarting existing PM2 process..."
    pm2 restart ppt-server
else
    echo "Starting new PM2 process..."
    pm2 start server.js --name "ppt-server"
fi

# Save PM2 process list and configure startup
echo "Configuring PM2 startup..."
pm2 save

echo "Deployment completed successfully!"
echo "Your application should now be running at http://www.alsay.net"
echo "Check 'pm2 logs ppt-server' for application logs"
