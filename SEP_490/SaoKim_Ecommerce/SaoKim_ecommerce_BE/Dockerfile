FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["SaoKim_ecommerce_BE/SaoKim_ecommerce_BE.csproj", "SaoKim_ecommerce_BE/"]
RUN dotnet restore "SaoKim_ecommerce_BE/SaoKim_ecommerce_BE.csproj"
COPY . .
WORKDIR "/src/SaoKim_ecommerce_BE"
RUN dotnet build "./SaoKim_ecommerce_BE.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./SaoKim_ecommerce_BE.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaoKim_ecommerce_BE.dll"]
