# build 
FROM node:lts-alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json ./
COPY package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# production
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "./build", "-l", "8080"]
