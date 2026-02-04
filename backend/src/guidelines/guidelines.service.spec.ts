import { Test, TestingModule } from '@nestjs/testing';
import { GuidelinesService } from './guidelines.service';

describe('GuidelinesService', () => {
  let service: GuidelinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuidelinesService],
    }).compile();

    service = module.get<GuidelinesService>(GuidelinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
