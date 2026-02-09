import { Test, TestingModule } from '@nestjs/testing';
import { CustomQuestionController } from './custom-question.controller';
import { CustomQuestionService } from './custom-question.service';

describe('CustomQuestionController', () => {
  let controller: CustomQuestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomQuestionController],
      providers: [CustomQuestionService],
    }).compile();

    controller = module.get<CustomQuestionController>(CustomQuestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
