import { Brand, Icon } from '@/components/ui';
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => (
    <footer className="footer">
        <div className="ls-container footer-inner">
            <div className="footer-cols">
                <div>
                    <Brand />
                    <p>Cửa hàng laptop chính hãng cho học tập, công việc và giải trí.</p>
                </div>
                <div>
                    <h2>Khám phá</h2>
                    <Link to="/products">Tất cả laptop</Link>
                    <Link to="/products?categoryName=Gaming">Laptop gaming</Link>
                    <Link to={`/products?categoryName=${encodeURIComponent('Văn phòng')}`}>Laptop văn phòng</Link>
                    <Link to={`/products?categoryName=${encodeURIComponent('Mỏng nhẹ')}`}>Laptop mỏng nhẹ</Link>
                    <Link to="/ai-assistant">Tư vấn AI</Link>
                </div>
                <div>
                    <h2>Đơn hàng và tài khoản</h2>
                    <Link to="/orders">Đơn hàng của tôi</Link>
                    <Link to="/profile">Thông tin tài khoản</Link>
                    <Link to="/me/addresses">Sổ địa chỉ</Link>
                </div>
                <div>
                    <h2>Hỗ trợ khách hàng</h2>
                    <a className="footer-phone" href="tel:18002026"><Icon name="phone" /> 1800 2026</a>
                    <p>8:00–21:00 hằng ngày</p>
                    <p className="footer-payment"><Icon name="wallet" /> COD và VNPay</p>
                </div>
            </div>
            <div className="footer-bottom">
                <span>© 2026 laptopstore</span>
                <span>Đồ án J2EE · Nhóm 4</span>
            </div>
        </div>
    </footer>
);
