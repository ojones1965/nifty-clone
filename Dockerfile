# Static build of the app served by nginx. Build dist/ first (npm run build);
# the image only packages the result, so no Node or registry access is needed
# on the server.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
