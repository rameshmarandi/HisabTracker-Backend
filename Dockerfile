# 1. Use official Node.js image
FROM node:18-alpine

# 2. Set working directory inside container
WORKDIR /usr/src/app

# 3. Copy package.json & package-lock.json first (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install --production

# 5. Copy rest of the project files
COPY . .

# 6. Expose app port
EXPOSE 8085

# 7. Command to run app
CMD ["npm", "start"]
