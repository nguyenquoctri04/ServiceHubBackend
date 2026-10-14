import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface RenderContractPdfInput {
  contract: {
    id: string;
    contractNumber: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    requireSignature: boolean;
    roomId?: string | null;
    status?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    signedAt?: Date | string | null;
  };
  template?: {
    id?: string;
    name?: string | null;
    content?: any;
  } | null;
  provider: {
    id: string;
    name?: string;
    businessType?: string;
    companyName?: string;
    taxCode?: string;
    businessLicenseNumber?: string;
    representativeName?: string;
    representativePosition?: string;
    address?: string;
    phone?: string;
    email?: string;
    accountNumber?: string;
    bankName?: string;
  };
  customer: {
    id: string;
    name?: string;
    cccd?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  services: Array<{
    name: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice: number | string;
    isMandatory?: boolean;
  }>;
  terms: Array<{
    id: string;
    content: string;
  }>;
  room?: {
    roomNumber?: string;
    propertyName?: string;
    address?: string;
  } | null;
  totalMonthlyPrice?: number | string;
  depositAmount?: number | string;
}

@Injectable()
export class ContractPdfRendererService {
  private readonly logger = new Logger(ContractPdfRendererService.name);

  /**
   * Renders a real PDF document buffer dynamically from contract data and template JSON.
   */
  async renderContractPdf(input: RenderContractPdfInput): Promise<Buffer> {
    try {
      return await this.renderWithPdfKit(input);
    } catch (error) {
      this.logger.warn(`PDFKit rendering failed or module unavailable, falling back to built-in PDF generator: ${error?.message || error}`);
      return this.renderWithBuiltInGenerator(input);
    }
  }

  /**
   * Primary rendering engine using PDFKit formatted to match the frontend contract view exactly.
   */
  private async renderWithPdfKit(input: RenderContractPdfInput): Promise<Buffer> {
    let PDFDocument: any;
    try {
      PDFDocument = require('pdfkit');
    } catch {
      throw new Error('PDFKit is not installed');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      // Resolve system fonts with Vietnamese support
      const fonts = this.resolveSystemFonts();
      const hasUnicodeFont = !!fonts.regular;

      if (fonts.regular) {
        doc.registerFont('AppFont', fonts.regular);
        doc.font('AppFont');
      }
      if (fonts.bold) {
        doc.registerFont('AppFont-Bold', fonts.bold);
      }
      if (fonts.italic) {
        doc.registerFont('AppFont-Italic', fonts.italic);
      }

      const useFont = (type: 'regular' | 'bold' | 'italic' = 'regular') => {
        if (type === 'bold' && fonts.bold) return doc.font('AppFont-Bold');
        if (type === 'italic' && fonts.italic) return doc.font('AppFont-Italic');
        if (fonts.regular) return doc.font('AppFont');
        return doc.font(type === 'bold' ? 'Helvetica-Bold' : (type === 'italic' ? 'Helvetica-Oblique' : 'Helvetica'));
      };

      const txt = (str: string) => (hasUnicodeFont ? str : this.removeVietnameseTones(str));
      const vars = this.buildVariableMap(input);
      const isRental = Boolean(input.contract.roomId || input.room);

      // --- 1. QUỐC HIỆU & TIÊU NGỮ ---
      useFont('bold').fontSize(11).fillColor('#111827').text(txt('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'), { align: 'center' });
      doc.moveDown(0.2);
      useFont('bold').fontSize(10.5).text(txt('Độc lập - Tự do - Hạnh phúc'), { align: 'center', underline: true });
      doc.moveDown(0.6);

      // --- 2. ĐỊA ĐIỂM & NGÀY THÁNG ---
      // Nếu là bản nháp (DRAFT): lấy ngày hiện tại (now).
      // Nếu đã qua bản nháp (PENDING_SIGNATURE, ACTIVE, ...): giữ nguyên ngày đã chốt và băm SHA-256.
      const isDraft = input.contract.status === 'DRAFT';
      const contractDate = isDraft
        ? new Date()
        : new Date(input.contract.updatedAt || input.contract.signedAt || input.contract.createdAt || new Date());
      const day = String(contractDate.getDate()).padStart(2, '0');
      const month = String(contractDate.getMonth() + 1).padStart(2, '0');
      const year = contractDate.getFullYear();
      const dateString = `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;

      useFont('italic').fontSize(9.5).fillColor('#374151').text(txt(dateString), { align: 'right' });
      doc.moveDown(0.8);

      // --- 3. TIÊU ĐỀ HỢP ĐỒNG & SỐ ---
      const title = input.template?.name || (isRental ? 'HỢP ĐỒNG THUÊ NHÀ Ở' : 'HỢP ĐỒNG CUNG CẤP DỊCH VỤ');
      useFont('bold').fontSize(13.5).fillColor('#111827').text(txt(title.toUpperCase()), { align: 'center' });
      doc.moveDown(0.2);
      useFont('regular').fontSize(9).fillColor('#4b5563').text(txt(`Số: ${input.contract.contractNumber}`), { align: 'center' });
      doc.moveDown(0.8);

      // Legal references (if any)
      const legalRefs = input.template?.content?.legalReferences;
      if (Array.isArray(legalRefs) && legalRefs.length > 0) {
        useFont('italic').fontSize(8.5).fillColor('#4b5563');
        legalRefs.forEach((ref) => {
          doc.text(txt(`- Căn cứ: ${ref}`), { align: 'center' });
        });
        doc.moveDown(0.5);
      }

      // Divider line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#d1d5db');
      doc.moveDown(0.8);

      // --- 4. THÔNG TIN BÊN A (NHÀ CUNG CẤP / BÊN CHO THUÊ) ---
      const partyALabel = isRental ? 'BÊN CHO THUÊ (BÊN A):' : 'BÊN CUNG CẤP DỊCH VỤ (BÊN A):';
      useFont('bold').fontSize(10.5).fillColor('#111827').text(txt(partyALabel));
      doc.moveDown(0.2);
      useFont('regular').fontSize(9.5).fillColor('#1f2937');

      const p = input.provider;
      if (p.businessType === 'COMPANY') {
        doc.text(txt(`Đại diện: ${p.companyName || p.name || 'Chưa cập nhật'}`));
        doc.text(txt(`Mã số thuế: ${p.taxCode || 'Chưa cập nhật'}`));
        doc.text(txt(`Người đại diện: Ông/Bà ${p.representativeName || p.name || 'Chưa cập nhật'} - Chức vụ: ${p.representativePosition || 'Đại diện theo pháp luật'}`));
      } else if (p.businessType === 'HOUSEHOLD') {
        doc.text(txt(`Hộ kinh doanh: ${p.companyName || p.name || 'Chưa cập nhật'}`));
        doc.text(txt(`Giấy phép/Mã số thuế: ${p.taxCode || p.businessLicenseNumber || 'Chưa cập nhật'}`));
        doc.text(txt(`Chủ hộ: Ông/Bà ${p.representativeName || p.name || 'Chưa cập nhật'}`));
      } else {
        doc.text(txt(`Họ và tên: Ông/Bà ${p.representativeName || p.name || 'Chưa cập nhật'}`));
        if (p.taxCode || p.businessLicenseNumber) {
          doc.text(txt(`Mã số thuế/CCCD: ${p.taxCode || p.businessLicenseNumber}`));
        }
      }
      doc.text(txt(`Địa chỉ: ${p.address || 'Chưa cập nhật'}`));
      doc.text(txt(`Điện thoại: ${p.phone || 'Chưa cập nhật'}`));
      if (p.accountNumber) {
        doc.text(txt(`Số tài khoản: ${p.accountNumber} - ${p.bankName || 'Ngân hàng'}`));
      }
      doc.moveDown(0.8);

      // --- 5. THÔNG TIN BÊN B (KHÁCH HÀNG / BÊN THUÊ) ---
      const partyBLabel = isRental ? 'BÊN THUÊ (BÊN B):' : 'BÊN SỬ DỤNG DỊCH VỤ (BÊN B):';
      useFont('bold').fontSize(10.5).fillColor('#111827').text(txt(partyBLabel));
      doc.moveDown(0.2);
      useFont('regular').fontSize(9.5).fillColor('#1f2937');

      const c = input.customer;
      doc.text(txt(`Tên hiển thị: ${c.name || 'Khách hàng'}`));
      doc.text(txt(`Điện thoại: ${c.phone || 'Chưa cập nhật'}`));
      if (c.cccd) {
        doc.text(txt(`CCCD/CMND: ${c.cccd}`));
      }
      if (c.address) {
        doc.text(txt(`Địa chỉ: ${c.address}`));
      }
      doc.moveDown(0.8);

      // --- 6. CÁC DỊCH VỤ ĐĂNG KÝ ---
      useFont('bold').fontSize(10.5).fillColor('#111827').text(txt('CÁC DỊCH VỤ ĐĂNG KÝ:'));
      doc.moveDown(0.2);
      if (input.services && input.services.length > 0) {
        input.services.forEach((s) => {
          const priceStr = typeof s.unitPrice === 'number' || s.unitPrice ? `: ${this.formatMoney(s.unitPrice)} đ` : '';
          const qtyStr = s.quantity ? ` (SL: ${s.quantity})` : '';
          const mandStr = s.isMandatory ? ' (Bắt buộc)' : '';
          const line = `- ${s.name}${priceStr}${qtyStr}${mandStr}`;
          useFont('regular').fontSize(9.5).fillColor('#374151').text(txt(line), { indent: 12 });
          doc.moveDown(0.15);
        });
      } else {
        useFont('regular').fontSize(9.5).fillColor('#6b7280').text(txt('(Chưa chọn dịch vụ)'), { indent: 12 });
      }
      doc.moveDown(0.8);

      // --- 7. CÁC ĐIỀU KHOẢN HỢP ĐỒNG ---
      useFont('bold').fontSize(10.5).fillColor('#111827').text(txt('CÁC ĐIỀU KHOẢN HỢP ĐỒNG:'));
      doc.moveDown(0.4);

      const rawSections = input.template?.content?.sections || this.getDefaultSections(input);
      const sections = (Array.isArray(rawSections) ? rawSections : []).map((s: any) => {
        const heading = typeof s.heading === 'string' ? s.heading : (typeof s.title === 'string' ? s.title : '');
        const body = typeof s.body === 'string' ? s.body : (typeof s.content === 'string' ? s.content : '');
        return { heading, body };
      }).filter((s) => {
        if (!s.heading && !s.body) return false;
        const lower = s.heading.toLowerCase();
        return !lower.includes('thông tin các bên') &&
               !lower.includes('các bên') &&
               !lower.includes('bên cho thuê') &&
               !lower.includes('bên thuê') &&
               !lower.includes('đơn vị cung cấp') &&
               !lower.includes('khách hàng sử dụng') &&
               !lower.includes('bên cung cấp dịch vụ') &&
               !lower.includes('bên sử dụng dịch vụ');
      });

      if (sections.length > 0) {
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const rawHeading = sec.heading.replace(/^Điều \d+[:\.]?\s*/i, '');
          const headingText = this.interpolate(rawHeading, vars);
          const bodyText = this.interpolate(sec.body, vars);

          useFont('bold').fontSize(10).fillColor('#111827').text(txt(`Điều ${i + 1}: ${headingText}`));
          doc.moveDown(0.2);
          useFont('regular').fontSize(9.5).fillColor('#374151').text(txt(bodyText), { align: 'justify', lineGap: 2 });
          doc.moveDown(0.5);
        }
      }

      if (input.terms && input.terms.length > 0) {
        input.terms.forEach((t, idx) => {
          const contentText = t.content.replace(/^Điều \d+[:\.]?\s*/i, '').replace(/^\d+\.\s*/, '');
          const colonIdx = contentText.indexOf(':');
          const termTitle = colonIdx > -1 ? contentText.substring(0, colonIdx) : '';
          const termBody = colonIdx > -1 ? contentText.substring(colonIdx + 1).trim() : contentText;
          const termNumber = sections.length + idx + 1;

          useFont('bold').fontSize(9.5).fillColor('#111827').text(txt(`Điều ${termNumber}${termTitle ? `: ${termTitle}` : '.'} `), { continued: true });
          useFont('regular').fontSize(9.5).fillColor('#374151').text(txt(termBody), { align: 'justify', lineGap: 2 });
          doc.moveDown(0.4);
        });
      } else if (sections.length === 0) {
        useFont('regular').fontSize(9.5).fillColor('#6b7280').text(txt('(Chưa chọn điều khoản)'), { indent: 12 });
      }
      doc.moveDown(1.2);

      // --- 9. CHỮ KÝ ĐẠI DIỆN HAI BÊN ---
      if (doc.y > 670) {
        doc.addPage();
      }

      const signY = doc.y;
      const leftColX = 50;
      const rightColX = 315;
      const colWidth = 230;

      const signALabel = isRental ? 'ĐẠI DIỆN BÊN CHO THUÊ' : 'ĐẠI DIỆN BÊN CUNG CẤP DỊCH VỤ';
      const signBLabel = isRental ? 'ĐẠI DIỆN BÊN THUÊ' : 'ĐẠI DIỆN BÊN SỬ DỤNG DỊCH VỤ';

      useFont('bold').fontSize(10).fillColor('#111827').text(txt(signALabel), leftColX, signY, { width: colWidth, align: 'center' });
      useFont('bold').fontSize(10).fillColor('#111827').text(txt(signBLabel), rightColX, signY, { width: colWidth, align: 'center' });

      useFont('italic').fontSize(8.5).fillColor('#6b7280').text(txt('(Ký và ghi rõ họ tên)'), leftColX, signY + 14, { width: colWidth, align: 'center' });
      useFont('italic').fontSize(8.5).fillColor('#6b7280').text(txt('(Ký và ghi rõ họ tên)'), rightColX, signY + 14, { width: colWidth, align: 'center' });

      // If active contract, display digital signature confirmation
      if (input.contract.status === 'ACTIVE') {
        useFont('bold').fontSize(10).fillColor('#16a34a').text(txt('Đã ký'), leftColX, signY + 45, { width: colWidth, align: 'center' });
        useFont('bold').fontSize(10).fillColor('#16a34a').text(txt('Đã ký'), rightColX, signY + 45, { width: colWidth, align: 'center' });
      }

      const repNameA = input.provider.representativeName || input.provider.name || '';
      const repNameB = input.customer.name || '';
      if (repNameA) {
        useFont('bold').fontSize(9.5).fillColor('#111827').text(txt(repNameA), leftColX, signY + 75, { width: colWidth, align: 'center' });
      }
      if (repNameB) {
        useFont('bold').fontSize(9.5).fillColor('#111827').text(txt(repNameB), rightColX, signY + 75, { width: colWidth, align: 'center' });
      }

      doc.end();
    });
  }

  /**
   * High-reliability built-in pure-TypeScript PDF 1.4 generator fallback.
   */
  private renderWithBuiltInGenerator(input: RenderContractPdfInput): Buffer {
    const vars = this.buildVariableMap(input);
    const rawSections = input.template?.content?.sections || this.getDefaultSections(input);
    const sections = (Array.isArray(rawSections) ? rawSections : []).map((s: any) => {
      const heading = typeof s.heading === 'string' ? s.heading : (typeof s.title === 'string' ? s.title : '');
      const body = typeof s.body === 'string' ? s.body : (typeof s.content === 'string' ? s.content : '');
      return { heading, body };
    });
    const isRental = Boolean(input.contract.roomId || input.room);
    const title = input.template?.name || (isRental ? 'HỢP ĐỒNG THUÊ NHÀ Ở' : 'HỢP ĐỒNG CUNG CẤP DỊCH VỤ');

    const lines: string[] = [];
    lines.push('BT');
    lines.push('/F1 10 Tf');
    lines.push('297 790 Td');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones('CONG HOA XA HOI CHU NGHIA VIET NAM'))}) Tj`);
    lines.push('0 -14 Td');
    lines.push('/F1 9 Tf');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones('Doc lap - Tu do - Hanh phuc'))}) Tj`);
    lines.push('0 -24 Td');
    lines.push('/F1 14 Tf');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones(title.toUpperCase()))}) Tj`);
    lines.push('0 -16 Td');
    lines.push('/F1 9 Tf');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones(`So hop dong: ${input.contract.contractNumber}`))}) Tj`);
    lines.push('0 -20 Td');

    const p = input.provider;
    lines.push('/F1 9 Tf');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones(`BEN A: ${p.companyName || p.name || 'Nha cung cap'} - MST: ${p.taxCode || 'N/A'}`))}) Tj`);
    lines.push('0 -14 Td');
    lines.push(`(${this.escapePdfText(this.removeVietnameseTones(`BEN B: ${input.customer.name || 'Khach hang'} - SDT: ${input.customer.phone || 'N/A'}`))}) Tj`);
    lines.push('0 -20 Td');

    sections.forEach((sec, idx) => {
      lines.push('/F1 10 Tf');
      lines.push(`(${this.escapePdfText(this.removeVietnameseTones(`Dieu ${idx + 1}: ${this.interpolate(sec.heading, vars)}`))}) Tj`);
      lines.push('0 -14 Td');
      lines.push('/F1 8 Tf');
      lines.push(`(${this.escapePdfText(this.removeVietnameseTones(this.interpolate(sec.body, vars)))}) Tj`);
      lines.push('0 -16 Td');
    });

    lines.push('ET');

    const streamContent = lines.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf-8');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += obj + '\n';
    }

    const startXref = Buffer.byteLength(pdf, 'utf-8');
    pdf += 'xref\n';
    pdf += `0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += 'trailer\n';
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${startXref}\n`;
    pdf += '%%EOF\n';

    return Buffer.from(pdf, 'utf-8');
  }

  /**
   * Replaces variables {{var_name}} in text with runtime data.
   */
  private interpolate(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? vars[key] : `[${key}]`;
    });
  }

  /**
   * Prepares the map of template variables.
   */
  private buildVariableMap(input: RenderContractPdfInput): Record<string, string> {
    const p = input.provider;
    const c = input.customer;
    const r = input.room;

    return {
      provider_name: p.companyName || p.name || 'Nhà cung cấp',
      provider_tax_code: p.taxCode || p.businessLicenseNumber || 'Chưa cập nhật',
      provider_business_id: p.taxCode || p.businessLicenseNumber || 'Chưa cập nhật',
      provider_address: p.address || 'Chưa cập nhật',
      provider_representative: p.representativeName || p.representativePosition || p.name || 'Người đại diện',
      provider_rep: p.representativeName || p.name || 'Người đại diện',
      provider_phone: p.phone || 'Chưa cập nhật',
      provider_email: p.email || 'Chưa cập nhật',

      customer_name: c.name || 'Khách hàng',
      customer_cccd: c.cccd || 'Chưa cập nhật',
      customer_address: c.address || 'Chưa cập nhật',
      customer_phone: c.phone || 'Chưa cập nhật',
      customer_email: c.email || 'Chưa cập nhật',

      contract_number: input.contract.contractNumber,
      room_number: r?.roomNumber || (input.contract.roomId ? 'Chưa xếp phòng' : 'Không áp dụng'),
      property_name: r?.propertyName || 'Bất động sản',
      property_address: r?.address || r?.propertyName || p.address || 'Địa chỉ cung cấp thỏa thuận',

      start_date: this.formatDate(input.contract.startDate),
      end_date: input.contract.endDate ? this.formatDate(input.contract.endDate) : 'Theo thỏa thuận / Vô thời hạn',

      monthly_amount: this.formatMoney(input.totalMonthlyPrice ?? 0),
      price_monthly: this.formatMoney(input.totalMonthlyPrice ?? 0),
      deposit_amount: this.formatMoney(input.depositAmount ?? 0),

      created_date: this.formatDate(input.contract.status === 'DRAFT' ? new Date() : (input.contract.updatedAt || input.contract.signedAt || input.contract.createdAt || new Date())),
      contract_date: this.formatDate(input.contract.status === 'DRAFT' ? new Date() : (input.contract.updatedAt || input.contract.signedAt || input.contract.createdAt || new Date())),
    };
  }

  /**
   * Default sections fallback if template does not contain sections.
   */
  private getDefaultSections(input: RenderContractPdfInput) {
    if (input.room) {
      return [
        { heading: 'Điều 1: Đối tượng cho thuê', body: 'Bên Cho Thuê đồng ý cho Bên Thuê thuê phòng số {{room_number}} tại địa chỉ {{property_address}}.' },
        { heading: 'Điều 2: Giá thuê và Tiền cọc', body: 'Giá thuê hàng tháng: {{price_monthly}} VNĐ. Tiền đặt cọc: {{deposit_amount}} VNĐ.' },
        { heading: 'Điều 3: Thời hạn thuê', body: 'Hợp đồng có hiệu lực từ ngày {{start_date}} đến ngày {{end_date}}.' },
      ];
    }
    return [
      { heading: 'Điều 1: Phạm vi dịch vụ', body: 'Bên Cung Cấp thực hiện cung cấp các dịch vụ theo danh mục được thỏa thuận tại {{property_address}} từ ngày {{start_date}} đến ngày {{end_date}}.' },
      { heading: 'Điều 2: Thanh toán và Chi phí', body: 'Chi phí dịch vụ được thanh toán định kỳ hoặc theo từng lần phát sinh theo đơn giá niêm yết.' },
    ];
  }

  private resolveSystemFonts(): { regular: string | null; bold: string | null; italic: string | null } {
    const fontPairs = [
      {
        regular: 'C:\\Windows\\Fonts\\times.ttf',
        bold: 'C:\\Windows\\Fonts\\timesbd.ttf',
        italic: 'C:\\Windows\\Fonts\\timesi.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\arial.ttf',
        bold: 'C:\\Windows\\Fonts\\arialbd.ttf',
        italic: 'C:\\Windows\\Fonts\\ariali.ttf',
      },
      {
        regular: 'C:\\Windows\\Fonts\\segoeui.ttf',
        bold: 'C:\\Windows\\Fonts\\segoeuib.ttf',
        italic: 'C:\\Windows\\Fonts\\segoeuii.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        italic: '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf',
      },
    ];

    for (const pair of fontPairs) {
      try {
        if (fs.existsSync(pair.regular)) {
          return {
            regular: pair.regular,
            bold: fs.existsSync(pair.bold) ? pair.bold : null,
            italic: fs.existsSync(pair.italic) ? pair.italic : null,
          };
        }
      } catch {
        // ignore
      }
    }
    return { regular: null, bold: null, italic: null };
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatMoney(val: number | string | undefined): string {
    if (val === undefined || val === null || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('vi-VN');
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private removeVietnameseTones(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }
}
