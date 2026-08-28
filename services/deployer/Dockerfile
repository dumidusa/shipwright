FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/index.js"]