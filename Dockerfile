FROM node:8-slim

WORKDIR /home/node/ws-log
COPY package*.json ./
RUN npm install

COPY . .

USER node
EXPOSE 4277
CMD ["bin/ws-log","/var/log/logfile"]

