FROM alpine:3.23
RUN apk add --no-cache openssh-client && adduser -D -u 10001 tunnel
USER tunnel
ENTRYPOINT ["ssh", "-NT", "-i", "/keys/id_ed25519", "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=/keys/known_hosts", "-o", "ExitOnForwardFailure=yes", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", "-o", "ConnectTimeout=10", "-L", "0.0.0.0:8642:127.0.0.1:8642", "ani@20.112.123.120"]
