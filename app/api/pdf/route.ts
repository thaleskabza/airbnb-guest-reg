// app/api/pdf/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { kvGet } from "@/lib/kv";
import dayjs from "dayjs";

// Type definitions
interface RegistrationData {
  fullName: string;
  idOrPassport: string;
  nationality: string;
  residenceStatus: string;
  homeAddress: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  selfie: string;
  idImage: string;
  signature: string;
  popiaConsent: boolean;
  nonRefundAck: boolean;
}

interface Submission {
  id: string;
  createdAt: number;
  data: RegistrationData;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format (basic UUID validation)
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Fetch submission
    const submission = await kvGet<Submission>(`guest:${id}`);
    if (!submission) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const { data: d, createdAt } = submission;

    // Create PDF
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Guest Registration - ${d.fullName}`);
    pdf.setSubject("Guest Registration & Agreement");
    pdf.setKeywords(["guest", "registration", "accommodation", "south africa"]);
    pdf.setProducer("Guest Registration System");
    pdf.setCreator("Guest Registration System");

    let currentPage = pdf.addPage(PageSizes.A4);
    const { width, height } = currentPage.getSize();
    const margin = 50;
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = height - margin;

    const drawText = (
      text: string, 
      x: number, 
      yPos: number, 
      size = 10, 
      useFont = font,
      maxWidth?: number
    ) => {
      if (maxWidth) {
        // Simple text wrapping
        const words = text.split(' ');
        let line = '';
        let currentY = yPos;
        
        for (const word of words) {
          const testLine = line + (line ? ' ' : '') + word;
          const textWidth = useFont.widthOfTextAtSize(testLine, size);
          
          if (textWidth > maxWidth && line) {
            currentPage.drawText(line, { x, y: currentY, size, font: useFont, color: rgb(0, 0, 0) });
            line = word;
            currentY -= size + 2;
          } else {
            line = testLine;
          }
        }
        
        if (line) {
          currentPage.drawText(line, { x, y: currentY, size, font: useFont, color: rgb(0, 0, 0) });
        }
        
        return currentY;
      } else {
        currentPage.drawText(text, { x, y: yPos, size, font: useFont, color: rgb(0, 0, 0) });
        return yPos;
      }
    };

    const checkPageSpace = (requiredSpace: number) => {
      if (y - requiredSpace < margin) {
        currentPage = pdf.addPage(PageSizes.A4);
        y = height - margin;
      }
    };

    // Header
    drawText("Guest Registration & Agreement", margin, y, 16, boldFont);
    y -= 20;
    drawText("Republic of South Africa", margin, y, 12, boldFont);
    y -= 25;

    // Submission details
    drawText(`Submission ID: ${id}`, margin, y, 9);
    y -= 12;
    drawText(`Generated: ${dayjs(createdAt).format("YYYY-MM-DD HH:mm:ss")}`, margin, y, 9);
    y -= 12;
    drawText("Host: [Your Business Name]", margin, y, 9);
    y -= 12;
    drawText("Address: [Your Business Address]", margin, y, 9);
    y -= 20;

    // Legal notice
    const legalText = "This record is maintained in compliance with the Immigration Act 13 of 2002 and the Protection of Personal Information Act (POPIA). Personal information may be disclosed to authorities when lawfully required.";
    y = drawText(legalText, margin, y, 9, font, width - 2 * margin);
    y -= 25;

    // Guest information section
    drawText("GUEST INFORMATION", margin, y, 12, boldFont);
    y -= 20;

    const addField = (label: string, value: string) => {
      checkPageSpace(30);
      drawText(`${label}:`, margin, y, 10, boldFont);
      drawText(value, margin + 120, y, 10, font, width - margin - 120 - margin);
      y -= 16;
    };

    addField("Full Name", d.fullName);
    addField("ID/Passport Number", d.idOrPassport);
    addField("Nationality", d.nationality);
    addField("Residence Status", d.residenceStatus);
    addField("Home Address", d.homeAddress);
    addField("Phone Number", d.phone);
    addField("Email Address", d.email);
    
    y -= 10;
    drawText("ACCOMMODATION DETAILS", margin, y, 12, boldFont);
    y -= 20;
    
    addField("Check-in", dayjs(d.checkIn).format("YYYY-MM-DD HH:mm"));
    addField("Check-out", dayjs(d.checkOut).format("YYYY-MM-DD HH:mm"));
    addField("Number of Guests", d.guests.toString());

    y -= 15;

    // Consents section
    drawText("CONSENTS & ACKNOWLEDGMENTS", margin, y, 12, boldFont);
    y -= 20;
    
    drawText("✓ POPIA Consent: Granted", margin, y, 10);
    y -= 14;
    drawText("✓ Non-Refund Policy: Acknowledged", margin, y, 10);
    y -= 25;

    // Images section
    const placeImage = async (dataUrl: string, label: string) => {
      if (!dataUrl) return;
      
      try {
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error("Invalid image data");
        
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        let img;
        
        if (dataUrl.startsWith("data:image/png")) {
          img = await pdf.embedPng(bytes);
        } else if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
          img = await pdf.embedJpg(bytes);
        } else {
          console.warn(`Unsupported image format for ${label}`);
          return;
        }

        const maxWidth = 200;
        const maxHeight = 150;
        const imgAspect = img.width / img.height;
        
        let imgWidth = maxWidth;
        let imgHeight = maxWidth / imgAspect;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight * imgAspect;
        }

        checkPageSpace(imgHeight + 40);
        
        drawText(`${label}:`, margin, y, 10, boldFont);
        y -= 15;
        
        currentPage.drawImage(img, {
          x: margin,
          y: y - imgHeight,
          width: imgWidth,
          height: imgHeight,
        });
        
        y -= imgHeight + 20;
        
      } catch (error) {
        console.error(`Error processing ${label} image:`, error);
        drawText(`${label}: [Image processing failed]`, margin, y, 10);
        y -= 20;
      }
    };

    drawText("UPLOADED DOCUMENTS", margin, y, 12, boldFont);
    y -= 25;

    await placeImage(d.selfie, "Selfie Photo");
    await placeImage(d.idImage, "ID/Passport Document");
    await placeImage(d.signature, "Digital Signature");

    // Footer
    checkPageSpace(50);
    y -= 20;
    drawText("--- End of Registration ---", margin, y, 9, font);
    y -= 15;
    drawText(`Document generated on ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`, margin, y, 8, font);

    // Generate PDF bytes
    const pdfBytes = await pdf.save();

    // Return PDF response
    return new Response(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="guest-registration-${id}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}