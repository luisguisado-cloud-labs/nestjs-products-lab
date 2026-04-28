import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health') // GET /api/health  (el prefijo /api lo agrega main.ts)
  getHealth() {
    return this.appService.getHealth();
  }
}
