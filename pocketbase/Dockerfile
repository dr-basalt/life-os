FROM alpine:3.19

ARG PB_VERSION=0.22.20
ARG LS_VERSION=0.3.13
# Detect architecture for binary downloads
ARG TARGETARCH

RUN apk add --no-cache ca-certificates wget unzip tzdata

# PocketBase — arch-aware (amd64 or arm64)
RUN case "$(uname -m)" in \
      x86_64)  PB_ARCH=amd64 ; LS_ARCH=amd64 ;; \
      aarch64) PB_ARCH=arm64 ; LS_ARCH=arm64 ;; \
      *) echo "Unsupported arch: $(uname -m)" && exit 1 ;; \
    esac \
  && wget -q \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
    -O /tmp/pb.zip \
  && unzip /tmp/pb.zip -d /pb \
  && rm /tmp/pb.zip \
  && chmod +x /pb/pocketbase

# Litestream — arch-aware
RUN case "$(uname -m)" in \
      x86_64)  LS_ARCH=amd64 ;; \
      aarch64) LS_ARCH=arm64 ;; \
      *) echo "Unsupported arch: $(uname -m)" && exit 1 ;; \
    esac \
  && wget -q \
    "https://github.com/benbjohnson/litestream/releases/download/v${LS_VERSION}/litestream-v${LS_VERSION}-linux-${LS_ARCH}.tar.gz" \
    -O /tmp/ls.tar.gz \
  && tar -xzf /tmp/ls.tar.gz -C /usr/local/bin litestream \
  && rm /tmp/ls.tar.gz \
  && chmod +x /usr/local/bin/litestream

COPY litestream.yml /etc/litestream.yml
COPY entrypoint.sh /entrypoint.sh
# pb_migrations skipped — collections created via admin UI on first run
# TODO: rewrite migrations for PocketBase v0.22 DB builder API

RUN chmod +x /entrypoint.sh

WORKDIR /pb
EXPOSE 8090
VOLUME /pb/pb_data

ENTRYPOINT ["/entrypoint.sh"]
