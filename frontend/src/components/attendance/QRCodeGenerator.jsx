import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const qrRef = useRef(null);

  const baseUrl = window.location.origin;
  const dateStr = getDateFormatted(sessionDate);
  const checkinUrl = `${baseUrl}/checkin/${batchId}/${sessionNo}/${dateStr}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}`;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>QR কোড - ${batchName}</title>
        <style>
          body { text-align: center; font-family: sans-serif; padding: 40px; }
          .qr-img { width: 300px; height: 300px; margin: 20px auto; }
          .info { margin-top: 20px; font-size: 16px; }
          .info strong { display: block; margin: 4px 0; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>উপস্থিতি QR কোড</h2>
        <img class="qr-img" src="${qrApiUrl}" alt="QR Code" />
        <div class="info">
          <strong>${batchName || `ব্যাচ #${batchId}`}</strong>
          <strong>সেশন ${sessionNo}</strong>
          <strong>তারিখ: ${sessionDate}</strong>
        </div>
        <div class="no-print" style="margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px;">প্রিন্ট করুন</button>
        </div>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content" ref={qrRef}>
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-qr-code me-2"></i>QR কোড
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <img
              src={qrApiUrl}
              alt={`QR for session ${sessionNo}`}
              className="img-fluid mb-3"
              style={{ maxWidth: 280 }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {!qrApiUrl && (
              <div className="alert alert-info">
                QR কোড জেনারেট করতে ব্যর্থ
              </div>
            )}
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
              <a
                href={qrApiUrl}
                download={`qr-session-${sessionNo}-${getDateFormatted(sessionDate)}.png`}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-download me-1"></i>ডাউনলোড করুন
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
