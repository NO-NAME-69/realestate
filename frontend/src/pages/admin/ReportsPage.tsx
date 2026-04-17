import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadExcel(filename: string, sheetName: string, data: Record<string, any>[]) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // Auto-size columns
  if (data.length > 0) {
    ws['!cols'] = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] ?? '').length)) + 2,
    }));
  }
  XLSX.writeFile(wb, filename);
}

function printReport(title: string, headers: string[], rows: string[][]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return toast.error('Pop-up blocked. Please allow pop-ups.');

  const thCells = headers.map(h => `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #333;font-size:0.8rem;text-transform:uppercase">${h}</th>`).join('');
  const bodyRows = rows.map(row => 
    `<tr>${row.map(cell => `<td style="padding:8px 12px;border-bottom:1px solid #ddd;font-size:0.85rem">${cell}</td>`).join('')}</tr>`
  ).join('');

  printWindow.document.write(`
    <html><head><title>${title} - Infinity Reality</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 2rem; color: #333; }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      p { color: #666; margin-bottom: 1.5rem; }
      table { width: 100%; border-collapse: collapse; }
      .footer { margin-top: 2rem; font-size: 0.75rem; color: #999; text-align: center; }
    </style></head><body>
      <h1>Infinity Reality — ${title}</h1>
      <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <table><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>
      <div class="footer">Infinity Reality • Confidential</div>
    </body></html>`);
  printWindow.document.close();
  printWindow.print();
}

type ReportData = { headers: string[]; rows: string[][]; excelData: Record<string, any>[] };

