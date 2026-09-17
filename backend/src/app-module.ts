import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth-module';
import { PrismaModule } from './prisma-module';
import { StudentsModule } from './students/students-module';

@Module({
  imports: [PrismaModule, AuthModule, StudentsModule],
})
export class AppModule {}
