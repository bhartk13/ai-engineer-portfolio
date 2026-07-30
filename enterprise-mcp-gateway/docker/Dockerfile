# syntax=docker/dockerfile:1
# Build context must be the repository root, e.g.:
#   docker build -f docker/Dockerfile -t enterprise-mcp-gateway:latest .

## ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies separately from source for faster rebuilds
COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -Dmaven.test.skip=true \
    && mv target/enterprise-mcp-gateway-*.jar target/app.jar

## ---- Runtime stage ----
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN groupadd --system mcp && useradd --system --gid mcp --home /app mcp
WORKDIR /app

COPY --from=build /workspace/target/app.jar ./app.jar
RUN chown -R mcp:mcp /app
USER mcp

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
