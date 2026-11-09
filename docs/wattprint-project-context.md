# WattPrint: tóm tắt bối cảnh dự án

Tóm tắt ngắn từ 2 tài liệu nguồn (đã đọc toàn bộ). Mọi ý đều kèm trích dẫn `[Deck S#]` hoặc `[Concept §#]`; không thêm thông tin ngoài 2 nguồn.

## Nguồn

| Mã      | Tài liệu                                                                                                  | Ghi chú                                               |
| ------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Deck    | [WattPrint Pitch Deck.md](WattPrint%20Pitch%20Deck.md), 12 slide (S1-S12)                                 | Nội dung pitch của đội UDU.S4U                        |
| Concept | EnergyCopilot concept note (PDF, 4 trang), `Documents\WattPrint info\concept_energy_copilot_note_en.pdf` | Ý tưởng nền cho Energy Copilot, viết cho **tòa nhà** |

## Mục tiêu dự án

- WattPrint là hệ thống theo dõi tiêu thụ điện từng thiết bị và trợ lý năng lượng cá nhân hóa cho hộ gia đình [Deck S1].
- Mục tiêu cốt lõi: giúp hộ gia đình hiểu điện năng của **từng thiết bị** và đưa khuyến nghị hành vi để tiết kiệm điện, chỉ với **một cảm biến duy nhất ở aptomat** [Deck S3-4].
- Câu hỏi gốc: có cách nào ước tính điện từng thiết bị với chi phí thấp hơn nhiều không [Deck S2].

## Vấn đề

- Thông tin ước tính hóa đơn theo ngày giúp hộ chủ động giảm điện (thí nghiệm 45.000 hộ Việt Nam) [Deck S2].
- Người dùng đoán thấp điện năng thiết bị khoảng 2,8 lần (nghiên cứu ở Mỹ) [Deck S2].
- App EVN chỉ cho số tổng của hộ theo ngày, không theo thiết bị [Deck S2, S9].
- Theo dõi từng thiết bị bằng ổ cắm đo điện tốn ước tính 4-10 triệu đồng cho khoảng 10 điểm đo, và hộ phải tự lắp [Deck S2, S9].

## Giải pháp: bốn khối [Deck S3-4]

1. **NILMFormer**: tách điện từng thiết bị từ số đo tổng ở aptomat (NILM dựa trên Transformer), có bước hiệu chỉnh theo hộ.
2. **Dashboard BI & Billing**: tiêu thụ theo giờ/ngày/tuần/tháng, nhật ký hoạt động, mọi số liệu kèm tiền theo biểu giá 6 bậc.
3. **Dự báo và phát hiện bất thường**: cảnh báo chạy lâu/tốn điện, phát hiện chạy ngầm, so với tháng trước và hộ khác, dự đoán hóa đơn cuối tháng và lúc chạm bậc giá kế.
4. **Energy Copilot hai chiều** (LLM, Text-to-SQL, RAG): trả lời khi được hỏi và chủ động gợi ý, tính từ dữ liệu thật của nhà, thời tiết và biểu giá. Số liệu do công cụ tính, mô hình chỉ giải thích; kiểm tra truy vấn, đơn vị, nguồn trước khi trả lời; học từ phản hồi người dùng.

Các số trong ví dụ (151,6 kWh điều hòa, 29,8 kWh/107.900 đồng...) là **dữ liệu minh họa của bản mẫu**, không phải kết quả đo [Deck S3-4].

## Energy Copilot: ý tưởng nền (concept note)

- Bài toán gốc ở tòa nhà: dashboard BMS chỉ có số mà không giải thích, chatbot LLM chung không biết dữ liệu tòa nhà và có thể bịa; chưa có hệ thống nào gộp các mảnh này [Concept §1].
- Hai chiều: **Pull** (hỏi bằng ngôn ngữ tự nhiên, trả lời dựa trên dữ liệu cảm biến, tiêu chuẩn, hành động cụ thể) và **Push** (theo dõi luồng cảm biến, phát hiện lãng phí/khó chịu, gợi ý kèm mức tiết kiệm, học từ việc người dùng có chấp nhận hay không) [Concept §2].
- Nguyên tắc: **"tools first, language second"**, LLM lập kế hoạch và giải thích, mọi con số đến từ công cụ xác định, có thể kiểm toán [Concept §2].
- Năm công cụ: Text-to-SQL trên dữ liệu cảm biến (qua mô hình ngữ nghĩa Brick), Graph-RAG trên tri thức chuyên gia, đánh giá tiện nghi/sức khỏe (PMV/PPD, IAQ), mô phỏng what-if (EnergyPlus hoặc surrogate), dự báo và phát hiện bất thường; một bộ verifier kiểm tra lại truy vấn, đơn vị, trích dẫn [Concept §2, Fig. 1-2].
- Điểm mới: một vòng lặp cho dữ liệu, ngữ nghĩa và tri thức; lời khuyên được mô phỏng và ràng buộc tiện nghi; hai chiều và cá nhân hóa; benchmark mở EnergyQA [Concept §3].
- Còn mở: chưa có bộ Q&A mở về tiện nghi/sức khỏe cho người dùng; ghi sẵn 7 câu hỏi cho chuyên gia (nguồn thẩm quyền, bản quyền tiêu chuẩn, ranh giới an toàn, truy cập dữ liệu...) [Concept §5].

