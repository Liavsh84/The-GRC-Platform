import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── CSV Export ───────────────────────────────────────────────────────────────
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] == null ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ─── PDF Helpers ──────────────────────────────────────────────────────────────
const addHeader = (doc, title, subtitle) => {
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('The GRC Platform', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 26);
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
};

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}  —  The GRC Platform  —  Confidential`, 14, 290);
    doc.text(new Date().toLocaleDateString(), 180, 290);
  }
};

// ─── Governance PDF ───────────────────────────────────────────────────────────
export const exportGovernancePDF = (documents) => {
  const doc = new jsPDF();
  addHeader(doc, 'Governance Report', `Total documents: ${documents.length}`);

  const rows = documents.map(d => [
    d.title,
    d.type.charAt(0).toUpperCase() + d.type.slice(1),
    d.department,
    d.status.charAt(0).toUpperCase() + d.status.slice(1),
    `v${d.version}`,
    d.updatedAt,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Title', 'Type', 'Department', 'Status', 'Version', 'Last Updated']],
    body: rows,
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { cellPadding: 3 },
  });

  addFooter(doc);
  doc.save(`governance_report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Compliance PDF ───────────────────────────────────────────────────────────
export const exportCompliancePDF = (framework) => {
  const doc = new jsPDF();
  const total = framework.controls.length;
  const compliant = framework.controls.filter(c => c.status === 'compliant').length;
  const score = total ? Math.round((compliant / total) * 100) : 0;

  addHeader(doc, `Compliance Report — ${framework.name}`, `Overall Score: ${score}%  |  Controls: ${total}`);

  const rows = framework.controls.map(c => [
    c.controlId,
    c.title,
    c.status.charAt(0).toUpperCase() + c.status.slice(1),
    c.owner || '—',
    c.dueDate || '—',
    c.notes || '—',
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Control ID', 'Title', 'Status', 'Owner', 'Due Date', 'Notes']],
    body: rows,
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 5: { cellWidth: 50 } },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { cellPadding: 3, overflow: 'linebreak' },
    didParseCell: (data) => {
      if (data.column.index === 2) {
        const v = data.cell.raw;
        if (v === 'Compliant') data.cell.styles.textColor = [22, 163, 74];
        else if (v === 'Non-Compliant') data.cell.styles.textColor = [220, 38, 38];
        else if (v === 'Partial') data.cell.styles.textColor = [202, 138, 4];
      }
    },
  });

  addFooter(doc);
  doc.save(`compliance_${framework.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Risk Register PDF ────────────────────────────────────────────────────────
export const exportRiskPDF = (risks) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const critical = risks.filter(r => r.probability * r.impact >= 15).length;
  const high = risks.filter(r => { const s = r.probability * r.impact; return s >= 10 && s < 15; }).length;

  addHeader(doc, 'Risk Register Report', `Total Risks: ${risks.length}  |  Critical: ${critical}  |  High: ${high}`);

  const rows = risks.map(r => {
    const score = r.probability * r.impact;
    const level = score >= 15 ? 'Critical' : score >= 10 ? 'High' : score >= 6 ? 'Medium' : 'Low';
    return [
      r.title,
      r.category,
      r.probability,
      r.impact,
      score,
      level,
      r.owner || '—',
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.treatment.charAt(0).toUpperCase() + r.treatment.slice(1),
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Risk Title', 'Category', 'Prob', 'Impact', 'Score', 'Level', 'Owner', 'Status', 'Treatment']],
    body: rows,
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { cellPadding: 2 },
    didParseCell: (data) => {
      if (data.column.index === 5) {
        const v = data.cell.raw;
        if (v === 'Critical') data.cell.styles.textColor = [220, 38, 38];
        else if (v === 'High') data.cell.styles.textColor = [234, 88, 12];
        else if (v === 'Medium') data.cell.styles.textColor = [202, 138, 4];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  addFooter(doc);
  doc.save(`risk_register_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Executive Summary PDF ────────────────────────────────────────────────────
export const exportExecutiveSummaryPDF = (documents, frameworks, risks) => {
  const doc = new jsPDF();
  addHeader(doc, 'Executive Summary — GRC Status Report', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  let y = 42;

  // KPIs section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Key Performance Indicators', 14, y);
  y += 6;

  const totalControls = frameworks.reduce((s, f) => s + f.controls.length, 0);
  const compliantControls = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'compliant').length, 0);
  const complianceScore = totalControls ? Math.round((compliantControls / totalControls) * 100) : 0;
  const criticalRisks = risks.filter(r => r.probability * r.impact >= 15).length;
  const openRisks = risks.filter(r => r.status === 'open').length;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Status']],
    body: [
      ['Total Governance Documents', documents.length, documents.length > 0 ? 'Active' : 'None'],
      ['Approved Documents', documents.filter(d => d.status === 'approved').length, ''],
      ['Compliance Frameworks Tracked', frameworks.length, ''],
      ['Overall Compliance Score', `${complianceScore}%`, complianceScore >= 80 ? 'Good' : complianceScore >= 60 ? 'Needs Improvement' : 'Critical'],
      ['Total Risks Identified', risks.length, ''],
      ['Open Risks', openRisks, openRisks > 5 ? 'Needs Attention' : 'Manageable'],
      ['Critical Risks', criticalRisks, criticalRisks > 0 ? 'Action Required' : 'None'],
    ],
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Compliance breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Compliance Framework Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Framework', 'Type', 'Controls', 'Compliant', 'Partial', 'Non-Compliant', 'Score']],
    body: frameworks.map(f => {
      const total = f.controls.length;
      const c = f.controls.filter(x => x.status === 'compliant').length;
      const p = f.controls.filter(x => x.status === 'partial').length;
      const nc = f.controls.filter(x => x.status === 'non-compliant').length;
      return [f.name, f.type, total, c, p, nc, total ? `${Math.round((c / total) * 100)}%` : '—'];
    }),
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 10;
  if (y > 240) { doc.addPage(); y = 20; }

  // Top risks
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Top 5 Risks by Score', 14, y);
  y += 6;

  const topRisks = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).slice(0, 5);

  autoTable(doc, {
    startY: y,
    head: [['Risk', 'Category', 'Score', 'Owner', 'Status', 'Treatment']],
    body: topRisks.map(r => [r.title, r.category, r.probability * r.impact, r.owner, r.status, r.treatment]),
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  addFooter(doc);
  doc.save(`executive_summary_${new Date().toISOString().split('T')[0]}.pdf`);
};
