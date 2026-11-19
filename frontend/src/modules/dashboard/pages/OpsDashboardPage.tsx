import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime, formatMoney, Icon, IconName, OrderStatusBadge, PageHeading } from '@/components/ui';
import { catalogApi } from '@/modules/catalog/api/catalogApi';
import { inventoryApi } from '@/modules/inventory/api/inventoryApi';
import { InventoryStock } from '@/modules/inventory/types';
import { orderApi } from '@/modules/order/api/orderApi';
import { OrderDashboardSummary, OrderSummary } from '@/modules/order/types';

const Metric: React.FC<{ label: string; value: React.ReactNode; sub: string; icon: IconName; tone?: '' | 'warn' | 'bad' }> = ({ label, value, sub, icon, tone = '' }) => (
  <div className="metric">
    <div className="metric-label">{label}<Icon name={icon} /></div>
    <div className="metric-value">{value}</div>
    <small className={tone}>{sub}</small>
  </div>
);

/** Tổng quan Staff/Admin: số liệu lấy từ API tổng hợp đơn hàng, kho và catalog. */
export const OpsDashboardPage: React.FC<{ workspace: 'admin' | 'staff' }> = ({ workspace }) => {
  const isAdmin = workspace === 'admin';
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [summary, setSummary] = useState<OrderDashboardSummary | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<InventoryStock[] | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    orderApi.getAllForStaff({ page: 0, size: 6 })
      .then((p) => { setOrders(p.content); setTotalOrders(p.totalElements); })
      .catch(() => setTotalOrders(null));
    orderApi.getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
    inventoryApi.getLowStockVariants(5).then((r) => setLowStock(r.data)).catch(() => setLowStock(null));
    catalogApi.searchProducts({ page: 0, size: 1 }).then((p) => setProductCount(p.totalElements)).catch(() => setProductCount(null));
  }, []);

  const pending = summary?.pendingCount ?? 0;
  const inProgress = summary?.inProgressCount ?? 0;
  const deliveredCount = summary?.deliveredCount ?? 0;
  const revenue = summary?.deliveredRevenue ?? 0;

  return (
    <>
      <PageHeading
        title={isAdmin ? 'Tổng quan quản trị' : 'Ca làm việc'}
        actions={isAdmin ? (
          <>
            <Link to="../orders" className="btn sm"><Icon name="orders" /> Xem đơn hàng</Link>
            <Link to="../products" className="btn sm primary"><Icon name="laptop" /> Quản lý sản phẩm</Link>
          </>
        ) : (
          <>
            <Link to="../procurement?new=1" className="btn sm"><Icon name="plus" /> Lập phiếu nhập</Link>
            <Link to="../orders" className="btn sm primary"><Icon name="orders" /> Xử lý đơn</Link>
          </>
        )}
      />
      <div className="metrics">
        <Metric label="Chờ xác nhận" value={summary === null ? '—' : pending} sub="Đơn mới cần xử lý" icon="clock" tone={pending ? 'warn' : ''} />
        <Metric label="Đang xử lý / giao" value={summary === null ? '—' : inProgress} sub="Đã xác nhận, đang chuẩn bị" icon="truck" />
        <Metric label="SKU tồn thấp (≤ 5)" value={lowStock === null ? '—' : lowStock.length} sub="Chủ động lập phiếu nhập" icon="box" tone={lowStock?.length ? 'bad' : ''} />
        <Metric
          label={isAdmin ? 'Doanh thu đơn đã giao' : 'Sản phẩm đang bán'}
          value={isAdmin ? (summary === null ? '—' : formatMoney(revenue)) : productCount ?? '—'}
          sub={isAdmin ? `${deliveredCount} đơn đã giao` : 'Trong danh mục cửa hàng'}
          icon={isAdmin ? 'chart' : 'laptop'}
        />
      </div>

      <div className="ops-cols">
        <section className="panel">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3>Đơn hàng gần đây</h3>
            <Link to="../orders" className="text-btn small">Xem tất cả <Icon name="arrow-right" /></Link>
          </div>
          <div className="table-wrap" style={{ border: 0 }}>
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Giá trị</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="table-empty">{totalOrders === null ? 'Không tải được đơn hàng.' : 'Chưa có đơn hàng.'}</td></tr>
                ) : orders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td><div className="primary-cell">#{o.orderCode}</div><div className="subcell">{formatDateTime(o.createdAt)}</div></td>
                    <td>{o.recipientName}</td>
                    <td>{formatMoney(o.totalAmount)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="row between" style={{ marginBottom: 6 }}>
            <h3>Sắp hết hàng</h3>
            <Link to="../inventory?low=1" className="text-btn small">Kho hàng <Icon name="arrow-right" /></Link>
          </div>
          {lowStock === null ? <p className="small muted">Không tải được dữ liệu kho.</p> : lowStock.length === 0 ? (
            <p className="small muted" style={{ marginTop: 10 }}>Tồn kho đang ổn định.</p>
          ) : lowStock.slice(0, 6).map((s) => (
            <div key={s.variantId} className="row between" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}>
                <strong className="small" style={{ display: 'block' }}>{s.productName}</strong>
                <span className="small muted">{s.sku}</span>
              </div>
              <span className={`badge ${s.quantity === 0 ? 'red' : 'orange'}`}>{s.quantity} máy</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
};
