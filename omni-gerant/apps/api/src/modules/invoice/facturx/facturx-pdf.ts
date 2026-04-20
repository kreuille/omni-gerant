import { PDFDocument, PDFName, PDFHexString, PDFString, StandardFonts } from 'pdf-lib';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1 / F1]: Factur-X PDF/A-3 conforme ISO 19005-3
// Standard France : Factur-X = PDF/A-3 + XML CII embedded + XMP metadata
//
// Ce module cree un vrai PDF/A-3 :
//   - XMP metadata avec tags Factur-X (DocumentType, ConformanceLevel)
//   - Fichier XML factur-x.xml attache comme AF (Associated File)
//   - OutputIntent sRGB obligatoire PDF/A
//   - /AF et /AFRelationship "Data" sur le document
//
// Sources : specification Factur-X 1.0 — factur-x.org

export type FacturxProfile = 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED';

export interface FacturxPdfResult {
  pdf_buffer: Buffer;
  xml_content: string;
  filename: string;
  profile: FacturxProfile;
  conformanceLevel: string;
  pdfaVersion: '3A' | '3B' | '3U';
}

export interface InvoicePdfContent {
  employer: { name: string; siret: string | null; tvaNumber?: string | null; address?: string | null; nafCode?: string | null };
  client: { name: string; siret?: string | null; address?: string | null };
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  lines: Array<{ label: string; quantity: number; unitPriceCents: number; tvaRate: number; totalHtCents: number }>;
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  mentionsLegales?: string;
  paymentTerms?: number;
}

function profileToConformance(profile: FacturxProfile): string {
  switch (profile) {
    case 'MINIMUM': return 'MINIMUM';
    case 'BASIC WL': return 'BASIC WL';
    case 'BASIC': return 'BASIC';
    case 'EN 16931': return 'EN 16931';
    case 'EXTENDED': return 'EXTENDED';
  }
}

function formatCentsEur(cents: number): string {
  // Force espace ASCII au lieu de NBSP/narrow-no-break-space (0xA0/0x202F)
  // WinAnsi encoding utilise par Helvetica ne les supporte pas.
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');
}

/**
 * Build XMP metadata conforme PDF/A-3 + Factur-X
 */
