# Use official Playwright image with browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
