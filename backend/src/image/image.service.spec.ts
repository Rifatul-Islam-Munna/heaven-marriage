import { Test, TestingModule } from '@nestjs/testing';
import { ImageService } from './image.service';
import { MinioService } from '../lib/minio.service';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageService, { provide: MinioService, useValue: { uploadFile: jest.fn() } }],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
