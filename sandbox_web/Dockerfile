# Build stage
# Mirror configuration for special network environments
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn
ARG NPM_MIRROR=registry.npmmirror.com  # Taobao npm mirror

FROM node:20-alpine AS builder

# Re-declare ARG after FROM (ARGs don't persist across FROM)
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn
ARG NPM_MIRROR=registry.npmmirror.com  # Taobao npm mirror

WORKDIR /app

# Configure APK mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
      sed -i 's/dl-cdn.alpinelinux.org/'$APK_MIRROR'/g' /etc/apk/repositories; \
    fi

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ "$USE_MIRROR" = "true" ]; then \
      npm config set registry https://$NPM_MIRROR/; \
    fi && \
    npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
# Re-declare ARG for this stage (ARGs don't persist across stages)
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn
ARG NPM_MIRROR=registry.npmmirror.com  # Taobao npm mirror

FROM node:20-alpine AS production

WORKDIR /app

# Configure APK mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
      sed -i 's/dl-cdn.alpinelinux.org/'$APK_MIRROR'/g' /etc/apk/repositories; \
    fi

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only and rsbuild
RUN if [ "$USE_MIRROR" = "true" ]; then \
      npm config set registry https://$NPM_MIRROR/; \
    fi && \
    npm ci --production && npm install -g @rsbuild/core

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["rsbuild", "preview"]