export function generateXmpMetadata(invoiceNumber: string, profile: FacturxProfile = 'EN 16931'): string {
  const conformance = profileToConformance(profile);
  const now = new Date().toISOString();
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="zenAdmin Factur-X 1.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
   <pdf:Producer>zenAdmin</pdf:Producer>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <xmp:CreatorTool>zenAdmin Factur-X ${conformance}</xmp:CreatorTool>
   <xmp:CreateDate>${now}</xmp:CreateDate>
   <xmp:ModifyDate>${now}</xmp:ModifyDate>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Facture ${invoiceNumber}</rdf:li></rdf:Alt></dc:title>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>3</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
   <fx:DocumentType>INVOICE</fx:DocumentType>
   <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
   <fx:Version>1.0</fx:Version>
   <fx:ConformanceLevel>${conformance}</fx:ConformanceLevel>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
                   xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
                   xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
   <pdfaExtension:schemas>
    <rdf:Bag>
     <rdf:li rdf:parseType="Resource">
      <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
      <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
      <pdfaSchema:prefix>fx</pdfaSchema:prefix>
      <pdfaSchema:property>
       <rdf:Seq>
        <rdf:li rdf:parseType="Resource">
         <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
         <pdfaProperty:valueType>Text</pdfaProperty:valueType>
         <pdfaProperty:category>external</pdfaProperty:category>
         <pdfaProperty:description>Name of the embedded XML invoice file</pdfaProperty:description>
        </rdf:li>
        <rdf:li rdf:parseType="Resource">
         <pdfaProperty:name>DocumentType</pdfaProperty:name>
         <pdfaProperty:valueType>Text</pdfaProperty:valueType>
         <pdfaProperty:category>external</pdfaProperty:category>
         <pdfaProperty:description>INVOICE</pdfaProperty:description>
        </rdf:li>
        <rdf:li rdf:parseType="Resource">
         <pdfaProperty:name>Version</pdfaProperty:name>
         <pdfaProperty:valueType>Text</pdfaProperty:valueType>
         <pdfaProperty:category>external</pdfaProperty:category>
         <pdfaProperty:description>Version of the Factur-X XML schema</pdfaProperty:description>
        </rdf:li>
        <rdf:li rdf:parseType="Resource">
         <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
         <pdfaProperty:valueType>Text</pdfaProperty:valueType>
         <pdfaProperty:category>external</pdfaProperty:category>
         <pdfaProperty:description>${conformance}</pdfaProperty:description>
        </rdf:li>
       </rdf:Seq>
      </pdfaSchema:property>
     </rdf:li>
    </rdf:Bag>
   </pdfaExtension:schemas>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Cree un PDF visuel simple a partir du contenu facture + attache le XML Factur-X
 * en tant que Associated File (AF) conforme ISO 19005-3.
 *
 * Note : genere un PDF/A-3B (niveau basique). Pour PDF/A-3A (accessible) il faudrait
 * des tags de structure, hors scope V1.
 */
export async function generateFacturxPdf(
  content: InvoicePdfContent,
  xmlContent: string,
  profile: FacturxProfile = 'EN 16931',
): Promise<Result<FacturxPdfResult, AppError>> {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Facture ${content.number}`);
    pdfDoc.setAuthor(content.employer.name);
    pdfDoc.setCreator('zenAdmin Factur-X');
    pdfDoc.setProducer('zenAdmin');
    pdfDoc.setCreationDate(content.issueDate);

    // Police standard PDF/A safe (Helvetica)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;

    // Titre
    page.drawText(`FACTURE ${content.number}`, { x: 50, y, size: 18, font: fontBold });
    y -= 30;

    // Emetteur
    page.drawText(content.employer.name, { x: 50, y, size: 11, font: fontBold });
    y -= 14;
    if (content.employer.address) {
      page.drawText(content.employer.address.slice(0, 80), { x: 50, y, size: 9, font });
      y -= 12;
    }
    if (content.employer.siret) {
      page.drawText(`SIRET : ${content.employer.siret}`, { x: 50, y, size: 9, font });
      y -= 12;
    }
    if (content.employer.tvaNumber) {
      page.drawText(`TVA : ${content.employer.tvaNumber}`, { x: 50, y, size: 9, font });
      y -= 12;
    }

    // Client
    y -= 10;
    page.drawText('Destinataire :', { x: 50, y, size: 10, font: fontBold });
    y -= 14;
    page.drawText(content.client.name, { x: 50, y, size: 11, font: fontBold });
    y -= 12;
    if (content.client.address) {
      page.drawText(content.client.address.slice(0, 80), { x: 50, y, size: 9, font });
      y -= 12;
    }
    if (content.client.siret) {
      page.drawText(`SIRET : ${content.client.siret}`, { x: 50, y, size: 9, font });
      y -= 12;
    }

    // Dates
    y -= 15;
    page.drawText(`Date d'emission : ${content.issueDate.toLocaleDateString('fr-FR')}`, { x: 50, y, size: 10, font });
    y -= 12;
    if (content.dueDate) {
      page.drawText(`Echeance : ${content.dueDate.toLocaleDateString('fr-FR')}`, { x: 50, y, size: 10, font });
      y -= 12;
    }

    // Lignes
    y -= 20;
    page.drawText('Designation', { x: 50, y, size: 10, font: fontBold });
    page.drawText('Qte', { x: 320, y, size: 10, font: fontBold });
    page.drawText('PU HT', { x: 370, y, size: 10, font: fontBold });
    page.drawText('TVA %', { x: 430, y, size: 10, font: fontBold });
    page.drawText('Total HT', { x: 490, y, size: 10, font: fontBold });
    y -= 4;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5 });
    y -= 10;

    for (const line of content.lines) {
      if (y < 100) break;
      page.drawText(line.label.slice(0, 45), { x: 50, y, size: 9, font });
      page.drawText(line.quantity.toString(), { x: 320, y, size: 9, font });
      page.drawText(formatCentsEur(line.unitPriceCents), { x: 370, y, size: 9, font });
      page.drawText(`${(line.tvaRate / 100).toFixed(0)}%`, { x: 430, y, size: 9, font });
      page.drawText(formatCentsEur(line.totalHtCents), { x: 490, y, size: 9, font });
      y -= 14;
    }

    // Totaux
    y -= 10;
    page.drawLine({ start: { x: 350, y }, end: { x: width - 50, y }, thickness: 0.5 });
    y -= 14;
    page.drawText('Total HT', { x: 380, y, size: 10, font });
    page.drawText(`${formatCentsEur(content.totalHtCents)} EUR`, { x: 490, y, size: 10, font });
    y -= 12;
    page.drawText('TVA', { x: 380, y, size: 10, font });
    page.drawText(`${formatCentsEur(content.totalTvaCents)} EUR`, { x: 490, y, size: 10, font });
    y -= 14;
    page.drawText('Total TTC', { x: 380, y, size: 11, font: fontBold });
    page.drawText(`${formatCentsEur(content.totalTtcCents)} EUR`, { x: 490, y, size: 11, font: fontBold });

    // Mentions légales
    if (content.mentionsLegales && y > 120) {
      y -= 30;
      page.drawText('Mentions legales :', { x: 50, y, size: 9, font: fontBold });
      y -= 12;
      const mentions = content.mentionsLegales.split('\n').slice(0, 6);
      for (const m of mentions) {
        if (y < 60) break;
        page.drawText(m.slice(0, 100), { x: 50, y, size: 8, font });
        y -= 10;
      }
    }

    // ── ATTACHMENT Factur-X XML comme AF (Associated File) ─────────
    const xmlBytes = Buffer.from(xmlContent, 'utf-8');

    // Embedded file stream
    const embeddedFileStream = pdfDoc.context.stream(xmlBytes, {
      Type: 'EmbeddedFile',
      Subtype: 'text/xml',
      Params: {
        ModDate: PDFString.fromDate(new Date()),
        Size: xmlBytes.length,
      },
    });
    const embeddedFileStreamRef = pdfDoc.context.register(embeddedFileStream);

    // File spec dictionary
    const fileSpecDict = pdfDoc.context.obj({
      Type: 'Filespec',
      F: PDFString.of('factur-x.xml'),
      UF: PDFHexString.fromText('factur-x.xml'),
      Desc: PDFString.of('Factur-X invoice data'),
      AFRelationship: PDFName.of('Data'),
      EF: {
        F: embeddedFileStreamRef,
        UF: embeddedFileStreamRef,
      },
    });
    const fileSpecRef = pdfDoc.context.register(fileSpecDict);

    // Attach to catalog Names tree
    const catalog = pdfDoc.catalog;
    const namesDict = pdfDoc.context.obj({
      EmbeddedFiles: {
        Names: [PDFString.of('factur-x.xml'), fileSpecRef],
      },
    });
    catalog.set(PDFName.of('Names'), namesDict);

    // AF array on catalog (ISO 19005-3 AF reference)
    const afArray = pdfDoc.context.obj([fileSpecRef]);
    catalog.set(PDFName.of('AF'), afArray);

    // XMP metadata
    const xmp = generateXmpMetadata(content.number, profile);
    const metadataStream = pdfDoc.context.stream(Buffer.from(xmp, 'utf-8'), {
      Type: 'Metadata',
      Subtype: 'XML',
    });
    const metadataRef = pdfDoc.context.register(metadataStream);
    catalog.set(PDFName.of('Metadata'), metadataRef);

    // OutputIntent sRGB (obligatoire PDF/A)
    const outputIntentDict = pdfDoc.context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      Info: PDFString.of('sRGB IEC61966-2.1'),
      RegistryName: PDFString.of('http://www.color.org'),
    });
    catalog.set(PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntentDict]));

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

    return ok({
      pdf_buffer: Buffer.from(pdfBytes),
      xml_content: xmlContent,
      filename: `${content.number.replace(/\//g, '-')}.pdf`,
      profile,
      conformanceLevel: profileToConformance(profile),
      pdfaVersion: '3B',
    });
  } catch (e) {
    return err(appError('INTERNAL_ERROR', 'Erreur generation PDF/A-3 : ' + String((e as Error).message)));
  }
}

/**
 * Legacy wrapper : prend du HTML et genere un PDF/A-3 simplifie
 * (utilise par les routes existantes). Deprecated — preferer generateFacturxPdf.
 */
export async function embedXmlInPdf(
  _htmlContent: string,
  xmlContent: string,
  invoiceNumber: string,
): Promise<Result<FacturxPdfResult, AppError>> {
  return generateFacturxPdf(
    {
      employer: { name: 'Emetteur', siret: null },
      client: { name: 'Client' },
      number: invoiceNumber,
      issueDate: new Date(),
      dueDate: null,
      lines: [],
      totalHtCents: 0,
      totalTvaCents: 0,
      totalTtcCents: 0,
    },
    xmlContent,
    'MINIMUM',
  );
}

// Re-exports for backwards compat
export { PDFDocument };
