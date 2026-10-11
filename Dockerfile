FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV HTML2PDF_NO_SANDBOX=true

RUN apt-get update && \
    apt-get install -y wget gnupg procps tini && \
    apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    libgtk2.0-0 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 && \
    apt-get install -y chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 3000

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY bin/ ./bin/
COPY test/ ./test/

RUN npm run build && chmod +x ./dist/bin/html2pdf.js && npm link

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "run", "start"]
