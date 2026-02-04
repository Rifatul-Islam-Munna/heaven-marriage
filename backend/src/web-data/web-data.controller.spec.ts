import { Test, TestingModule } from '@nestjs/testing';
import { WebDataController } from './web-data.controller';
import { WebDataService } from './web-data.service';

describe('WebDataController', () => {
  let controller: WebDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebDataController],
      providers: [WebDataService],
    }).compile();

    controller = module.get<WebDataController>(WebDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
