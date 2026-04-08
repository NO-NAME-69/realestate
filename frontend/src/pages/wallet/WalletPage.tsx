import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';

// Load Razorpay dynamically
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface WalletData {
  balance: number;
  currency: string;
}

interface TopupResponse {
  data: {
    order_id: string;
    amount_paise: number;
    razorpay_key_id: string;
  };
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');

  const fetchBalance = async () => {
    try {
      const res = await api.get<{ data: WalletData }>('/wallet/balance');
      setBalance(res.data.balance);
    } catch (err) {
      toast.error('Failed to fetch wallet balance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBalance();
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum topup amount is ₹500');
      return;
    }

    setIsTopupLoading(true);
    const scriptLoaded = await loadRazorpay();
    if (!scriptLoaded) {
      toast.error('Razorpay SDK failed to load');
      setIsTopupLoading(false);
      return;
    }

    try {
      const amount_paise = amount * 100;
      const res = await api.post<TopupResponse>('/wallet/topup/initiate', {
        data: { amount_paise },
      });

      const options = {
        key: res.data.razorpay_key_id,
        amount: res.data.amount_paise,
        currency: 'INR',
        name: 'RP Investments',
        description: 'Wallet Topup',
        order_id: res.data.order_id,
        handler: async function (response: any) {
          try {
            await api.post('/wallet/topup/verify', {
              data: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            toast.success('Wallet topped up successfully!');
            void fetchBalance();
            setTopupAmount('');
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Payment verification failed');
          }
        },
        theme: { color: '#C9A84C' },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        toast.error('Payment failed or cancelled');
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to initiate topup');
    } finally {
      setIsTopupLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Wallet</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your funds and transactions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <Card glass>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <WalletIcon size={20} color="var(--accent-gold)" /> Available Balance
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isLoading ? (
                <span style={{ opacity: 0.5 }}>₹---</span>
              ) : (
                `₹${(balance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button style={{ flex: 1 }} variant="ghost" disabled>Withdraw</Button>
            </div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardHeader>
            <CardTitle>Add Funds</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Amount (₹)"
                type="number"
                min="500"
                step="100"
                placeholder="0.00"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                required
                leftIcon={<IndianRupee size={18} />}
              />
              <Button type="submit" fullWidth isLoading={isTopupLoading}>
                Proceed to Pay
              </Button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Payments powered securely by Razorpay
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
      
      {/* Transaction History Placeholder */}
      <h2 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Transaction History</h2>
      <Card glass>
        <CardBody>
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
            No transactions found yet.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
