import React from "react";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import "../../styles/about.css";

export default function About() {
  return (
    <div className="about-page">
      <HomepageHeader />
      <main className="about-main">
        <div className="container about-container">
          <div className="about-stack">
            <section className="about-card about-hero">
              <h1 className="about-title">Giới thiệu</h1>
              <p className="about-subtitle">
                Sao Kim Lighting mang đến những giải pháp chiếu sáng cao cấp, tinh tế và bền vững
                cho không gian sống hiện đại.
              </p>
            </section>

            <div className="about-grid">
              <section className="about-card">
                <h2>Về Sao Kim Lighting</h2>
                <p>
                  Chúng tôi chuyên cung cấp các dòng đèn trang trí và chiếu sáng hiện đại, chọn lọc
                  kỹ lưỡng về chất lượng, thiết kế và hiệu suất, phù hợp cho nhà ở, văn phòng và
                  công trình.
                </p>
              </section>

              <section className="about-card">
                <h2>Sứ mệnh</h2>
                <p>
                  Đồng hành cùng khách hàng trong việc kiến tạo không gian sống tiện nghi, thẩm mỹ
                  và tối ưu công năng, thông qua sản phẩm chất lượng và dịch vụ tư vấn tận tâm.
                </p>
              </section>

              <section className="about-card">
                <h2>Tầm nhìn</h2>
                <p>
                  Trở thành thương hiệu chiếu sáng cao cấp được tin cậy hàng đầu tại Việt Nam, nơi
                  kết hợp hài hòa giữa công nghệ, thẩm mỹ và trải nghiệm khách hàng.
                </p>
              </section>
            </div>

            <section className="about-card">
              <h2>Giá trị cốt lõi</h2>
              <ul className="about-list">
                <li>Chất lượng sản phẩm là nền tảng cho mọi cam kết.</li>
                <li>Thiết kế hiện đại, tinh tế và phù hợp với nhiều phong cách.</li>
                <li>Tư vấn chuyên sâu, minh bạch và đặt khách hàng làm trung tâm.</li>
                <li>Uy tín lâu dài, đồng hành trong từng giai đoạn dự án.</li>
              </ul>
            </section>

            <section className="about-card">
              <h2>Thông tin liên hệ</h2>
              <div className="about-contact-grid">
                <div>
                  <span className="about-contact-label">Điện thoại</span>
                  <p className="about-contact-value">
                    <a href="tel:0918113559">0918 113 559</a>
                  </p>
                </div>
                <div>
                  <span className="about-contact-label">Email</span>
                  <p className="about-contact-value">
                    <a href="mailto:info@ske.com.vn">info@ske.com.vn</a>
                  </p>
                </div>
                <div className="about-contact-full">
                  <span className="about-contact-label">Địa chỉ</span>
                  <p className="about-contact-value">
                    Số 40, ngõ 168, Nguyễn Xiển, Phường Hạ Đình, Quận Thanh Xuân, Thành phố Hà Nội,
                    Việt Nam
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}
