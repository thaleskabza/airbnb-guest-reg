// app/register/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import SignatureCanvas from "@/components/SignatureCanvas";
import FileImagePreview from "@/components/FileImagePreview";

// Enhanced form schema matching server-side validation
const FormSchema = z.object({
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
    .max(100, "Email must be less than 100 characters"),
  
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
  
  // Documents
  selfie: z.string().min(10, "Selfie is required"),
  idImage: z.string().min(10, "ID/Passport image is required"),
  signature: z.string().min(10, "Digital signature is required"),
  
  // Consents
  popiaConsent: z.literal(true, {
    errorMap: () => ({ message: "POPIA consent is required" })
  }),
  nonRefundAck: z.literal(true, {
    errorMap: () => ({ message: "Non-refund policy acknowledgment is required" })
  }),
})
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
  return diffDays <= 365;
}, {
  message: "Stay duration cannot exceed 365 days",
  path: ["checkOut"]
});

type FormData = z.infer<typeof FormSchema>;

interface ValidationError {
  field: string;
  message: string;
}

interface SubmissionResponse {
  success?: boolean;
  id?: string;
  message?: string;
  error?: string;
  details?: ValidationError[];
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<Partial<FormData>>({
    guests: 1,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  // Form completion progress
  const requiredFields = [
    'fullName', 'idOrPassport', 'nationality', 'residenceStatus', 'homeAddress',
    'phone', 'email', 'checkIn', 'checkOut', 'guests', 'selfie', 'idImage', 
    'signature', 'popiaConsent', 'nonRefundAck'
  ];
  
  const completedFields = requiredFields.filter(field => {
    const value = formData[field as keyof FormData];
    return value !== undefined && value !== '' && value !== false;
  });
  
  const progressPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

  // Update form field
  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear field error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  // Mark field as touched
  const touchField = useCallback((fieldName: string) => {
    setFieldTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Real-time validation for touched fields
  useEffect(() => {
    const validateField = async () => {
      const touchedFieldNames = Object.keys(fieldTouched).filter(field => fieldTouched[field]);
      if (touchedFieldNames.length === 0) return;

      try {
        FormSchema.parse(formData);
        // If validation passes, clear all errors
        setErrors({});
      } catch (error) {
        if (error instanceof z.ZodError) {
          const newErrors: Record<string, string> = {};
          
          error.errors.forEach(err => {
            const fieldName = err.path.join('.');
            if (fieldTouched[fieldName]) {
              newErrors[fieldName] = err.message;
            }
          });
          
          setErrors(newErrors);
        }
      }
    };

    const timeoutId = setTimeout(validateField, 300); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [formData, fieldTouched]);

  // Submit form
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Validate entire form
      const validatedData = FormSchema.parse(formData);
      
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData)
      });
      
      const result: SubmissionResponse = await response.json();
      
      if (!response.ok) {
        if (result.details) {
          // Handle field-specific validation errors
          const fieldErrors: Record<string, string> = {};
          result.details.forEach(error => {
            fieldErrors[error.field] = error.message;
          });
          setErrors(fieldErrors);
        }
        
        throw new Error(result.error || result.message || "Submission failed");
      }
      
      // Success - redirect to success page
      if (result.id) {
        window.location.href = `/success/${result.id}`;
      } else {
        throw new Error("No submission ID received");
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle client-side validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const fieldName = err.path.join('.');
          fieldErrors[fieldName] = err.message;
        });
        setErrors(fieldErrors);
        setSubmitError("Please fix the errors above and try again");
      } else {
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : "Submission failed";
        setSubmitError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setFormData({ guests: 1 });
    setErrors({});
    setFieldTouched({});
    setSubmitError("");
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Guest Registration</h1>
          <p className="text-gray-600">
            Complete your check-in online. All fields marked with * are required.
          </p>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progressPercentage}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <form className="space-y-6">
          {/* Personal Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.fullName || ''}
                  onChange={e => setField("fullName", e.target.value)}
                  onBlur={() => touchField("fullName")}
                  placeholder="Enter your full legal name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID/Passport Number *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.idOrPassport ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.idOrPassport || ''}
                  onChange={e => setField("idOrPassport", e.target.value.toUpperCase())}
                  onBlur={() => touchField("idOrPassport")}
                  placeholder="e.g., 1234567890123 or A12345678"
                />
                {errors.idOrPassport && (
                  <p className="mt-1 text-sm text-red-600">{errors.idOrPassport}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nationality ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.nationality || ''}
                  onChange={e => setField("nationality", e.target.value)}
                  onBlur={() => touchField("nationality")}
                  placeholder="e.g., South African, British, German"
                />
                {errors.nationality && (
                  <p className="mt-1 text-sm text-red-600">{errors.nationality}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residence/Visa Status *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.residenceStatus ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.residenceStatus || ''}
                  onChange={e => setField("residenceStatus", e.target.value)}
                  onBlur={() => touchField("residenceStatus")}
                  placeholder="Citizen / Tourist Visa / Work Permit"
                />
                {errors.residenceStatus && (
                  <p className="mt-1 text-sm text-red-600">{errors.residenceStatus}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Address *
              </label>
              <textarea
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.homeAddress ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.homeAddress || ''}
                onChange={e => setField("homeAddress", e.target.value)}
                onBlur={() => touchField("homeAddress")}
                placeholder="Enter your complete home address including city and country"
              />
              {errors.homeAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.homeAddress}</p>
              )}
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.phone || ''}
                  onChange={e => setField("phone", e.target.value)}
                  onBlur={() => touchField("phone")}
                  placeholder="+27 12 345 6789"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.email || ''}
                  onChange={e => setField("email", e.target.value.toLowerCase())}
                  onBlur={() => touchField("email")}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>
          </section>

          {/* Stay Details */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Accommodation Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date & Time *
                </label>
                <input
                  type="datetime-local"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.checkIn ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.checkIn || ''}
                  onChange={e => setField("checkIn", e.target.value)}
                  onBlur={() => touchField("checkIn")}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.checkIn && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkIn}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date & Time *
                </label>
                <input
                  type="datetime-local"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.checkOut ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.checkOut || ''}
                  onChange={e => setField("checkOut", e.target.value)}
                  onBlur={() => touchField("checkOut")}
                  min={formData.checkIn || new Date().toISOString().slice(0, 16)}
                />
                {errors.checkOut && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkOut}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.guests ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.guests || 1}
                  onChange={e => setField("guests", parseInt(e.target.value) || 1)}
                  onBlur={() => touchField("guests")}
                />
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-600">{errors.guests}</p>
                )}
              </div>
            </div>
          </section>

          {/* Document Uploads */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
            
            <div className="space-y-4">
              <div>
                <FileImagePreview 
                  label="Upload Selfie Photo *" 
                  onEncoded={(s) => setField("selfie", s)} 
                  capture="user"
                  error={errors.selfie}
                />
              </div>

              <div>
                <FileImagePreview 
                  label="Upload ID/Passport (front page) *" 
                  onEncoded={(s) => setField("idImage", s)} 
                  capture="environment"
                  error={errors.idImage}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digital Signature *
                </label>
                <SignatureCanvas 
                  onChange={(sig) => setField("signature", sig)}
                  error={errors.signature}
                />
                {errors.signature && (
                  <p className="mt-1 text-sm text-red-600">{errors.signature}</p>
                )}
              </div>
            </div>
          </section>

          {/* Consents */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Consent & Acknowledgments</h2>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-md border ${errors.popiaConsent ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.popiaConsent || false}
                    onChange={e => setField("popiaConsent", e.target.checked)}
                    onBlur={() => touchField("popiaConsent")}
                  />
                  <span className="text-sm text-gray-700">
                    <strong>POPIA Consent:</strong> I consent to the processing of my personal information in compliance with the Protection of Personal Information Act (POPIA) and acknowledge that it may be shared with authorities under the Immigration Act if lawfully required.
                  </span>
                </label>
                {errors.popiaConsent && (
                  <p className="mt-2 text-sm text-red-600">{errors.popiaConsent}</p>
                )}
              </div>

              <div className={`p-4 rounded-md border ${errors.nonRefundAck ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.nonRefundAck || false}
                    onChange={e => setField("nonRefundAck", e.target.checked)}
                    onBlur={() => touchField("nonRefundAck")}
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Non-Refund Policy:</strong> I acknowledge and accept the strict Non-Refund Policy and confirm the check-in/check-out dates and times as stated in my booking confirmation.
                  </span>
                </label>
                {errors.nonRefundAck && (
                  <p className="mt-2 text-sm text-red-600">{errors.nonRefundAck}</p>
                )}
              </div>
            </div>
          </section>

          {/* Error Display */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {submitError}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || progressPercentage < 100}
              className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors ${
                isSubmitting || progressPercentage < 100
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Registration...
                </span>
              ) : (
                `Submit Registration (${progressPercentage}%)`
              )}
            </button>

            <button
              type="button"
              onClick={clearForm}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear Form
            </button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>

          {/* Legal Notice */}
          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Legal Notice:</strong> Your submission creates a digital entry in our guest register as required by the Immigration Act 13 of 2002. We retain records for the legally required period and secure them in compliance with POPIA. By submitting this form, you confirm that all information provided is accurate and complete.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}