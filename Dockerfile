# Build Stage
FROM maven:3.8-openjdk-17-slim AS build
COPY . .
RUN mvn clean package -DskipTests

# Run Stage
FROM openjdk:17-jdk-slim
COPY --from=build /target/*.jar app.jar
EXPOSE 9090
ENTRYPOINT ["java", "-Xmx512m", "-Dserver.port=${PORT:9090}", "-jar", "/app.jar"]
