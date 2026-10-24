FROM node:24-alpine
ENV NODE_ENV=production PORT=8787 BUDGET_DIR=/data
WORKDIR /app
COPY --chown=node:node proxy/ ./proxy/
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "proxy/server.js"]
