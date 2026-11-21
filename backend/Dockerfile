FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /build
RUN apk add --no-cache maven
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN apk add --no-cache su-exec && \
    addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p /app/uploads && chown -R spring:spring /app/uploads
COPY --from=builder --chown=spring:spring /build/target/app.jar /app/app.jar
COPY uploads/products /app/seed-uploads/products
RUN rm -f /app/seed-uploads/products/*.ps1 /app/seed-uploads/products/*.cmd
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
EXPOSE 8081
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