**Quan hệ giữa hai tài liệu:** khối 4 của WattPrint dùng cùng tinh thần (hai chiều, số liệu từ công cụ, verifier, học từ phản hồi, gợi ý theo thời tiết và sức khỏe) áp cho hộ gia đình [Deck S3-4; Concept §2-3]. Concept note nói về tòa nhà (BMS, Brick, HVAC, EnergyPlus, PMV) và **không nhắc WattPrint hay NILM**; các chi tiết kỹ thuật đó chưa được deck xác nhận cho WattPrint.

## Tác động dự kiến [Deck S5]

- Đây là **dự tính từ nghiên cứu trước**, sẽ đo lại trong thí điểm; hiện WattPrint đang được mô phỏng trong môi trường nghiên cứu.
- Giảm khoảng 2-4% điện khi hộ được xem thông tin (meta-analysis); Đà Nẵng, khoảng 1.000 hộ: 4-7%.
- Giả thuyết hành vi (gợi ý cụ thể thúc đẩy hành động) là giả thuyết của đội, cần kiểm chứng.
- Ví dụ quy mô: 10.000 hộ × khoảng 3.500 kWh/năm (ước tính của đội), giảm 2-6% thì tiết kiệm khoảng 0,7-2 triệu kWh/năm, tương đương 500-1.400 tấn CO₂.

## Mô hình kinh doanh và thị trường

- Thuê bao hằng tháng cho hộ gia đình; hai gói: thường (thiết bị, phân rã, hiển thị, phân tích) và Pro (thêm AI Energy Copilot). Đối tác lo sản xuất, lắp đặt, bảo trì, thu hồi thiết bị. Giá và chi phí chưa xác định, sẽ xác định sau thí điểm [Deck S6].
- Chứng minh tiết kiệm theo nguyên tắc M&V (so trước/sau, hiệu chỉnh thời tiết) [Deck S6].
- Mục tiêu lớn: hợp tác EVN, chạy trên công tơ thông minh [Deck S6, S8, S11].
- TAM khoảng 28 triệu hộ; SAM hơn 10 triệu hộ đô thị (ước tính); SOM khoảng 10.000 hộ đầu tiên (0,1% SAM) [Deck S7].

## Lộ trình và đề nghị

- Bước 1 thí điểm (hộ đồng ý bằng văn bản) → bước 2 qua ban quản lý chung cư/cộng đồng, mở rộng dần: chung cư, nhà riêng, nhà trọ, hộ kinh doanh (hai loại cuối cần bổ sung cách tính tiền) → bước 3 hợp tác EVN [Deck S8].
- 12 tháng tới: thí điểm 3-6 tháng trên 5-10 hộ, kiểm chuẩn mô hình bằng công tơ tham chiếu, đo nhận thức, hành vi, mức tiết kiệm trước/sau [Deck S11].
- Đối thủ: chưa có giải pháp tương tự ở Việt Nam; EVN CSKH, EVNHANOI (người dùng tự nhập), tự lắp ổ cắm đo điện [Deck S9].
- Đội: UDU.S4U (PTIT); lead Nguyễn Trường Giang, tech lead Nguyễn Đình Đạt; cố vấn TS. Phan Lý Huỳnh và GS. Stephane Ploix [Deck S10].

## Lưu ý khi dùng làm căn cứ

- Deck là tài liệu pitch: nhiều số là ước tính hoặc minh họa; ghi rõ nguồn gốc khi trích.
- Ranh giới an toàn của Copilot (không chẩn đoán y tế, không ghi đè cài đặt HVAC an toàn) chỉ là **câu hỏi mở** trong concept note [Concept §5, E6], chưa phải quy tắc đã chốt.
