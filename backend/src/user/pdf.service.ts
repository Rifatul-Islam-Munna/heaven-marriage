import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { UserDocument } from './entities/user.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private getValue(value: any): string {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  async generateBiodataPdf(user: UserDocument): Promise<Buffer> {
     const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1800 });

      const htmlContent = this.generateHtml(user);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`PDF generation failed: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private generateHtml(user: UserDocument): string {
    const isMale = user.gender?.toLowerCase() === 'male';
    const birthYear = user.age ? new Date().getFullYear() - user.age : 'N/A';

    // Build personal info rows
    const personalInfoRows: Array<[string, any]> = [
      ['Outside Clothes', user.personalInformation?.outsideClothes],
      ['Prayer 5 Times', user.personalInformation?.prayerFiverTimeFrom],
      ['Miss Prayer Times', user.personalInformation?.MissPrayerTime],
      ['Mahram Non-Mahram', user.personalInformation?.maharaNonMahram],
      ['Recite Quran', user.personalInformation?.reciteQuran],
      ['Fiqh Follow', user.personalInformation?.fiqhFollow],
      ['Digital Media', user.personalInformation?.digitalMedia],
      ['Mental/Physical Issue', user.personalInformation?.mentalOrPhysicalIssue],
      ['Special Work of Deen', user.personalInformation?.specialWorkOfDeen],
      ['Majar Believe', user.personalInformation?.majarBeliveStatus],
      ['Islamic Books', user.personalInformation?.islamicBookName],
      ['Islamic Scholars', user.personalInformation?.islamicScholarsName],
      ['Hobby', user.personalInformation?.extraInfoHobby],
      ['Islamic Study', user.personalInformation?.islamicStudy],
      ['Physical Structure', user.personalInformation?.physicalStructure],
    ];

    if (isMale) {
      personalInfoRows.push(['Beard', user.personalInformation?.manBeard]);
      personalInfoRows.push(['Cloth Above Ankles', user.personalInformation?.manClothAboveAnkels]);
    } else {
      personalInfoRows.push(['Niqab Year', user.personalInformation?.womenNiqbYear]);
    }

    // Marriage info
    const marriageInfoRows: Array<[string, any]> = [];

    if (user.marriageInformationWomen) {
      marriageInfoRows.push(
        ['Guardians Agreed', user.marriageInformationWomen.isGuardiansAgreed],
        ['Job After Marriage', user.marriageInformationWomen.jobAfterMarriage],
        ['Study After Marriage', user.marriageInformationWomen.studyAfterMarriage],
        ['Thoughts on Marriage', user.marriageInformationWomen.thoughtsOnMarriage],
        ['Polygamy Consent', user.marriageInformationWomen.polygamyConsentOptions],
        ['Caring for Children', user.marriageInformationWomen.caringforChildren],
        ['Child Custody', user.marriageInformationWomen.childCustody],
      );
    }

    if (user.marriageInformationMan) {
      marriageInfoRows.push(
        ['Guardians Agreed', user.marriageInformationMan.isGuardiansAgreed],
        ['Wife Veil After Marriage', user.marriageInformationMan.wifeVailAfterMarriage],
        ['Allow Wife Study', user.marriageInformationMan.allowWifeStudyAfterMarriage],
        ['Wife Job After Marriage', user.marriageInformationMan.wifeJobAfterMarriage],
        ['Living Place', user.marriageInformationMan.livingPlaceAfterMarriage],
        ['Expected Gift', user.marriageInformationMan.expectedAnyGiftFromMarriage],
        ['Thoughts on Marriage', user.marriageInformationMan.thoughtsOnMarriage],
      );
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biodata ${user.userId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background-color: #f9fafb;
      padding: 20px;
      color: #111827;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 24px;
    }

    .sidebar {
      background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
      border-radius: 12px;
      padding: 32px;
      color: white;
      height: fit-content;
    }

    .avatar {
      width: 128px;
      height: 128px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
    }

    .biodata-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .biodata-number {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .gender-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 16px;
      border-radius: 16px;
      font-size: 13px;
    }

    .quick-info {
      margin-bottom: 32px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 13px;
    }

    .info-label {
      color: rgba(255, 255, 255, 0.8);
    }

    .info-value {
      font-weight: 600;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-title {
      font-size: 18px;
      font-weight: bold;
      color: #be185d;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #fbcfe8;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    td {
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
    }

    td:first-child {
      color: #374151;
      width: 40%;
    }

    td:last-child {
      color: #111827;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="grid">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="avatar">${isMale ? '👨' : '👩'}</div>
        
        <div class="biodata-header">
          <div class="biodata-number">
            Biodata #${isMale ? 'NG' : 'NB'}-${user.userId}
          </div>
          <span class="gender-badge">${isMale ? 'MALE' : 'FEMALE'}</span>
        </div>

        <div class="quick-info">
          ${this.renderInfoRow('Marital Status', user.maritalStatus)}
          ${this.renderInfoRow('Birth Year', birthYear)}
          ${this.renderInfoRow('Age', user.age ? `${user.age} years` : 'N/A')}
          ${this.renderInfoRow('Height', user.personalInformation?.height || 'N/A')}
          ${this.renderInfoRow('Skin Tone', user.personalInformation?.skinTone)}
          ${this.renderInfoRow('Blood Group', user.bloodGroup)}
          ${this.renderInfoRow('Weight', user.weight ? `${user.weight} kg` : 'N/A')}
          ${this.renderInfoRow('Nationality', user.nationality)}
        </div>
      </div>

      <!-- Content -->
      <div class="content">
        ${this.renderSection('Address', [
          ['Permanent Address', user.address?.permanentAddress],
          ['Present Address', user.address?.presentAddress],
          ['District', user.address?.district],
          ['Upazila', user.address?.upazila],
          ['Extra Info', user.address?.extraInfo],
        ])}

        ${this.renderSection('Education', [
          ['Education Method', user.educationInfo?.educationMethod],
          ['Highest Education', user.educationInfo?.highestEducation],
          ['Education Background', user.educationInfo?.educationBackground],
          ['Board', user.educationInfo?.highestEducationBoard],
          ['Group/Subject', user.educationInfo?.highestEducationGroup],
          ['Passing Year', user.educationInfo?.highestEducationPassingYear],
          ['Currently Studying', user.educationInfo?.currentlyDoingHightEducation],
          ['SSC Passing Year', user.educationInfo?.sSCPassingYear],
          ['SSC Group', user.educationInfo?.sSCPassingGroup],
          ['SSC Result', user.educationInfo?.sSCResult],
          ['HSC Passing Year', user.educationInfo?.hSCPassingYear],
          ['HSC Group', user.educationInfo?.hSCPassingGroup],
          ['HSC Result', user.educationInfo?.hSCResult],
        ])}

        ${this.renderSection('Family Information', [
          ['Father Alive', user.familyInfo?.isFatherAlive],
          ['Father Profession', user.familyInfo?.fathersProfession],
          ['Mother Alive', user.familyInfo?.isMotherAlive],
          ['Mother Profession', user.familyInfo?.mothersProfession],
          ['Number of Brothers', user.familyInfo?.brotherCount],
          ['Brothers Info', user.familyInfo?.brotherInformation],
          ['Number of Sisters', user.familyInfo?.sisterCount],
          ['Sisters Info', user.familyInfo?.sisterInformation],
          ['Financial Status', user.familyInfo?.familyFinancial],
          ['Family Assets', user.familyInfo?.familyAssetDetails],
          ['Religious Condition', user.familyInfo?.familyReligiousCondition],
        ])}

        ${this.renderSection('Personal Information', personalInfoRows)}

        ${this.renderSection('Occupation', [
          ['Profession', user.occupational?.profession],
          ['Working Details', user.occupational?.workingDetails],
          ['Salary', user.occupational?.salary],
        ])}

        ${marriageInfoRows.length > 0 ? this.renderSection('Marriage Information', marriageInfoRows) : ''}

        ${user.expectedLifePartner ? this.renderSection('Expected Life Partner', [
          ['Age', user.expectedLifePartner.age],
          ['Complexion', user.expectedLifePartner.complexion],
          ['Height', user.expectedLifePartner.height],
          ['Education', user.expectedLifePartner.education],
          ['District', user.expectedLifePartner.district],
          ['Upazila', user.expectedLifePartner.upazila],
          ['Marital Status', user.expectedLifePartner.maritalStatus],
          ['Profession', user.expectedLifePartner.profession],
          ['Financial Condition', user.expectedLifePartner.financialCondition],
          ['Expected Quality', user.expectedLifePartner.expectedQuality],
        ]) : ''}

        ${user.customFields && Object.keys(user.customFields).length > 0 
          ? this.renderSection('Additional Information', 
              Object.entries(user.customFields).map(([key, value]) => [key, value])
            ) 
          : ''}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private renderInfoRow(label: string, value: any): string {
    const displayValue = this.getValue(value);
    if (displayValue === 'N/A') return '';
    
    return `
      <div class="info-row">
        <span class="info-label">${label}</span>
        <span class="info-value">${displayValue}</span>
      </div>
    `;
  }

  private renderSection(title: string, rows: Array<[string, any]>): string {
    const filteredRows = rows.filter(
      ([_, value]) => value !== undefined && value !== null && value !== '',
    );

    if (filteredRows.length === 0) return '';

    const tableRows = filteredRows
      .map(([label, value]) => {
        const displayValue = this.getValue(value);
        return `
          <tr>
            <td>${label}</td>
            <td>${displayValue}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div class="card">
        <h2 class="card-title">${title}</h2>
        <table>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }
}
