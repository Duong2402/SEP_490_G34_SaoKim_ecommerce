# ============ STAGE 1: Build React app ============
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./   

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build production (Vite output vào dist)
RUN npm run build

# ============ STAGE 2: Serve với 'serve' ============
FROM node:20-alpine

WORKDIR /app

# Cài chỉ package 'serve' toàn cục (nhẹ, ~10MB)
RUN npm install -g serve

# Copy folder dist từ stage build
COPY --from=builder /app/dist ./dist

# Expose port (tùy chọn, khuyến nghị 3000 hoặc 80)
EXPOSE 3000

# Chạy serve trên port 3000, hỗ trợ SPA (fallback về index.html)
CMD ["serve", "-s", "dist", "-l", "3000"]