# ---- build stage ----
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # Установим зависимости (dev + prod) по lock-файлу
    COPY package*.json ./
    RUN npm ci
    
    # Сборка TypeScript → dist/
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    
    # Оставим только prod-зависимости
    RUN npm prune --omit=dev
    
    # ---- runtime stage ----
    FROM node:20-alpine
    WORKDIR /app
    
    # prod-зависимости и собранный код
    COPY --from=build /app/node_modules ./node_modules
    COPY --from=build /app/dist ./dist
    COPY package*.json ./
    
    # каталог для хранения файлов
    RUN mkdir -p /app/data
    
    EXPOSE 8080
    CMD ["node", "dist/index.js"]    