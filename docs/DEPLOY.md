# Deployment Guide

## Prerequisites
- Node.js (v14 or higher)
- npm
- PM2 (for process management)

## Server Setup

1. Install Node.js and npm if not already installed:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install PM2 globally:
```bash
sudo npm install -g pm2
```

3. Clone the repository to your server:
```bash
git clone [your-repository-url]
cd ppt-server
```

4. Install dependencies:
```bash
npm install
```

5. Configure environment:
The `.env` file is already configured with:
```
PORT=80
HOST=www.alsay.net
```

## Deployment Steps

1. Start the application with PM2:
```bash
pm2 start server.js --name "ppt-server"
```

2. Configure PM2 to auto-start on system reboot:
```bash
pm2 startup
pm2 save
```

## Managing the Application

- View logs:
```bash
pm2 logs ppt-server
```

- Restart the application:
```bash
pm2 restart ppt-server
```

- Stop the application:
```bash
pm2 stop ppt-server
```

## Domain Configuration

1. Point your domain (www.alsay.net) to your server's IP address using A records in your DNS settings.

2. If you haven't already, configure your firewall to allow traffic on port 80:
```bash
sudo ufw allow 80
```

## SSL Configuration (Recommended)

To secure your site with HTTPS:

1. Install Certbot:
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Obtain SSL certificate:
```bash
sudo certbot --standalone -d www.alsay.net
```

3. Update your Node.js application to use HTTPS (optional enhancement).

## Troubleshooting

- If port 80 is already in use, you may need to stop other web servers (like Apache or Nginx):
```bash
sudo systemctl stop apache2    # for Apache
sudo systemctl stop nginx      # for Nginx
```

- If you see "Permission denied" for port 80, you can either:
  - Run with sudo (not recommended)
  - Use port 3000 and configure Nginx as a reverse proxy (recommended)
  - Or use authbind to allow Node.js to use port 80
