// components/QRCodeGenerator.tsx
"use client";
import { useEffect, useRef } from "react";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  title?: string;
  className?: string;
}

export default function QRCodeGenerator({ 
  value, 
  size = 128, 
  title = "QR Code",
  className = ""
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Simple QR code generation using a free API service
    // For production, consider using a proper QR library like 'qrcode'
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Create QR code image using qr-server.com API (free service)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&ecc=M`;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      // Draw QR code
      ctx.drawImage(img, 0, 0, size, size);
    };
    
    img.onerror = () => {
      // Fallback: draw a simple placeholder
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, size, size);
      
      // Draw border
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
      
      // Draw text
      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.max(12, size / 10)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QR Code', size / 2, size / 2 - 10);
      ctx.fillText('Unavailable', size / 2, size / 2 + 10);
    };
    
    img.src = qrUrl;
  }, [value, size]);

  return (
    <div className={`inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        title={title}
        className="border border-gray-200 rounded"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}