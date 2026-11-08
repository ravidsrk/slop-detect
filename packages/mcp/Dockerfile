FROM node:22-slim

LABEL org.opencontainers.image.source="https://github.com/ravidsrk/slop-detect"
LABEL org.opencontainers.image.description="Slop Detector MCP server — scan landing pages across design, copy, DESIGN.md compliance, craft floor, and AEO eligibility."
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN npm install -g --no-audit --no-fund slop-detect-mcp@0.8.0

ENTRYPOINT ["slop-detect-mcp"]
