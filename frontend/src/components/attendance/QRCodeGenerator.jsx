import React, { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { escapeHtml } from '../../utils/escapeHtml';

function getDateFormatted(d) {
  if (!d) return '';
  return d.replace(/-/g, '');
}

export default function QRCodeGenerator({
  batchId,
  sessionNo,
  sessionDate,
  batchName,
  onClose,
}) {
  const qrRef = useRef(null);

  const baseUrl = window.location.origin;
  const dateStr = getDateFormatted(sessionDate);
  const checkinUrl = `${baseUrl}/checkin/${batchId}/${sessionNo}/${dateStr}`;

  const handleDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 300, 300);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `qr-session-${sessionNo}-${dateStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }, [sessionNo, dateStr]);

  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank');
    if (!win) return;
    const svgEl = qrRef.current?.querySelector('svg');
    const svgData = svgEl ? svgEl.outerHTML : '';
    win.document.write(`
      <html>
      <head>
        <title>QR কোড - ${escapeHtml(batchName)}</title>
        <style>
          body { text-align: center; font-family: sans-serif; padding: 40px; }
          .qr-img { width: 300px; height: 300px; margin: 20px auto; }
          .info { margin-top: 20px; font-size: 16px; }
          .info strong { display: block; margin: 4px 0; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h2>উপস্থিতি QR কোড</h2>
        <div class="qr-img">${svgData}</div>
        <div class="info">
          <strong>${escapeHtml(batchName || `ব্যাচ #${batchId}`)}</strong>
          <strong>সেশন ${escapeHtml(String(sessionNo))}</strong>
          <strong>তারিখ: ${escapeHtml(sessionDate)}</strong>
        </div>
        <div class="no-print" style="margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px;">প্রিন্ট করুন</button>
        </div>
      </body>
      </html>
    `);
    win.document.close();
  }, [batchId, batchName, sessionNo, sessionDate]);

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-qr-code me-2"></i>QR কোড
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <div ref={qrRef} className="mb-3 d-flex justify-content-center">
              <QRCodeSVG value={checkinUrl} size={280} level="M" />
            </div>
            <div className="mb-2">
              <strong>{batchName || `ব্যাচ #${batchId}`}</strong>
            </div>
            <div>সেশন {sessionNo}</div>
            <div className="text-muted small">{sessionDate}</div>

            <hr />
            <div className="d-grid gap-2">
              <button className="btn btn-primary" onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i>প্রিন্ট করুন
              </button>
              <button className="btn btn-outline-secondary" onClick={handleDownload}>
                <i className="bi bi-download me-1"></i>ডাউনলোড করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
