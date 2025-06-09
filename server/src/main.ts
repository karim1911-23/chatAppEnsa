import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as cors from "cors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Autoriser CORS pour les requêtes WebSocket depuis ton frontend
  app.enableCors({
    origin: "http://localhost:3000", // Allow only this origin
    methods: "GET,POST,PUT,DELETE", // Allowed HTTP methods
    credentials: true, // Allow cookies
  });
  // Activer WebSockets
  app.useWebSocketAdapter(new IoAdapter(app));

  // Écouter sur le port défini par Koyeb
  const PORT = process.env.PORT || 8000;
  await app.listen(PORT);
  console.log(`Application is running on port ${PORT}`);
}
bootstrap();
