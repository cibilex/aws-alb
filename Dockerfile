FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm i --legacy-peer-deps

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY ./src ./src
EXPOSE 3000
CMD ["node", "src/app.js"]