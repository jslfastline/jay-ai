# Jay AI backend — production image.
# Keys are provided at runtime via environment variables, never baked in.
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
# Most hosts (Render/Railway/Fly/Koyeb) inject PORT at runtime.
EXPOSE 8787

CMD ["npm", "start"]
