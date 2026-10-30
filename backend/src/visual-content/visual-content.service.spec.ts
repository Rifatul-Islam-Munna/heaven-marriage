import { BadRequestException } from '@nestjs/common';
import { normalizeVisualScope, validateVisualKey } from './visual-content.service';
describe('Visual page content validation', () => {
  it.each(['/', '/about', '/dashboard/settings', '/profile/settings',
    '/biodata/507f1f77bcf86cd799439011', '/policies/privacy', '/login',
    '/payment/successfull', '/dashboard/edit-profile/507f1f77bcf86cd799439011'])(
      'accepts an actual page route: %s',
      path => expect(normalizeVisualScope(path)).toBe(path),
    );
  it('supports global shared content', () => {
    expect(normalizeVisualScope('@global')).toBe('@global');
    expect(normalizeVisualScope('/about/')).toBe('/about');
  });
  it.each(['/api/visual-content', '/_next/static', '/about?x=1',
    '/about/../dashboard', 'https://bad.site', '/a//b', '../x'])(
    'rejects invalid page path %s',
    path => expect(() => normalizeVisualScope(path)).toThrow(BadRequestException),
  );
  it('restricts content keys', () => {
    expect(validateVisualKey('t_aabbccddeeff0011')).toBe('t_aabbccddeeff0011');
    expect(() => validateVisualKey('draft.__proto__')).toThrow(BadRequestException);
  });
});
