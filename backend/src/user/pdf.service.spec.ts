import { PdfService } from './pdf.service';
import { ageFromBirthDate } from './birth-date';
import type { UserDocument } from './entities/user.entity';

describe('Biodata PDF birth date', () => {
  const service = new PdfService();
  const render = (profile: Partial<UserDocument>) => service['generateHtml']({
    userId: '000123', gender: 'female', ...profile,
  } as UserDocument);

  it('shows the saved day, month and year and calculates age from it', () => {
    const html = render({ dateOfBirth: '2000-05-15', age: 99 });
    expect(html).toContain('Date of Birth');
    expect(html).toContain('15 May 2000');
    expect(html).toContain(`${ageFromBirthDate('2000-05-15')} years`);
    expect(html).not.toContain('99 years');
    expect(html).not.toContain('Birth Year');
  });

  it.each([undefined, '', '2001-02-29', '2999-01-01'])(
    'does not invent a birthday for missing or invalid date %s', dateOfBirth => {
      const html = render({ dateOfBirth, age: 30 });
      expect(html).not.toContain('Date of Birth');
      expect(html).toContain('30 years');
      expect(html).not.toContain('Birth Year');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Invalid Date');
    },
  );
});
