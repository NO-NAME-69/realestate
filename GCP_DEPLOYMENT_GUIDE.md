# Deploying the Real Estate Platform to GCP via GitHub

This comprehensive guide covers the end-to-end process of deploying your React (Vite) frontend and Node.js (Fastify) backend to an Ubuntu VM instance on Google Cloud Platform, using GitHub to seamlessly transfer your code. It incorporates best practices discussed in your architecture, such as using PM2 for process management and Docker for your PostgreSQL and Redis services.

---

## 1. Prerequisites
- A Google Cloud Platform (GCP) account with active billing.
- Your project fully committed and pushed to a GitHub repository.
- A registered domain name (optional but highly recommended for setting up HTTPS).

---

## 2. Set Up the GCP VM Instance
1. Navigate to the **Google Cloud Console**.
2. Go to **Compute Engine** > **VM instances**.
3. Click **Create Instance**.
4. Configure the instance details:
   - **Name**: `realestate-platform-prod` (or similar).
   - **Region/Zone**: Choose a region closest to your target audience.
   - **Machine Type**: At least `e2-medium` (2 vCPU, 4GB Memory) to comfortably handle Node.js, the React build process, Postgres, and Redis.
   - **Boot disk**: Change the OS to **Ubuntu** and select the latest LTS version (e.g., Ubuntu 24.04 LTS or 22.04 LTS). Make sure to increase the disk size to at least `20-30 GB` or more depending on your expected property image/data usage.
   - **Firewall**: Check **Allow HTTP traffic** and **Allow HTTPS traffic**.
5. Click **Create** and wait a few moments for the VM to start.
6. Once running, copy the **External IP** address assigned to your VM.

---

## 3. Connect to the Ubuntu VM
1. In the GCP Console, on the VM instances list, click the **SSH** button next to your VM to open a web-based terminal. 
2. Use this terminal for all the upcoming Ubuntu commands.

---

## 4. Install Required Dependencies on Ubuntu
Run the following commands sequentially to update your package lists and install Node.js, Git, Nginx, Docker, and PM2.

```bash
# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify installation

# Install Git and Nginx (Reverse Proxy)
sudo apt install -y git nginx

# Install PM2 globally (Process Manager for the Node Backend)
sudo npm install -g pm2

# Install Docker & Docker Compose (for PostgreSQL and Redis)
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group so you don't have to use 'sudo' for docker commands
sudo usermod -aG docker $USER
newgrp docker # Apply permissions immediately
```

---

## 5. Generate an SSH Key & Clone Your GitHub Repository
Instead of using passwords, we use deployment keys to securely connect your server to GitHub.

1. On your VM, generate an SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   *(Press 'Enter' to accept default path and skip the passphrase)*

2. View and copy the generated public SSH key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. Go to your project repository on **GitHub** → **Settings** → **Deploy Keys** (on the left sidebar) → **Add deploy key**.
   - Paste the key, give it a title like "GCP Production Server", and save.

4. Clone the repository onto the VM:
   ```bash
   cd ~
   # Replace with your actual GitHub SSH clone URL
   git clone git@github.com:yourusername/realestate-website.git 
   cd realestate-website
   ```

---

## 6. Spin up PostgreSQL & Redis via Docker
Since you use Docker Compose for stateful services:

1. Look for your existing `docker-compose.yml` file, or create one in the root of your project:
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_USER: yourdbuser
         POSTGRES_PASSWORD: yourdbpassword
         POSTGRES_DB: realestate_db
       ports:
         - "5432:5432"
       volumes:
         - pgdata:/var/lib/postgresql/data
       restart: unless-stopped

     redis:
       image: redis:7
       ports:
         - "6379:6379"
       restart: unless-stopped

   volumes:
     pgdata:
   ```
2. Start the database and cache in the background:
   ```bash
   docker compose up -d
   ```

---

## 7. Configure and Start the Fastify Backend
1. Navigate to the backend directory:
   ```bash
   cd ~/realestate-website/backend
   ```
2. Set up the production environment variables:
   ```bash
   nano .env
   ```
   *Populate this file with your exact production variables (DATABASE_URL aligned with your docker setup, REDIS_URL, JWT_SECRET, SendGrid/Razorpay keys, Server Port, etc).*

3. Install backend dependencies and compile the TypeScript code:
   ```bash
   npm install
   npm run build
   ```
4. Run Prisma database migrations to apply your schema to the running Postgres DB:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
5. Start the backend app via PM2:
   ```bash
   # dist/server.js assumes this is your output path from tsconfig.json
   pm2 start dist/server.js --name "realestate-api"
   
   # Set PM2 to automatically restart exactly as it is if the server reboots
   pm2 save
   pm2 startup
   ```
   *(Run the script that outputs after typing `pm2 startup` to finalize it)*

---

## 8. Build the Vite React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ~/realestate-website/frontend
   ```
2. Set up frontend production variables (if any API URLs need to be mapped):
   ```bash
   nano .env
   ```
   *Example: `VITE_API_URL=http://<VM_EXTERNAL_IP>/api` or your actual domain.*
3. Install dependencies and generate the static production build:
   ```bash
   npm install
   npm run build
   ```
   *This outputs a compiled, highly optimized frontend into the `dist` folder.*

---

## 9. Configure Nginx as a Reverse Proxy
Nginx will serve your frontend static files directly and automatically proxy API requests securely to your running Fastify backend.

1. Open a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/realestate
   ```
2. Paste the following template, strictly editing paths and domain names to match your setup:
   ```nginx
   server {
       listen 80;
       
       # Replace with your domain, or use the VM External IP if no domain is ready
       server_name your_domain.com www.your_domain.com <VM_EXTERNAL_IP>; 

       # 1. Serve the compiled Frontend locally
       location / {
           # Ensure this path perfectly matches your Ubuntu home user folder path
           root /home/YOUR_UBUNTU_USERNAME/realestate-website/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # 2. Proxy matched API requests to the Fastify Backend
       location /api/ {
           # Adjust port 8080 to whatever your Fastify server binds to in .env
           proxy_pass http://127.0.0.1:8080/; 
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
3. Enable the new configuration and test Nginx for syntax validation:
   ```bash
   # Create symlink to enabled directory
   sudo ln -s /etc/nginx/sites-available/realestate /etc/nginx/sites-enabled/
   
   # Detach the default Nginx placeholder page
   sudo rm /etc/nginx/sites-enabled/default
   
   # Test for syntax errors
   sudo nginx -t
   
   # Restart Nginx to apply changes
   sudo systemctl restart nginx
   ```

---

## 10. Verification and Adding SSL (HTTPS)
1. In your browser, navigate to your VM's **External IP** or configured domain. 
2. The React interface should load perfectly, and API calls to `/api/` should hit your PM2 instance.
3. **If you have a domain name configured**, securely execute Certbot to provision free SSL certificates from Let's Encrypt:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain.com -d www.your_domain.com
   ```
   *Certbot will automatically edit your Nginx routes to strictly use port 443 with TLS encryption.*

---

## CI/CD: How to Push Future Updates Confidently
Whenever you finish working locally and push your code to standard GitHub branches, execute these steps on your VM to update the live environment:

```bash
cd ~/realestate-website

# Pull the latest commits securely
git pull origin main

# Update Backend (if required)
cd backend
npm install
npm run build
npx prisma migrate deploy # Execute db alterations safely
pm2 restart realestate-api

# Update Frontend (if required)
cd ../frontend
npm install
npm run build
```
*(Optionally, you can script the above sequence into a simple bash file (`deploy.sh`) to execute them effortlessly in one command.)*
