# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Run Stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 9090
# Using higher memory limit and clear port binding
ENTRYPOINT ["java", "-Xmx512m", "-Dserver.port=${PORT:9090}", "-jar", "app.jar"]
