import { apiErrorMessage, formatDateTime, formatMoney, Spinner } from '@/components/ui';
import { AccountLayout } from '@/modules/user/components/AccountLayout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeCreditApi } from '../../api/storeCreditApi';
import type { StoreCreditWallet } from '../../types';

export const StoreCreditPage = () => {
  const [wallet, setWallet] = useState<StoreCreditWallet | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    storeCreditApi.getWallet().then((result) => {
      if (active) setWallet(result);
    }).catch((err) => {
      if (active) setError(apiErrorMessage(err, 'Không thể tải ví StoreCredit.'));
    });
    return () => { active = false; };
  }, [reload]);

  return (
    <AccountLayout
      title="StoreCredit"
      sub="Dùng số dư hoàn tiền để thanh toán đơn hàng tại LaptopStore."
      actions={<Link className="btn primary" to="/products">Mua laptop</Link>}
    >
      {!wallet && (error ? (
        <div className="notice red" role="alert">
          <p>{error}</p>
          <button type="button" className="text-btn" onClick={() => setReload((current) => current + 1)}>Thử lại</button>
        </div>
      ) : <Spinner />)}
      {wallet && (
        <div className="stack">
          <section className="panel">
            <h3>Số dư khả dụng</h3>
            <p className="store-credit-balance">{formatMoney(wallet.balance)}</p>
          </section>
          <section className="panel">
            <h3 className="panel-title">Giao dịch gần đây</h3>
            {wallet.entries.length === 0 ? <p className="muted">Chưa có giao dịch StoreCredit.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Giao dịch</th><th>Đơn hàng</th><th>Số tiền</th><th>Số dư sau giao dịch</th><th>Thời gian</th></tr></thead>
                  <tbody>
                    {wallet.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.kind === 'REFUND' ? 'Hoàn tiền' : 'Thanh toán đơn hàng'}</td>
                        <td><Link to={`/orders/${entry.orderId}`}>#{entry.orderId}</Link></td>
                        <td>{entry.kind === 'REFUND' ? '+' : '−'}{formatMoney(entry.amount)}</td>
                        <td>{formatMoney(entry.balanceAfter)}</td>
                        <td>{formatDateTime(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AccountLayout>
  );
};
