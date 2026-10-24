# Playwright base image with Chromium + all Linux dependencies.
# The tag matches the playwright version in package-lock.json, so no browser download is needed.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Install production dependencies exactly as locked
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files (.dockerignore keeps .env, session cookies and screenshots out)
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as the image's unprivileged user instead of root
USER pwuser

CMD ["node", "server.js"]
