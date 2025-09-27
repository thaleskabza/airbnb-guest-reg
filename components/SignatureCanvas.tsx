// components/SignatureCanvas.tsx
"use client";
import { useRef, useEffect, useState } from "react";

interface SignatureCanvasProps {
  onChange: (signature: string) => void;
  error?: string;
  width?: number;
  height?: number;
}

export default function SignatureCanvas({ 
  onChange, 
  error, 
  width = 400, 
  height = 200 
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const context = canvas.getContext('2d');
    if (context) {
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    
    // Capture signature data
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      onChange(dataURL);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (context) {
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      // Fill with white background
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    setHasSignature(false);
    onChange(''); // Clear the signature data
  };

  return (
    <div className="signature-container">
      <div className="signature-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className={`signature-canvas border-2 border-dashed ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-lg cursor-crosshair touch-none`}
          style={{ 
            width: '100%', 
            maxWidth: `${width}px`, 
            height: 'auto',
            aspectRatio: `${width} / ${height}`,
            background: '#ffffff'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="signature-controls mt-2 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {hasSignature ? 'Signature captured' : 'Sign above with your finger or mouse'}
          </span>
          
          <button
            type="button"
            onClick={clearSignature}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {!hasSignature && (
        <p className="mt-1 text-xs text-gray-500">
          Touch and drag to create your signature. Works on mobile and desktop.
        </p>
      )}
    </div>
  );
}