# Core API image (target `final`) and the one-shot migration image (target `migrate`).
# Build context: services/core. Used by the `core` and `core-migrate` services in docker-compose.yml.
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1
WORKDIR /src

# Restore first: this layer is reused until the project file changes.
COPY global.json dotnet-tools.json ./
COPY src/QuestClass.Core.csproj src/
RUN dotnet restore src/QuestClass.Core.csproj

COPY src/ src/
RUN dotnet publish src/QuestClass.Core.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    -p:UseAppHost=false


# Applies the EF Core migrations and exits. The app itself never migrates on startup.
FROM build AS migrate
# dotnet-ef in the version pinned in dotnet-tools.json (the same one CI and developers use).
RUN dotnet tool restore
ENTRYPOINT ["dotnet", "ef", "database", "update", "--project", "src", "--configuration", "Release", "--no-build"]


FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
COPY --from=build /app/publish .

# Non-root user predefined in the .NET images; APP_UID is its numeric id (1654).
# hadolint ignore=DL3066
USER $APP_UID
EXPOSE 8080

# /health/ready also checks the database. Alpine's busybox has wget, so no curl is installed.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health/ready"]

ENTRYPOINT ["dotnet", "QuestClass.Core.dll"]
