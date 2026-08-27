import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardStats {
  camerasOnline?: number;
  camerasTotal?: number;
  activeAlerts?: number;
  detectionsToday?: number;
}

interface AlertRecord {
  id: string;
  title: string;
  severity: string;
  status: string;
  timestamp: string;
  description?: string;
  classroomName?: string;
}

interface EvidenceFrame {
  id: string;
  cameraName: string;
  timestamp: string;
  imageUrl?: string;
  detections?: string;
}

function formatDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(10, 14, 20);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(232, 236, 242);
  doc.setFontSize(16);
  doc.text('ClassroomGuard', 14, 12);

  doc.setFontSize(9);
  doc.setTextColor(139, 149, 168);
  doc.text(title, 14, 20);
  doc.text(`Generated: ${formatDate()}`, pageWidth - 14, 20, { align: 'right' });

  doc.setDrawColor(30, 39, 56);
  doc.line(0, 28, pageWidth, 28);

  return 36;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 120);
    doc.text(`ClassroomGuard Report — Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
}

export async function exportDashboardReport(stats: DashboardStats, alerts: AlertRecord[]): Promise<void> {
  const doc = new jsPDF();

  let y = addHeader(doc, 'Dashboard Report');

  // Summary section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('System Summary', 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Cameras Online', `${stats.camerasOnline ?? 0} / ${stats.camerasTotal ?? 0}`],
      ['Active Alerts', `${stats.activeAlerts ?? 0}`],
      ['Detections Today', `${stats.detectionsToday ?? 0}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // Alerts table
  if (alerts.length > 0) {
    doc.setFontSize(12);
    doc.text('Recent Alerts', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Title', 'Severity', 'Status', 'Time', 'Classroom']],
      body: alerts.slice(0, 20).map((a) => [
        a.title,
        a.severity,
        a.status,
        formatTime(a.timestamp),
        a.classroomName ?? '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  doc.save('classroomguard-dashboard-report.pdf');
}

export async function exportAlertReport(alerts: AlertRecord[]): Promise<void> {
  const doc = new jsPDF();

  let y = addHeader(doc, 'Alert Report');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(`All Alerts (${alerts.length} total)`, 14, y);
  y += 8;

  if (alerts.length === 0) {
    doc.setFontSize(10);
    doc.text('No alerts to report.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Title', 'Severity', 'Status', 'Time', 'Classroom', 'Description']],
      body: alerts.map((a) => [
        a.title,
        a.severity,
        a.status,
        formatTime(a.timestamp),
        a.classroomName ?? '—',
        (a.description ?? '').slice(0, 80),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 5: { cellWidth: 40 } },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  doc.save('classroomguard-alerts-report.pdf');
}

export async function exportEvidenceReport(frames: EvidenceFrame[]): Promise<void> {
  const doc = new jsPDF();

  let y = addHeader(doc, 'Evidence Report');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(`Evidence Items (${frames.length} total)`, 14, y);
  y += 8;

  if (frames.length === 0) {
    doc.setFontSize(10);
    doc.text('No evidence items to report.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['ID', 'Camera', 'Time', 'Detections']],
      body: frames.map((f) => [
        f.id.slice(0, 8),
        f.cameraName,
        formatTime(f.timestamp),
        f.detections ?? '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  doc.save('classroomguard-evidence-report.pdf');
}
