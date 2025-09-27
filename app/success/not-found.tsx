// app/success/[id]/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Registration Not Found</h1>
        <p className="text-lg text-gray-600 mb-8">
          The registration you're looking for doesn't exist or may have expired.
        </p>

        {/* Possible Reasons */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Possible reasons:</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>The registration ID is incorrect or incomplete</span>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>The registration has expired or been removed</span>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>You may have followed an old or broken link</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            href="/register"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Create New Registration
          </Link>
          
          <div className="text-gray-500">or</div>
          
          <Link
            href="/"
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Contact Information */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            If you believe this is an error, please contact us with your registration details.
          </p>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <a href="mailto:guest@yourhost.com" className="ml-2 text-blue-600 hover:underline">
                guest@yourhost.com
              </a>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <a href="tel:+27123456789" className="ml-2 text-blue-600 hover:underline">
                +27 12 345 6789
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}