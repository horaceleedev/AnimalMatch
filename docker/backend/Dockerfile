# PocketBase server image, pinned to a specific release.
# The JS SDK in package.json is ^0.23.0, so we track the latest 0.23.x server.
FROM alpine:3.20

ARG PB_VERSION=0.23.12
# TARGETARCH is provided automatically by buildkit ("amd64" or "arm64"),
# which happens to match PocketBase's release asset naming.
ARG TARGETARCH=amd64

RUN apk add --no-cache ca-certificates unzip wget

# Download and install PocketBase.
# TODO: Could switch to user-maintained pocketbase image.
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /usr/local/bin/ \
    && rm /tmp/pb.zip \
    && chmod +x /usr/local/bin/pocketbase

WORKDIR /pb

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
