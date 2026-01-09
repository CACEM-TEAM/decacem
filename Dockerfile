# Use the official Node.js image as the base image
FROM imbios/bun-node:latest as build

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and bun.lockb files to the working directory
COPY package.json bun.lockb ./

# Install the app dependencies
RUN bun install

# Copy the rest of the app files to the working directory
COPY . .

# Build the Vue.js/Vite app
RUN bun run build

# Production stage with nginx
FROM nginx:stable-alpine as production-stage

# Copy the built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (nginx default port)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]