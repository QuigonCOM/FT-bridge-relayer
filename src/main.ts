import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const appOptions = {cors: true};
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule, appOptions
  );
  app.enableCors();
  app.setGlobalPrefix('api');

  // const document = SwaggerModule.createDocument(app, options);
  // SwaggerModule.setup('/docs', app, document);
  
  await app.listen(3000);
}
bootstrap();
