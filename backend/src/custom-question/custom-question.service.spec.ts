import { Test, TestingModule } from '@nestjs/testing';
import { CustomQuestionService } from './custom-question.service';

describe('CustomQuestionService', () => {
  let service: CustomQuestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomQuestionService],
    }).compile();

    service = module.get<CustomQuestionService>(CustomQuestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
