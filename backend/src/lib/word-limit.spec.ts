import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {CreateFaqDto} from '../faq/dto/create-faq.dto';
import {CreateGuidelineDto} from '../guidelines/dto/create-guideline.dto';
import {countWords} from './word-limit';

describe('FAQ and Guidelines 3000 WORD limit', () => {
  it('counts Bangla and English words, not characters',()=>{
    expect(countWords('এক  দুই\nthree\tচার')).toBe(4);
    expect(countWords('   ')).toBe(0);
    expect(countWords('longword'.repeat(400))).toBe(1);
  });
  it.each([CreateFaqDto, CreateGuidelineDto])('accepts 3000 words, rejects 3001', (Dto)=>{
    const base={title:'বায়োডাটা FAQ',description:Array(3000).fill('একটি').join(' ')};
    const valid=plainToInstance(Dto,base);
    expect(validateSync(valid).filter(e=>e.property==='description')).toHaveLength(0);
    const invalid=plainToInstance(Dto,{...base,description:base.description+' extra'});
    const errors=validateSync(invalid);
    expect(errors.some(e=>e.property==='description' && e.constraints?.maxWords)).toBe(true);
  });
});
