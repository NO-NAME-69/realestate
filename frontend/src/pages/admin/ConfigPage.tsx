import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    minPurchaseAmount: '500000',
    kycEligibility: '50000',
    maxPlots: '10',
    holdDuration: '7',
    notifyUserRegistration: true,
    notifyKyc: true,
    notifyTransactions: true,
    notifySales: false,
    gatewayProvider: 'Razorpay',
    apiKeyLive: '••••••••••••••',
    enableUpi: true,
    enableNeft: true,
    platformName: 'PropVault',
    supportEmail: 'support@propvault.in',
    maintenanceMode: false,
    twoFactorAdmin: true
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const res: any = await api.get('/admin/config');
        const dbConfigs = (res.data || []) as { key: string, value: string }[];
        
        // Map db to local state based on keys
        if (dbConfigs.length > 0) {
          const newConfig = { ...config };
          dbConfigs.forEach(c => {
            if (c.key in newConfig) {
              const val = c.value;
              // determine type dynamically 
              if (val === 'true' || val === 'false') {
                (newConfig as any)[c.key] = val === 'true';
              } else {
                (newConfig as any)[c.key] = val;
              }
            }
          });
          setConfig(newConfig);
        }
      } catch (err) {
        toast.error('Failed to load system configuration');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Loop state and update explicitly
      for (const [key, val] of Object.entries(config)) {
        await api.put(`/admin/config/${key}`, { data: { value: String(val) } });
      }
      toast.success('Configuration updated successfully');
    } catch (err) {
      toast.error('Failed to update configuration settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof typeof config, val: any) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading configuration...</div>;

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Platform configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: 'white', fontWeight: 600 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Top Left: Property Purchase Rules */}
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.125rem' }}>Property Purchase Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SettingInput label="Minimum Purchase (₹)" desc="Minimum amount to invest" value={config.minPurchaseAmount} onChange={(val) => updateField('minPurchaseAmount', val)} />
            <SettingInput label="KYC Threshold (₹)" desc="Deposit required to unlock KYC" value={config.kycEligibility} onChange={(val) => updateField('kycEligibility', val)} />
            <SettingInput label="Max Plots" desc="Cap on plots per user" value={config.maxPlots} onChange={(val) => updateField('maxPlots', val)} />
            <SettingInput label="Hold Duration" desc="Days held before sale open" value={config.holdDuration} onChange={(val) => updateField('holdDuration', val)} />
          </div>
        </Card>

        {/* Top Right: Notification Settings */}
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.125rem' }}>Notification Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SettingToggle label="New User Registration" desc="Alert when a new user registers" isOn={config.notifyUserRegistration} onToggle={() => updateField('notifyUserRegistration', !config.notifyUserRegistration)} />
            <SettingToggle label="KYC Submission" desc="Notify when KYC is submitted for review" isOn={config.notifyKyc} onToggle={() => updateField('notifyKyc', !config.notifyKyc)} />
            <SettingToggle label="Transaction Alerts" desc="Alert on deposits and withdrawals" isOn={config.notifyTransactions} onToggle={() => updateField('notifyTransactions', !config.notifyTransactions)} />
            <SettingToggle label="Plot Sale Notification" desc="Notify when a plot sale is completed" isOn={config.notifySales} onToggle={() => updateField('notifySales', !config.notifySales)} />
          </div>
        </Card>

        {/* Bottom Left: Payment Gateway */}
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.125rem' }}>Payment Gateway</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Gateway Provider</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active payment processing provider</div>
              </div>
              <select value={config.gatewayProvider} onChange={(e) => updateField('gatewayProvider', e.target.value)} style={{ width: '150px', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}>
                <option value="Razorpay">Razorpay</option>
                <option value="Stripe">Stripe</option>
              </select>
            </div>
            <SettingInput label="API Key (Live)" desc="Production API key for payment gateway" value={config.apiKeyLive} onChange={(val) => updateField('apiKeyLive', val)} />
            <SettingToggle label="Enable UPI Payments" desc="Allow users to pay via UPI" isOn={config.enableUpi} onToggle={() => updateField('enableUpi', !config.enableUpi)} />
            <SettingToggle label="Enable NEFT/RTGS" desc="Allow bank transfer payments" isOn={config.enableNeft} onToggle={() => updateField('enableNeft', !config.enableNeft)} />
          </div>
        </Card>

        {/* Bottom Right: Platform Settings */}
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.125rem' }}>Platform Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SettingInput label="Platform Name" desc="Displayed globally" value={config.platformName} onChange={(val) => updateField('platformName', val)} />
            <SettingInput label="Support Email" desc="Used for contact queries" value={config.supportEmail} onChange={(val) => updateField('supportEmail', val)} />
            <SettingToggle label="Maintenance Mode" desc="Disables user access completely" isOn={config.maintenanceMode} onToggle={() => updateField('maintenanceMode', !config.maintenanceMode)} />
            <SettingToggle label="Two-Factor Auth" desc="Require 2FA for admin login" isOn={config.twoFactorAdmin} onToggle={() => updateField('twoFactorAdmin', !config.twoFactorAdmin)} />
          </div>
        </Card>

      </div>
    </div>
  );
}

function SettingInput({ label, desc, value, onChange }: { label: string, desc: string, value: string, onChange: (val: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
      <div>
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          style={{ 
            width: '120px', padding: '0.5rem 1rem', borderRadius: '0.5rem', 
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
            color: 'white', outline: 'none', textAlign: 'left'
          }} 
        />
      </div>
    </div>
  );
}

function SettingToggle({ label, desc, isOn, onToggle }: { label: string, desc: string, isOn: boolean, onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
      <div onClick={onToggle} style={{ 
        width: '44px', height: '24px', borderRadius: '12px', 
        background: isOn ? '#3b82f6' : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease'
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', background: 'white',
          position: 'absolute', top: '2px', left: isOn ? '22px' : '2px',
          transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
}
