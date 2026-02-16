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
     /*  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--font-render-hinting=none', // Better font rendering
        '--disable-accelerated-2d-canvas',
      ], */
    });

    try {
      const page = await browser.newPage();
      
      // High resolution for sharp text
      await page.setViewport({ 
        width: 800, 
        height: 1200, 
        deviceScaleFactor: 2 // 2x resolution for crisp text
      });

      const htmlContent = this.generateHtml(user);
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { 
          top: '15px', 
          right: '15px', 
          bottom: '15px', 
          left: '15px' 
        },
        preferCSSPageSize: true,
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
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biodata ${user.userId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #f9fafb;
      padding: 15px;
      color: #111827;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    .container {
      max-width: 750px;
      margin: 0 auto;
    }

    .header-card {
      background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
      border-radius: 12px;
      padding: 28px;
      color: white;
      text-align: center;
      margin-bottom: 20px;
    }

    .avatar {
      width: 90px;
      height: 90px;
      margin: 0 auto 18px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 45px;
    }

    .biodata-number {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }

    .gender-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 5px 18px;
      border-radius: 18px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .quick-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      text-align: left;
    }

    .info-item {
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      font-size: 12px;
    }

    .info-label {
      color: rgba(255, 255, 255, 0.75);
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .info-value {
      font-weight: 600;
      font-size: 13px;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .card {
      background: white;
      border-radius: 10px;
      padding: 18px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #be185d;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #fbcfe8;
      text-align: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    td {
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
      line-height: 1.7;
      vertical-align: top;
    }

    td:first-child {
      color: #374151;
      width: 40%;
      font-weight: 600;
    }

    td:last-child {
      color: #111827;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="avatar">${isMale ? '👨' : '👩'}</div>
      <div class="biodata-number">
        Biodata #${isMale ? 'NG' : 'NB'}-${user.userId}
      </div>
      <span class="gender-badge">${isMale ? 'MALE' : 'FEMALE'}</span>

      <div class="quick-info">
        ${this.renderQuickInfo('Marital Status', user.maritalStatus)}
        ${this.renderQuickInfo('Birth Year', birthYear)}
        ${this.renderQuickInfo('Age', user.age ? `${user.age} years` : 'N/A')}
        ${this.renderQuickInfo('Height', user.personalInformation?.height || 'N/A')}
        ${this.renderQuickInfo('Skin Tone', user.personalInformation?.skinTone)}
        ${this.renderQuickInfo('Blood Group', user.bloodGroup)}
        ${this.renderQuickInfo('Weight', user.weight ? `${user.weight} kg` : 'N/A')}
        ${this.renderQuickInfo('Nationality', user.nationality)}
      </div>
    </div>

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
</body>
</html>
    `;
  }

  private renderQuickInfo(label: string, value: any): string {
    const displayValue = this.getValue(value);
    if (displayValue === 'N/A') return '';
    
    return `
      <div class="info-item">
        <span class="info-label">${label}</span>
        <div class="info-value">${displayValue}</div>
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
        return `<tr><td>${label}</td><td>${displayValue}</td></tr>`;
      })
      .join('');

    return `
      <div class="card">
        <h2 class="card-title">${title}</h2>
        <table><tbody>${tableRows}</tbody></table>
      </div>
    `;
  }
}