export function AdminReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchReportData = async (type: string): Promise<ReportData | null> => {
    try {
      if (type === 'users') {
        const res: any = await api.get('/admin/users?limit=200');
        const users = res.data || [];
        const headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Created'];
        const rows = users.map((u: any) => [u.fullName, u.email, u.mobile, u.role, u.status, new Date(u.createdAt).toLocaleDateString()]);
        const excelData = users.map((u: any) => ({ Name: u.fullName, Email: u.email, Mobile: u.mobile, Role: u.role, Status: u.status, Created: new Date(u.createdAt).toLocaleDateString() }));
        return { headers, rows, excelData };
      } else if (type === 'transactions') {
        const res: any = await api.get('/admin/transactions?limit=200');
        const txns = res.data || [];
        const headers = ['ID', 'User', 'Amount', 'Type', 'Status', 'Date'];
        const rows = txns.map((t: any) => [t.id, t.user.fullName, String(t.amount), t.type, t.status, new Date(t.createdAt).toLocaleDateString()]);
        const excelData = txns.map((t: any) => ({ ID: t.id, User: t.user.fullName, Amount: t.amount, Type: t.type, Status: t.status, Date: new Date(t.createdAt).toLocaleDateString() }));
        return { headers, rows, excelData };
      } else if (type === 'ledger') {
        const res: any = await api.get('/admin/ledger');
        const entries = res.data || [];
        const headers = ['Owner', 'Email', 'Project', 'Plot', 'Sqft', 'Value', 'Ownership%', 'Date'];
        const rows = entries.map((e: any) => [e.user.fullName, e.user.email, e.project.name, e.plots.join(' '), String(e.totalSqft), String(e.purchaseValue), `${e.ownershipPercentage}%`, new Date(e.registeredAt).toLocaleDateString()]);
        const excelData = entries.map((e: any) => ({ Owner: e.user.fullName, Email: e.user.email, Project: e.project.name, Plot: e.plots.join(' '), Sqft: e.totalSqft, Value: e.purchaseValue, 'Ownership%': `${e.ownershipPercentage}%`, Date: new Date(e.registeredAt).toLocaleDateString() }));
        return { headers, rows, excelData };
      } else if (type === 'plots') {
        const res: any = await api.get('/admin/plots?limit=200');
        const plots = res.data || [];
        const headers = ['Plot No', 'Project', 'Size (sqft)', 'Price', 'Type', 'Status'];
        const rows = plots.map((p: any) => [p.plotNumber, p.project.name, String(p.sizeSqft), String(p.price), p.type, p.status]);
        const excelData = plots.map((p: any) => ({ 'Plot No': p.plotNumber, Project: p.project.name, 'Size (sqft)': p.sizeSqft, Price: p.price, Type: p.type, Status: p.status }));
        return { headers, rows, excelData };
      } else if (type === 'sales') {
        const res: any = await api.get('/admin/sales');
        const sales = res.data || [];
        const headers = ['Buyer', 'Plot', 'Base Price', 'Final Price', 'Payment Status', 'Date'];
        const rows = sales.map((s: any) => [s.buyerName, s.plotNumber, String(s.basePrice), String(s.finalPrice), s.paymentStatus, new Date(s.createdAt).toLocaleDateString()]);
        const excelData = sales.map((s: any) => ({ Buyer: s.buyerName, Plot: s.plotNumber, 'Base Price': s.basePrice, 'Final Price': s.finalPrice, 'Payment Status': s.paymentStatus, Date: new Date(s.createdAt).toLocaleDateString() }));
        return { headers, rows, excelData };
      } else if (type === 'audit') {
        const res: any = await api.get('/admin/audit-logs?limit=200');
        const logs = res.data || [];
        const headers = ['Event', 'Actor Role', 'Target Type', 'IP Address', 'Result', 'Date'];
        const rows = logs.map((l: any) => [l.eventType, l.actorRole || 'SYSTEM', l.targetType || '', l.ipAddress || '', l.result, new Date(l.createdAt).toLocaleString()]);
        const excelData = logs.map((l: any) => ({ Event: l.eventType, 'Actor Role': l.actorRole || 'SYSTEM', 'Target Type': l.targetType || '', 'IP Address': l.ipAddress || '', Result: l.result, Date: new Date(l.createdAt).toLocaleString() }));
        return { headers, rows, excelData };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleCSV = async (type: string) => {
    setGenerating(type + '-csv');
    try {
      const data = await fetchReportData(type);
      if (!data) throw new Error('No data');
      const csv = data.headers.join(',') + '\n' + data.rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const report = reports.find(r => r.type === type);
      downloadCSV(`${type}_report.csv`, csv);
      toast.success(`${report?.title || 'Report'} CSV downloaded!`);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleExcel = async (type: string) => {
    setGenerating(type + '-excel');
    try {
      const data = await fetchReportData(type);
      if (!data) throw new Error('No data');
      const report = reports.find(r => r.type === type);
      downloadExcel(`${type}_report.xlsx`, report?.title || 'Report', data.excelData);
      toast.success(`${report?.title || 'Report'} Excel downloaded!`);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handlePrint = async (type: string) => {
    setGenerating(type + '-print');
    try {
      const data = await fetchReportData(type);
      if (!data) throw new Error('No data');
      const report = reports.find(r => r.type === type);
      printReport(report?.title || 'Report', data.headers, data.rows);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    {
      title: 'User Report',
      desc: 'All registered users, roles, and activation status',
      icon: '👥',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      type: 'users'
    },
    {
      title: 'Transaction Report',
      desc: 'All deposits, withdrawals, and payment records',
      icon: '💶',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      type: 'transactions'
    },
    {
      title: 'Ownership Ledger',
      desc: 'Complete ownership registry with plot allocations',
      icon: '🏛️',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      type: 'ledger'
    },
    {
      title: 'Plot Status Report',
      desc: 'Available, held, and sold plots per project',
      icon: '🗺️',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      type: 'plots'
    },
    {
      title: 'Sales & Revenue',
      desc: 'Revenue collected, pending, and project-wise breakdown',
      icon: '📈',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      type: 'sales'
    },
    {
      title: 'Audit Logs',
      desc: 'Security events and system operation records',
      icon: '✅',
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.1)',
      type: 'audit'
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Reports & Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Generate and download platform reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {reports.map((report, i) => (
          <Card key={i} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', background: report.bg, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                flexShrink: 0
              }}>
                {report.icon}
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{report.title}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{report.desc}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <Button 
                variant="outline" 
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}
                onClick={() => handleCSV(report.type)}
                disabled={generating?.startsWith(report.type) || false}
              >
                {generating === report.type + '-csv' ? '⏳...' : '📊 CSV'}
              </Button>
              <Button 
                variant="outline" 
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                onClick={() => handleExcel(report.type)}
                disabled={generating?.startsWith(report.type) || false}
              >
                {generating === report.type + '-excel' ? '⏳...' : '📥 Excel'}
              </Button>
              <Button 
                variant="outline" 
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)' }}
                onClick={() => handlePrint(report.type)}
                disabled={generating?.startsWith(report.type) || false}
              >
                {generating === report.type + '-print' ? '⏳...' : '🖨️ Print'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
