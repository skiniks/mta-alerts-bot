FROM node:26-slim

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
