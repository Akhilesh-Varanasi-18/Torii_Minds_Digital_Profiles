# Playwright's official image already contains Chromium + all the system
# libraries it needs, matched to the Playwright version in package.json.
# This is what makes the server-side PDF/HTML export work in the cloud.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies from the lockfile first (better build caching).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the Next.js app.
COPY . .
RUN npm run build

# Render injects $PORT at runtime; default to 3000 for local `docker run`.
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx next start -p ${PORT:-3000} -H 0.0.0.0"]
