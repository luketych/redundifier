FROM node:20-alpine

WORKDIR /app

# Install dependencies only when needed
COPY package*.json ./
COPY .nvmrc ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
