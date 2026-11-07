import { reciprocalMatch, compareReciprocal } from './admin-matching';

const male = { _id:'male', gender:'male', age:27, maritalStatus:'unmarried',
  expectedLifePartner:{age:'20-26',maritalStatus:'unmarried'} };
const female = { _id:'female', gender:'female', age:23, maritalStatus:'unmarried',
  expectedLifePartner:{age:'25-30',maritalStatus:'unmarried'} };
describe('reciprocal admin match',()=>{
  it('combines both directions and exposes each criterion',()=>{
    const r=reciprocalMatch(male,female);
    expect(r.forward.score).toBe(100);
    expect(r.reverse.score).toBe(100);
    expect(r.score).toBe(100);
    expect(r.forward.criteria.some(x=>x.status==='matched')).toBe(true);
  });
  it('does not count one-sided preferences as a reciprocal match',()=>{
    expect(reciprocalMatch(male,{...female,expectedLifePartner:{}}).score).toBeNull();
  });
  it('counts unknown data as missing evidence, not a positive match',()=>{
    const r=reciprocalMatch(male,{...female,age:undefined});
    expect(r.forward.unknownCount).toBeGreaterThan(0);
    expect(r.coverage).toBeLessThan(100);
  });
  it('sorts strong match ahead of weak match',()=>{
    const good=reciprocalMatch(male,female);
    const bad=reciprocalMatch(male,{...female,_id:'other',age:35});
    expect(compareReciprocal(good,bad)).toBeLessThan(0);
  });
});
