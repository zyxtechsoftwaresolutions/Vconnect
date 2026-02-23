export interface CertificateData {
  studentName: string;
  registerId: string;
  department: string;
  studentClass: string;
  email: string;
  hodApproved: boolean;
  librarianApproved: boolean;
  accountantApproved: boolean;
  principalApproved: boolean;
  logoUrl?: string;
}

export function generateNoDueCertificateHTML(data: CertificateData): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const academicYear = today.getMonth() >= 5
    ? `${today.getFullYear()}-${(today.getFullYear() + 1).toString().slice(2)}`
    : `${today.getFullYear() - 1}-${today.getFullYear().toString().slice(2)}`;

  const refNo = `VIET/ND/${today.getFullYear()}/${String(Date.now()).slice(-5)}`;

  const approvalRow = (label: string, approved: boolean) => `
    <tr>
      <td style="padding:10px 14px;border:1px solid #bbb;font-size:13px;">${label}</td>
      <td style="padding:10px 14px;border:1px solid #bbb;text-align:center;">
        ${approved
          ? '<span style="color:#15803d;font-weight:700;">&#10003; Cleared</span>'
          : '<span style="color:#b91c1c;font-weight:700;">&#10007; Pending</span>'}
      </td>
      <td style="padding:10px 14px;border:1px solid #bbb;text-align:center;font-size:12px;color:#555;">
        ${approved ? dateStr : '&mdash;'}
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>No Due Certificate - ${data.studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Open+Sans:wght@400;600;700&display=swap');

    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#e8e8e8;font-family:'Open Sans',Arial,sans-serif;color:#222;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    .page{
      width:210mm;min-height:297mm;margin:20px auto;background:#fff;
      position:relative;overflow:hidden;
      box-shadow:0 4px 24px rgba(0,0,0,.12);
    }

    /* Ornamental border */
    .border-outer{
      position:absolute;inset:8mm;
      border:3px solid #1a237e;
      pointer-events:none;
    }
    .border-inner{
      position:absolute;inset:11mm;
      border:1.5px solid #c5a15a;
      pointer-events:none;
    }

    /* Corner ornaments */
    .corner{position:absolute;width:28px;height:28px;border-color:#c5a15a;border-style:solid}
    .corner-tl{top:10mm;left:10mm;border-width:3px 0 0 3px}
    .corner-tr{top:10mm;right:10mm;border-width:3px 3px 0 0}
    .corner-bl{bottom:10mm;left:10mm;border-width:0 0 3px 3px}
    .corner-br{bottom:10mm;right:10mm;border-width:0 3px 3px 0}

    .content{position:relative;z-index:1;padding:18mm 20mm 16mm}

    /* Header */
    .header{text-align:center;margin-bottom:6px}
    .logo{width:82px;height:auto;margin-bottom:6px}
    .college-name{
      font-family:'Merriweather',Georgia,serif;font-size:22px;font-weight:900;
      color:#1a237e;letter-spacing:.5px;line-height:1.3;
    }
    .college-sub{font-size:11px;color:#444;margin-top:2px;letter-spacing:.3px}
    .college-addr{font-size:10px;color:#777;margin-top:2px}
    .accreditation{
      display:inline-block;margin-top:6px;padding:3px 14px;
      font-size:9px;letter-spacing:1px;color:#1a237e;
      border:1px solid #c5a15a;border-radius:2px;text-transform:uppercase;
      background:#fdf8ee;
    }

    .divider{
      width:65%;margin:14px auto 18px;height:0;
      border-top:2px solid #1a237e;border-bottom:1px solid #c5a15a;
      padding-top:2px;
    }

    /* Title */
    .cert-title{
      font-family:'Merriweather',Georgia,serif;
      font-size:26px;font-weight:900;text-align:center;
      color:#1a237e;letter-spacing:2px;text-transform:uppercase;
      margin-bottom:4px;
    }
    .cert-subtitle{
      text-align:center;font-size:12px;color:#888;
      margin-bottom:18px;letter-spacing:.5px;
    }

    /* Reference & date row */
    .meta-row{
      display:flex;justify-content:space-between;
      font-size:11px;color:#555;margin-bottom:18px;
      padding:0 4px;
    }

    /* Student details table */
    .details-table{
      width:100%;border-collapse:collapse;margin-bottom:20px;
    }
    .details-table td{
      padding:7px 12px;font-size:13px;vertical-align:top;
    }
    .details-table .label{
      font-weight:700;color:#333;width:35%;
      border-bottom:1px dotted #ccc;
    }
    .details-table .value{
      color:#111;border-bottom:1px dotted #ccc;
    }

    /* Body text */
    .body-text{
      font-size:13.5px;line-height:1.75;margin-bottom:22px;
      text-align:justify;padding:0 4px;color:#222;
    }

    /* Approval table */
    .approval-table{
      width:100%;border-collapse:collapse;margin-bottom:28px;
    }
    .approval-table thead th{
      background:#1a237e;color:#fff;padding:10px 14px;
      font-size:12px;text-transform:uppercase;letter-spacing:.6px;
      border:1px solid #1a237e;
    }

    /* Signatures */
    .signatures{
      display:flex;justify-content:space-between;
      margin-top:40px;padding:0 10px;
    }
    .sig-block{text-align:center;min-width:120px}
    .sig-line{
      width:140px;border-top:1.5px solid #333;
      margin:0 auto 4px;
    }
    .sig-label{font-size:11px;font-weight:700;color:#333}
    .sig-role{font-size:9px;color:#888}

    /* Seal area */
    .seal{
      position:absolute;bottom:38mm;right:32mm;
      width:90px;height:90px;border:2px dashed #c5a15a;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:9px;color:#c5a15a;text-transform:uppercase;
      letter-spacing:1px;text-align:center;line-height:1.3;
      transform:rotate(-15deg);opacity:.7;
    }

    /* Footer */
    .footer{
      text-align:center;font-size:9px;color:#999;
      margin-top:30px;padding-top:10px;
      border-top:1px solid #ddd;
    }

    /* Watermark */
    .watermark{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);
      font-family:'Merriweather',serif;font-size:90px;font-weight:900;
      color:rgba(26,35,126,.035);white-space:nowrap;pointer-events:none;
      letter-spacing:8px;z-index:0;
    }

    @media print{
      body{background:#fff}
      .page{box-shadow:none;margin:0;width:100%;min-height:auto}
    }
  </style>
</head>
<body>

<div class="page">
  <!-- Decorative borders -->
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <!-- Watermark -->
  <div class="watermark">VIET</div>

  <div class="content">
    <!-- Header -->
    <div class="header">
      <img
        src="${data.logoUrl || '/viet-logo.png'}"
        class="logo"
        alt="VIET Logo"
      />
      <div class="college-name">Visakha Institute of Engineering &amp; Technology (A)</div>
      <div class="college-sub">Affiliated to JNTUGV, Vizianagaram &bull; Approved by AICTE, New Delhi</div>
      <div class="college-addr">Narava, Visakhapatnam &ndash; 530 027, Andhra Pradesh, India</div>
      <div class="accreditation">NAAC Accredited Institution</div>
    </div>

    <div class="divider"></div>

    <!-- Title -->
    <div class="cert-title">No Due Certificate</div>
    <div class="cert-subtitle">Academic Year ${academicYear}</div>

    <!-- Meta -->
    <div class="meta-row">
      <span><strong>Ref No:</strong> ${refNo}</span>
      <span><strong>Date:</strong> ${dateStr}</span>
    </div>

    <!-- Student details -->
    <table class="details-table">
      <tr><td class="label">Name of the Student</td><td class="value">${data.studentName || '&mdash;'}</td></tr>
      <tr><td class="label">Register Number</td><td class="value">${data.registerId || '&mdash;'}</td></tr>
      <tr><td class="label">Department</td><td class="value">${data.department || '&mdash;'}</td></tr>
      <tr><td class="label">Class / Section</td><td class="value">${data.studentClass || '&mdash;'}</td></tr>
      <tr><td class="label">Email Address</td><td class="value">${data.email || '&mdash;'}</td></tr>
    </table>

    <!-- Body -->
    <div class="body-text">
      This is to certify that <strong>${data.studentName || 'the above-mentioned student'}</strong>,
      bearing Register Number <strong>${data.registerId || '&mdash;'}</strong>,
      of the Department of <strong>${data.department || '&mdash;'}</strong>,
      has no pending dues or obligations with any of the following departments of the institution
      as on the date mentioned above.
    </div>

    <!-- Approvals table -->
    <table class="approval-table">
      <thead>
        <tr>
          <th style="text-align:left;">Department / Authority</th>
          <th>Status</th>
          <th>Date of Clearance</th>
        </tr>
      </thead>
      <tbody>
        ${approvalRow('Head of Department (HOD)', data.hodApproved)}
        ${approvalRow('Library', data.librarianApproved)}
        ${approvalRow('Accounts Section', data.accountantApproved)}
        ${approvalRow('Principal', data.principalApproved)}
      </tbody>
    </table>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Head of Department</div>
        <div class="sig-role">${data.department || ''}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Librarian</div>
        <div class="sig-role">Central Library</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Accounts Officer</div>
        <div class="sig-role">Finance Dept.</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Principal</div>
        <div class="sig-role">VIET</div>
      </div>
    </div>

    <!-- College seal placeholder -->
    <div class="seal">College<br/>Seal</div>

    <!-- Footer -->
    <div class="footer">
      This is a computer-generated document issued through the VIET V&ndash;Connect Portal.<br/>
      For verification, contact the Controller of Examinations, VIET, Narava, Visakhapatnam.
    </div>
  </div>
</div>

<script>
  window.onload = function(){ window.print(); };
</script>
</body>
</html>`;
}
