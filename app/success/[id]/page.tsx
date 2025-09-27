// app/success/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { kvGet } from "@/lib/kv";
import dayjs from "dayjs";
import QRCodeGenerator from "@/components/QRCodeGenerator";

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
  metadata?: {
    userAgent?: string;
    ip?: string;
    timestamp: string;
  };
}

interface SuccessPageProps {
  params: { id: string };
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { id } = await params;

  // Validate ID format
  if (!id || !isValidUUID(id)) {
    notFound();
  }

  // Fetch submission to verify it exists
  let submission: Submission | null = null;
  try {
    submission = await kvGet<Submission>(`guest:${id}`);
  } catch (error) {
    console.error("Error fetching submission:", error);
  }

  if (!submission) {
    notFound();
  }

  const { data, createdAt } = submission;
  const checkInDate = dayjs(data.checkIn);
  const checkOutDate = dayjs(data.checkOut);
  const submissionDate = dayjs(createdAt);
  const pdfUrl = `/api/pdf/${id}`;
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + pdfUrl : pdfUrl;

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Complete!</h1>
          <p className="text-lg text-gray-600">
            Thank you, {data.fullName}. Your guest registration has been successfully submitted.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Registration Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Registration Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Submission ID:</span>
                  <div className="font-mono text-gray-900 break-all">{id}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Submitted:</span>
                  <div className="text-gray-900">{submissionDate.format("MMMM D, YYYY [at] h:mm A")}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Check-in:</span>
                  <div className="text-gray-900">{checkInDate.format("MMMM D, YYYY [at] h:mm A")}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Check-out:</span>
                  <div className="text-gray-900">{checkOutDate.format("MMMM D, YYYY [at] h:mm A")}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Guests:</span>
                  <div className="text-gray-900">{data.guests} {data.guests === 1 ? 'person' : 'people'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <div className="text-gray-900">{checkOutDate.diff(checkInDate, 'day')} nights</div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Important Information</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Please download and save your registration PDF for your records</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Bring a digital or printed copy of your registration to check-in</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Your information is securely stored in compliance with POPIA and Immigration Act requirements</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>If you need to make changes, please contact us directly</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Download Your Registration PDF</h4>
                    <p className="text-sm text-gray-600">Save a copy for your records and bring it to check-in</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Arrive at Your Check-in Time</h4>
                    <p className="text-sm text-gray-600">Please arrive promptly at {checkInDate.format("h:mm A")} on {checkInDate.format("MMMM D, YYYY")}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-semibold text-purple-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Enjoy Your Stay</h4>
                    <p className="text-sm text-gray-600">Everything is ready for your arrival. Contact us if you need assistance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* PDF Download */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Registration</h3>
              
              <div className="space-y-4">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    View / Download PDF
                  </div>
                </a>
                
                <p className="text-xs text-gray-500 text-center">
                  Opens in new tab • Recommended for mobile users
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>
              
              <div className="text-center">
                <div className="inline-block bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeGenerator 
                    value={currentUrl} 
                    size={120}
                    title="Scan to download PDF"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Scan with your phone to download the PDF
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <div className="text-blue-600">
                    <a href="mailto:guest@yourhost.com" className="hover:underline">
                      guest@yourhost.com
                    </a>
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <div className="text-blue-600">
                    <a href="tel:+27123456789" className="hover:underline">
                      +27 12 345 6789
                    </a>
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">WhatsApp:</span>
                  <div className="text-green-600">
                    <a href="https://wa.me/27123456789" target="_blank" rel="noreferrer" className="hover:underline">
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-3">
              <Link 
                href="/"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg text-center transition-colors"
              >
                ← Back to Home
              </Link>
              
              <button
                onClick={() => window.print()}
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg text-center transition-colors"
              >
                Print This Page
              </button>
            </div>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <h4 className="font-semibold text-gray-900 mb-2">Data Protection & Legal Compliance</h4>
            <p className="text-sm text-gray-600 max-w-3xl mx-auto">
              Your registration information is stored securely in compliance with the Protection of Personal Information Act (POPIA) 
              and Immigration Act 13 of 2002. We retain guest records for the legally required period and may disclose information 
              to authorities when lawfully required. Your data is encrypted and access is strictly controlled.
            </p>
            
            <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-500">
              <span>Submission ID: {id.split('-')[0]}...</span>
              <span>•</span>
              <span>Secure Storage</span>
              <span>•</span>
              <span>POPIA Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}