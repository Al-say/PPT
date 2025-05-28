#!/bin/bash

# Exit on any error
set -e

echo "Preparing project for upload..."

# Create a clean archive of the project
echo "Creating archive..."
tar --exclude='node_modules' --exclude='.git' -czf project.tar.gz .

# Upload to server
echo "Uploading to server..."
scp project.tar.gz root@14.103.177.132:/root/

# Upload deploy script
echo "Uploading deployment script..."
scp deploy.sh root@14.103.177.132:/root/

# Execute remote deployment
echo "Starting remote deployment..."
ssh root@14.103.177.132 "cd /root && tar xzf project.tar.gz && ./deploy.sh"

# Clean up local archive
rm project.tar.gz

echo "Deployment complete!"
echo "Your application should now be running at http://www.alsay.net"
