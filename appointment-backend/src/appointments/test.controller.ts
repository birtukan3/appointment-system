import { Controller, Post, Body } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Post()
  test(@Body() body: any) {
    return { received: body };
  }
}