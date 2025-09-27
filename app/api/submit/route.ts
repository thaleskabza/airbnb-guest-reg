// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { kvGet, kvSet } from "@/lib/kv";
import { headers } from "next/headers";

// Enhanced validation schema
const RegistrationSchema = z.object({
  // Personal Information
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Full name contains invalid characters"),
  
  idOrPassport: z.string()
    .min(4, "ID/Passport must be at least 4 characters")
    .max(20, "ID/Passport must be less than 20 characters")
    .regex(/^[a-zA-Z0-9\-]+$/, "ID/Passport contains invalid characters"),
  
  nationality: z.string()
    .min(2, "Nationality must be at least 2 characters")
    .max(50, "Nationality must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Nationality contains invalid characters"),
  
  residenceStatus: z.string()
    .min(2, "Residence status must be at least 2 characters")
    .max(100, "Residence status must be less than 100 characters"),
  
  homeAddress: z.string()
    .min(5, "Home address must be at least 5 characters")
    .max(300, "Home address must be less than 300 characters"),
  
  // Contact Information
  phone: z.string()
    .min(6, "Phone number must be at least 6 characters")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\+]?[\d\s\-\(\)]+$/, "Invalid phone number format"),
  
  email: z.string()
    .email("Invalid email address")
    .max(100, "Email must be less than 100 characters")
    .toLowerCase(),
  
  // Stay Details
  checkIn: z.string()
    .min(4, "Check-in date is required")
    .refine((date) => {
      const checkInDate = new Date(date);
      const now = new Date();
      return checkInDate > now;
    }, "Check-in date must be in the future"),
  
  checkOut: z.string()
    .min(4, "Check-out date is required"),
  
  guests: z.number()
    .int("Number of guests must be a whole number")
    .min(1, "At least 1 guest is required")
    .max(20, "Maximum 20 guests allowed"),
  
  // Image/Document uploads (base64 validation)
  selfie: z.string()
    .min(10, "Selfie is required")
    .refine((data) => {
      try {
        if (!data.startsWith('data:image/')) return false;
        const base64 = data.split(',')[1];
        if (!base64) return false;
        
        // Estimate file size (base64 is ~1.37x larger than binary)
        const sizeInBytes = (base64.length * 3) / 4;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        return sizeInBytes <= maxSize;
      } catch {
        return false;
      }
    }, "Invalid selfie image or file too large (max 5MB)"),
  
  idImage: z.string()
    .min(10, "ID/Passport image is required")
    .refine((data) => {
      try {
        if (!data.startsWith('data:image/')) return false;
        const base64 = data.split(',')[1];
        if (!base64) return false;
        
        const sizeInBytes = (base64.length * 3) / 4;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        return sizeInBytes <= maxSize;
      } catch {
        return false;
      }
    }, "Invalid ID/Passport image or file too large (max 5MB)"),
  
  signature: z.string()
    .min(10, "Digital signature is required")
    .refine((data) => {
      try {
        if (!data.startsWith('data:image/')) return false;
        const base64 = data.split(',')[1];
        if (!base64) return false;
        
        const sizeInBytes = (base64.length * 3) / 4;
        const maxSize = 1 * 1024 * 1024; // 1MB for signatures
        
        return sizeInBytes <= maxSize;
      } catch {
        return false;
      }
    }, "Invalid signature or file too large (max 1MB)"),
  
  // Consent checkboxes
  popiaConsent: z.literal(true, {
    errorMap: () => ({ message: "POPIA consent is required" })
  }),
  
  nonRefundAck: z.literal(true, {
    errorMap: () => ({ message: "Non-refund policy acknowledgment is required" })
  }),
})
// Cross-field validation
.refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOut"]
})
.refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 365; // Maximum 1 year stay
}, {
  message: "Stay duration cannot exceed 365 days",
  path: ["checkOut"]
});

// Type for validated data
type RegistrationData = z.infer<typeof RegistrationSchema>;

interface SubmissionRecord {
  id: string;
  createdAt: number;
  data: RegistrationData;
  metadata: {
    userAgent?: string;
    ip?: string;
    timestamp: string;
  };
}

// Simple rate limiting using KV store
async function checkRateLimit(identifier: string): Promise<boolean> {
  const key = `rate_limit:${identifier}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 3; // 3 submissions per 15 minutes
  
  try {
    const record = await kvGet<{ count: number; resetTime: number }>(key);
    const now = Date.now();
    
    if (!record || now > record.resetTime) {
      // Create new window
      await kvSet(key, { count: 1, resetTime: now + windowMs }, { ex: Math.floor(windowMs / 1000) });
      return true;
    }
    
    if (record.count >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    // Increment counter
    await kvSet(key, { count: record.count + 1, resetTime: record.resetTime }, { ex: Math.floor((record.resetTime - now) / 1000) });
    return true;
  } catch (error) {
    console.error("Rate limiting error:", error);
    return true; // Allow if rate limiting fails
  }
}

// Security: Check for potential spam patterns
function detectSpamPatterns(data: RegistrationData): boolean {
  const text = `${data.fullName} ${data.email} ${data.homeAddress}`.toLowerCase();
  
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /(test|fake|spam|dummy)\d*@/i, // Test emails
    /^\s*$/, // Empty content
    /\b(viagra|casino|lottery|winner|congratulations|urgent|click here)\b/i,
  ];
  
  return spamPatterns.some(pattern => pattern.test(text));
}

export async function POST(request: NextRequest) {
  try {
    // Get client information for rate limiting and logging
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : headersList.get("x-real-ip") || "unknown";
    
    // Rate limiting based on IP
    const rateLimitPassed = await checkRateLimit(ip);
    if (!rateLimitPassed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "Too many submissions. Please try again in 15 minutes." 
        },
        { status: 429 }
      );
    }
    
    // Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    // Validate input data
    let validatedData: RegistrationData;
    try {
      validatedData = RegistrationSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return NextResponse.json(
          { 
            error: "Validation failed", 
            details: errorMessages 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Validation error" },
        { status: 400 }
      );
    }
    
    // Check for spam patterns
    if (detectSpamPatterns(validatedData)) {
      console.warn("Spam pattern detected:", { ip, email: validatedData.email });
      return NextResponse.json(
        { error: "Submission rejected" },
        { status: 400 }
      );
    }
    
    // Generate unique ID
    const submissionId = crypto.randomUUID();
    
    // Create submission record
    const submission: SubmissionRecord = {
      id: submissionId,
      createdAt: Date.now(),
      data: validatedData,
      metadata: {
        userAgent,
        ip,
        timestamp: new Date().toISOString()
      }
    };
    
    // Store in KV with expiration (e.g., 7 years for legal compliance)
    const expirationSeconds = 7 * 365 * 24 * 60 * 60; // 7 years
    await kvSet(`guest:${submissionId}`, submission, { ex: expirationSeconds });
    
    // Log successful submission (remove sensitive data)
    console.log("Guest registration submitted:", {
      id: submissionId,
      email: validatedData.email,
      checkIn: validatedData.checkIn,
      guests: validatedData.guests,
      ip,
      timestamp: submission.metadata.timestamp
    });
    
    // Return success response
    return NextResponse.json(
      { 
        success: true,
        id: submissionId,
        message: "Registration submitted successfully"
      },
      { 
        status: 201,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block"
        }
      }
    );
    
  } catch (error) {
    console.error("Submission error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to process registration. Please try again."
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}