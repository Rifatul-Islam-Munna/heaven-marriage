import { UserSchema } from './user.entity';

describe('UserSchema', () => {
  it('keeps phoneNumber unique only when it is a string', () => {
    const phoneNumberIndex = UserSchema.indexes().find(
      ([fields]) => fields.phoneNumber === 1,
    );

    expect(phoneNumberIndex).toBeDefined();
    expect(phoneNumberIndex?.[1]).toMatchObject({
      name: 'phoneNumber_1',
      unique: true,
      partialFilterExpression: {
        phoneNumber: { $type: 'string' },
      },
    });
  });
});
