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
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-accelerated-2d-canvas',
        '--disable-extensions',
        '--disable-software-rasterizer',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // 3x resolution for ultra-sharp text
      await page.setViewport({ 
        width: 800, 
        height: 1200, 
        deviceScaleFactor: 3 // 3x = super sharp
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
          top: '12mm', 
          right: '12mm', 
          bottom: '12mm', 
          left: '12mm' 
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
      font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #f9fafb;
      padding: 16px;
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
      border-radius: 14px;
      padding: 32px;
      color: white;
      text-align: center;
      margin-bottom: 22px;
    }

    .avatar {
      width: 100px;
      height: 100px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      border: 3px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .biodata-number {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }

    .gender-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.25);
      padding: 7px 22px;
      border-radius: 20px;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 22px;
      letter-spacing: 1px;
    }

    .quick-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      text-align: left;
    }

    .info-item {
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
    }

    .info-label {
      color: rgba(255, 255, 255, 0.85);
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      font-weight: 600;
    }

    .info-value {
      font-weight: 700;
      font-size: 15px;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .card-title {
      font-size: 19px;
      font-weight: 700;
      color: #be185d;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 3px solid #fbcfe8;
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
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
      font-size: 15px;
      line-height: 1.7;
      vertical-align: top;
    }

    td:first-child {
      color: #374151;
      width: 40%;
      font-weight: 700;
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
      <div class="avatar">${isMale ? 'M' : 'F'}</div>
      <div class="biodata-number">
        Biodata #${isMale ? 'NG' : 'NB'}-${user.userId}
      </div>
      <span class="gender-badge">${isMale ? 'MALE' : 'FEMALE'}</span>
        <div class="brand-link">
    <a href="https://niqaha.com/biodata/${String(user.userId)}" 
       style="color: white; text-decoration: none; font-weight: 600; font-size: 14px; opacity: 0.9;">
      🔗 niqaha.com/biodata/${String(user.userId)}
    </a>
  </div>

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
     <div class="footer-card">
      <div class="footer-brand">
        <strong>নিকাহ</strong> • Niqaha
      </div>
      <a href="https://niqaha.com/biodata/${String(user.userId).padStart(6, '0')}" 
         class="footer-link">
        View Online: niqaha.com/biodata/${String(user.userId).padStart(6, '0')}
      </a>
      <div class="footer-tagline">
        হালাল ম্যাট্রিমনি • Halal Matrimony Platform
      </div>
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
