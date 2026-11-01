# Build the upstream openNAMU engine.
FROM golang:1.25-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git clone --depth 1 --branch beta https://github.com/openNAMU/openNAMU.git .
RUN go build -trimpath -ldflags="-s -w" -o /out/opennamu .

# Runtime image. Keep /app/data on persistent storage.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home --home-dir /app appuser
WORKDIR /app
COPY --from=build /out/opennamu /app/opennamu
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["/app/opennamu"]
CMD ["3000"]
