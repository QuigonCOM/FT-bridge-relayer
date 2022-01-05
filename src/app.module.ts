import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthMiddleware } from './middleware/auth.middleware';
import { BridgeService } from './bridge.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost/nest'),
    UserModule,
    HttpModule,
  ],
  controllers: [AppController],
  providers: [BridgeService],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'payment', method: RequestMethod.POST },
        { path: 'payment/:id', method: RequestMethod.GET },
      );
  }
}
