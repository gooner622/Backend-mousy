FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
# `npm ci` requires a package-lock.json. Use `npm install --omit=dev` so Docker builds
# succeed even when a lockfile isn't present.
RUN npm install --omit=dev

# Bundle app source
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
