import { Test, TestingModule } from '@nestjs/testing';
import { WebDataService } from './web-data.service';

describe('WebDataService', () => {
  let service: WebDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebDataService],
    }).compile();

    service = module.get<WebDataService>(WebDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
