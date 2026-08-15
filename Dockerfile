# syntax=docker/dockerfile:1

FROM node:20-alpine

ARG APP_NAME

ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=development

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY . .

# Generate Prisma Client nếu service có Prisma
RUN if [ -f "apps/${APP_NAME}/prisma/schema.prisma" ]; then \
      npx prisma generate --schema=apps/${APP_NAME}/prisma/schema.prisma; \
    fi

# NestJS cần ghi dist
RUN mkdir -p /usr/src/app/dist \
    && chmod -R 777 /usr/src/app

CMD ["sh", "-c", "node_modules/.bin/nest start ${APP_NAME}"]