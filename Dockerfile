# Base image with all Linux GUI / Chromium dependencies pre-installed
FROM mcr.microsoft.com/playwright:jammy

WORKDIR /app

# Install dependencies and Chromium browser
COPY package*.json ./
RUN npm install
RUN npx playwright install chromium

# Copy application files
COPY . .

# Expose server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
