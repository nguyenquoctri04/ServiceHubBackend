# syntax=docker/dockerfile:1

FROM node:20-alpine

ARG APP_NAME

ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=development

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./

# npm ci bình thường — để các native addon (bcrypt, prisma) tự download
# prebuilt binary đúng platform (Linux/Alpine x64).
# Sau đó xóa @swc/core vì nó chỉ cần cho dev local (Windows), binary
# Windows sẽ không chạy được trên Linux và gây lỗi SIGBUS.
RUN npm ci \
    && rm -rf node_modules/@swc/core node_modules/@swc/core-win32-x64-msvc \
              node_modules/@swc/cli

COPY . .

# Generate Prisma Client nếu service có Prisma
RUN if [ -f "apps/${APP_NAME}/prisma/schema.prisma" ]; then \
      npx prisma generate --schema=apps/${APP_NAME}/prisma/schema.prisma; \
    fi

# NestJS cần ghi dist
RUN mkdir -p /usr/src/app/dist \
    && chmod -R 777 /usr/src/app

CMD ["sh", "-c", "node_modules/.bin/nest start ${APP_NAME}"]