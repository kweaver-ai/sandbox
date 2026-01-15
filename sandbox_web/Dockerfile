# Build stage
# Mirror configuration for special network environments
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn
ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS builder

# Re-declare ARG after FROM (ARGs don't persist across FROM)
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn

WORKDIR /app

# Configure APK mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
  sed -i 's/dl-cdn.alpinelinux.org/'$APK_MIRROR'/g' /etc/apk/repositories; \
  fi

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
# Re-declare ARG for this stage (ARGs don't persist across stages)
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn
ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS production

# Re-declare ARG after FROM (ARGs don't persist across FROM)
ARG USE_MIRROR=false
ARG APK_MIRROR=mirrors.ustc.edu.cn

WORKDIR /app

# Configure APK mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
  sed -i 's/dl-cdn.alpinelinux.org/'$APK_MIRROR'/g' /etc/apk/repositories; \
  fi

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npx", "rsbuild", "preview"]
