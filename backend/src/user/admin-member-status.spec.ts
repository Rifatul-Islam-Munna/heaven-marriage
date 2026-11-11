import { adminFilter, adminSort, visibleFilter } from './profile-rules';
import { biodataStage, hasStartedBiodata, hasSubmittedBiodata } from './biodata-lifecycle';

describe('member admin status and counting filter',()=>{
  it('published filter uses both flags and verification status',()=>{
    expect(adminFilter({isPublished:'true'})).toMatchObject(visibleFilter);
    expect(adminFilter({isPublished:'false'}).$nor).toEqual([visibleFilter]);
  });
  it('distinguishes signup, draft, submitted and published',()=>{
    expect(hasStartedBiodata({})).toBe(false);
    expect(hasStartedBiodata({draftSavedAt:new Date()})).toBe(true);
    expect(hasSubmittedBiodata({biodataStatus:'draft'})).toBe(false);
    expect(hasSubmittedBiodata({biodataStatus:'submitted'})).toBe(true);
    expect(biodataStage({biodataStatus:'submitted'},100)).toBe('under_review');
    expect(biodataStage({...visibleFilter,biodataStatus:'approved'},100)).toBe('published');
    expect(biodataStage({...visibleFilter,verificationStatus:'rejected'},100)).not.toBe('published');
  });
  it('keeps signup-only accounts out of the saved unpublished review queue',()=>{
    const filter = adminFilter({reviewQueue:'true'});
    expect(filter.$nor).toEqual([visibleFilter]);
    expect(filter.$and[0].$or).toEqual([
      {draftSavedAt:{$type:'date'}},
      {submittedAt:{$type:'date'}},
      {biodataStatus:{$in:['submitted','approved']}},
    ]);
    expect(adminFilter({reviewQueue:'false'})).toEqual({});
    expect(adminSort(undefined,true)).toEqual({
      draftSavedAt:-1,submittedAt:-1,_id:-1,
    });
    expect(adminSort('newest',true)).toEqual({createdAt:-1,_id:-1});
  });
  it('supports DB-level pagination filters for journey stages',()=>{
    expect(adminFilter({memberJourney:'signed_up'}).$nor.length).toBeGreaterThan(1);
    expect(adminFilter({memberJourney:'in_progress'}).$and[0].$or.length).toBeGreaterThan(1);
    expect(adminFilter({memberJourney:'submitted'}).biodataStatus).toEqual({$in:['submitted','approved']});
    expect(adminFilter({memberJourney:'published'}).isPublishFromAdmin).toBe(true);
  });
});
