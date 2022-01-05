import { Module } from '@nestjs/common';
import { UserService } from 'src/services/user.service';

@Module({
  providers: [UserService]
})
export class UserModule {}
