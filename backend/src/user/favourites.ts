import { PipelineStage, Types } from 'mongoose';
import { UserType } from './entities/user.entity';
import { visibleFilter } from './profile-rules';
import { PaginationDto } from './dto/create-shortlist.dto';

export type FavouriteDirection = 'given' | 'received';

// A single, contact-free projection for BOTH favourite directions.
export const FAVOURITE_PUBLIC_PROJECTION = {
  _id: 1, userId: 1, age: 1, gender: 1, maritalStatus: 1,
  isSubscriber: 1, verificationStatus: 1, createdAt: 1,
  isPublished: 1, isPublishFromAdmin: 1,
  'address.district': 1, 'address.upazila': 1,
  'educationInfo.educationMethod': 1,
  'educationInfo.highestEducation': 1,
  'personalInformation.height': 1,
  'personalInformation.skinTone': 1,
  'occupational.profession': 1,
  'familyInfo.familyFinancial': 1,
} as const;

export function favouritePagination(input: PaginationDto) {
  const rawPage = Number(input.page ?? 1);
  const rawLimit = Number(input.limit ?? 12);
  const page = Number.isSafeInteger(rawPage) ? Math.min(10000, Math.max(1, rawPage)) : 1;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 12;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Existing Shortlist structure: one userId => array of shortlistedUserId.
 * 'given' traverses the requesting user's array; 'received' traverses
 * other users' arrays containing the requesting user's _id.
 * Grouping avoids accidental duplicates from legacy shortlist documents.
 */
export function favouritesPipeline(
  direction: FavouriteDirection,
  actor: string,
  page: number,
  limit: number,
): PipelineStage[] {
  const actorId = new Types.ObjectId(actor);
  const given = direction === 'given';
  return [
    { $match: given ? { userId: actorId } : { shortlistedUserId: actorId } },
    ...(given
      ? [
          { $unwind: { path: '$shortlistedUserId', includeArrayIndex: 'position' } },
          { $group: { _id: '$shortlistedUserId', position: { $max: '$position' } } },
        ]
      : [{ $group: { _id: '$userId' } }]),
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'profile' } },
    { $unwind: '$profile' },
    { $replaceRoot: { newRoot: '$profile' } },
    { $match: {
      ...visibleFilter,
      role: UserType.USER,
      _id: { $ne: actorId },
    } },
    { $project: FAVOURITE_PUBLIC_PROJECTION },
    { $sort: { createdAt: -1, _id: -1 } },
    { $facet: {
      metadata: [{ $count: 'totalItems' }],
      data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
    } },
  ];
}
