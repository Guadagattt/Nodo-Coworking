# API (Express + TypeScript) para desarrollo
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3000
# --watch reinicia la API cuando cambia un archivo de src/
CMD ["node", "--watch", "-r", "ts-node/register", "src/index.ts"]
