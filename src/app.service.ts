import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
    // logica

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // info
    };
  }
}
