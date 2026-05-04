FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY src/ ./src/
# Mount constitution at runtime via volume
EXPOSE 3002
CMD ["node", "src/index.js"]
