import { PrismaClient } from "@prisma/client-contract";

const prisma = new PrismaClient();

const IDS = {
  contracts: {
    CONTRACT_1: "70000000-0000-0000-0000-000000000001",
    CONTRACT_2: "70000000-0000-0000-0000-000000000002",
    CONTRACT_DRAFT: "70000000-0000-0000-0000-000000000003",
    CONTRACT_EXPIRED: "70000000-0000-0000-0000-000000000004",
  },
  contractServices: {
    CS_1: "71000000-0000-0000-0000-000000000001",
    CS_2: "71000000-0000-0000-0000-000000000002",
    CS_3: "71000000-0000-0000-0000-000000000003",
  },
  periods: {
    PERIOD_1: "72000000-0000-0000-0000-000000000001",
    PERIOD_2: "72000000-0000-0000-0000-000000000002",
  },
  terms: {
    TERM_1: "73000000-0000-0000-0000-000000000001",
    TERM_2: "73000000-0000-0000-0000-000000000002",
    TERM_3: "73000000-0000-0000-0000-000000000003",
    TERM_4: "73000000-0000-0000-0000-000000000004",
    TERM_5: "73000000-0000-0000-0000-000000000005",
    TERM_6: "73000000-0000-0000-0000-000000000006",
    TERM_7: "73000000-0000-0000-0000-000000000007",
    TERM_8: "73000000-0000-0000-0000-000000000008",
    TERM_9: "73000000-0000-0000-0000-000000000009",
    TERM_10: "73000000-0000-0000-0000-000000000010",
    TERM_11: "73000000-0000-0000-0000-000000000011",
    TERM_12: "73000000-0000-0000-0000-000000000012",
    TERM_13: "73000000-0000-0000-0000-000000000013",
    TERM_14: "73000000-0000-0000-0000-000000000014",
    TERM_15: "73000000-0000-0000-0000-000000000015",
    TERM_16: "73000000-0000-0000-0000-000000000016",
  },
  contractTerms: {
    CT_1: "74000000-0000-0000-0000-000000000001",
    CT_2: "74000000-0000-0000-0000-000000000002",
  },
  templates: {
    TEMPLATE_ROOM: "75000000-0000-0000-0000-000000000001",
    TEMPLATE_APARTMENT: "75000000-0000-0000-0000-000000000002",
    TEMPLATE_SERVICE_CLEANING: "75000000-0000-0000-0000-000000000003",
    TEMPLATE_SERVICE_MAINTENANCE: "75000000-0000-0000-0000-000000000004",
    TEMPLATE_SERVICE_PARKING: "75000000-0000-0000-0000-000000000005",
    TEMPLATE_SERVICE_INTERNET: "75000000-0000-0000-0000-000000000006",
    TEMPLATE_SERVICE_MANAGEMENT: "75000000-0000-0000-0000-000000000007",
    TEMPLATE_SERVICE_AMENITIES: "75000000-0000-0000-0000-000000000008",
    TEMPLATE_SERVICE_UTILITIES: "75000000-0000-0000-0000-000000000009",
    TEMPLATE_SERVICE_FITOUT: "75000000-0000-0000-0000-000000000010",
    TEMPLATE_SERVICE_WASTE: "75000000-0000-0000-0000-000000000011",
    TEMPLATE_SERVICE_FOOD: "75000000-0000-0000-0000-000000000012",
    TEMPLATE_SERVICE_LAUNDRY: "75000000-0000-0000-0000-000000000013",
    TEMPLATE_SERVICE_OTHER: "75000000-0000-0000-0000-000000000014",
  },
  violationRules: {
    RULE_LATE_PAYMENT: "76000000-0000-0000-0000-000000000001",
    RULE_DAMAGE: "76000000-0000-0000-0000-000000000002",
    RULE_NOISE: "76000000-0000-0000-0000-000000000003",
    RULE_CONTRACT_BREAK: "76000000-0000-0000-0000-000000000004",
  },
  violationCases: {
    CASE_1: "77000000-0000-0000-0000-000000000001",
    CASE_2: "77000000-0000-0000-0000-000000000002",
  },
};

const USERS = {
  ADMIN: "30000000-0000-0000-0000-000000000001",
  CUSTOMER: "30000000-0000-0000-0000-000000000008", // CUSTOMER_TRI
  PROVIDER_RESIDENCE: "40000000-0000-0000-0000-000000000001",
  PROVIDER_CLEANPRO: "40000000-0000-0000-0000-000000000002",
};

const CATALOG = {
  ROOM: "63000000-0000-0000-0000-000000000001",
  CLEANING: "63000000-0000-0000-0000-000000000002",
};

const ROOMS = {
  ROOM_101: "66000000-0000-0000-0000-000000000001",
  ROOM_102: "66000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("🌱 Seeding contract service...");
  const now = new Date();

  // TERMS - Pháp lý chặt chẽ theo Luật Dân sự & Nhà ở
  await prisma.term.createMany({
    data: [
      { id: IDS.terms.TERM_1, content: "Điều khoản thanh toán: Bên B có nghĩa vụ thanh toán tiền thuê đúng thời hạn thỏa thuận (từ ngày 01 đến ngày 05 hàng tháng). Nếu quá thời hạn thanh toán 10 ngày mà không có lý do chính đáng, Bên A có quyền đơn phương chấm dứt hợp đồng thuê nhà ở và yêu cầu bồi thường thiệt hại (Căn cứ khoản 2 Điều 170 Luật Nhà ở 2023).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_2, content: "Bảo quản tài sản: Bên B cam kết giữ gìn nhà ở và các trang thiết bị theo biên bản bàn giao. Mọi hư hỏng do lỗi chủ quan của Bên B, Bên B phải bồi thường theo giá trị thị trường tại thời điểm bồi thường (Căn cứ Bộ luật Dân sự 2015).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_3, content: "Sử dụng đúng mục đích: Bên B cam kết sử dụng diện tích thuê đúng mục đích là nhà ở, không sử dụng làm nơi sản xuất, kinh doanh, lưu trữ hàng hóa nguy hiểm, hóa chất độc hại, hoặc các hoạt động vi phạm pháp luật (Căn cứ Điều 170 Luật Nhà ở 2023).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_4, content: "Đơn phương chấm dứt hợp đồng: Bên A có quyền đơn phương chấm dứt thực hiện hợp đồng thuê nhà ở khi Bên B vi phạm nghiêm trọng thỏa thuận, và phải thông báo bằng văn bản cho Bên B trước ít nhất 30 ngày đối với hợp đồng có thời hạn (Căn cứ Điều 170 Luật Nhà ở 2023).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_5, content: "Sự kiện bất khả kháng: Các bên được miễn trừ trách nhiệm dân sự trong các trường hợp bất khả kháng như thiên tai, hỏa hoạn, địch họa, dịch bệnh, hoặc theo quyết định của cơ quan nhà nước có thẩm quyền gây ảnh hưởng trực tiếp đến việc thực hiện hợp đồng (Căn cứ Điều 156 Bộ luật Dân sự 2015).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_6, content: "Cam kết chất lượng dịch vụ: Bên Cung cấp cam kết thực hiện đúng và đầy đủ khối lượng, chất lượng dịch vụ theo thỏa thuận. Trong trường hợp dịch vụ không đạt chuẩn do lỗi của Bên Cung cấp, Bên Cung cấp phải khắc phục miễn phí trong vòng 24 giờ kể từ khi nhận được thông báo.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_7, content: "Quy định dịch vụ trông giữ xe: Bên B cam kết đỗ xe đúng nơi quy định, không mang chất dễ cháy nổ vào bãi đỗ xe. Bên A chịu trách nhiệm bồi thường nếu xảy ra mất mát phương tiện trong khuôn viên quản lý, ngoại trừ trường hợp Bên B làm mất thẻ xe hoặc không tuân thủ quy định an ninh (Căn cứ Luật Dân sự 2015 về Hợp đồng gửi giữ tài sản).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_8, content: "Sử dụng Internet/Truyền hình cáp: Bên B cam kết không sử dụng đường truyền cho các mục đích vi phạm Pháp luật Việt Nam (như tấn công mạng, phát tán văn hóa phẩm đồi trụy). Không tự ý chia sẻ băng thông ra ngoài phạm vi căn hộ. Bên B chịu trách nhiệm bảo quản thiết bị Router/Modem do Bên A cung cấp.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_9, content: "Phí quản lý vận hành: Bên B có nghĩa vụ đóng phí quản lý đầy đủ để duy trì các dịch vụ chung như: vệ sinh khu vực công cộng, bảo vệ an ninh 24/7, bảo trì thang máy, hệ thống PCCC và xử lý rác thải. (Căn cứ Thông tư 05/2024/TT-BXD ban hành Quy chế quản lý, sử dụng nhà chung cư).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_10, content: "Sử dụng Tiện ích nội khu (Gym, Hồ bơi, BBQ): Bên B phải tuân thủ nghiêm ngặt nội quy an toàn, thời gian hoạt động của từng tiện ích. Trẻ em dưới 12 tuổi phải có người lớn đi kèm. Bên A được miễn trừ trách nhiệm đối với các tai nạn cá nhân hoặc mất mát tài sản do sự bất cẩn của Bên B.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_11, content: "Dịch vụ cung cấp Điện/Nước sinh hoạt: Bên B cam kết thanh toán cước phí tiêu thụ theo chỉ số đồng hồ đo đếm hàng tháng dựa trên biểu giá quy định của Nhà nước và Ban Quản lý. Trong trường hợp vi phạm thanh toán quá 15 ngày, Bên A có quyền tạm ngừng cung cấp dịch vụ (Căn cứ Luật Điện lực và Nghị định 117/2007/NĐ-CP về sản xuất, cung cấp và tiêu thụ nước sạch).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_12, content: "Thi công, sửa chữa căn hộ (Fit-out): Bên B phải nộp hồ sơ xin phép BQL trước khi thi công, đóng tiền cọc đảm bảo, và chỉ thi công trong khung giờ cho phép. Tuyệt đối tuân thủ tiêu chuẩn tiếng ồn theo QCVN 26:2025/BNNMT. Nếu gây thiệt hại đến kết cấu chung, Bên B phải bồi thường toàn bộ chi phí khắc phục.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_13, content: "Thu gom rác thải sinh hoạt: Bên B có trách nhiệm phân loại rác thải rắn sinh hoạt tại nguồn thành 3 loại (có khả năng tái sử dụng, rác thực phẩm, rác thải khác) trước khi đưa ra khu vực tập kết rác. Bên A có quyền từ chối thu gom nếu rác không được phân loại đúng (Căn cứ Khoản 1 Điều 75 Luật Bảo vệ Môi trường 2020).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_14, content: "Dịch vụ Ăn uống/Cơm hộp/Catering: Bên Cung cấp cam kết 100% nguyên liệu có nguồn gốc xuất xứ rõ ràng và tuân thủ nghiêm ngặt Luật An toàn thực phẩm 2010. Trong trường hợp xảy ra ngộ độc thực phẩm do lỗi của Bên Cung cấp, Bên Cung cấp phải chịu toàn bộ chi phí y tế và bồi thường thiệt hại về sức khỏe cho khách hàng.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_15, content: "Dịch vụ Giặt ủi: Bên Cung cấp cam kết phân loại và sử dụng hóa chất giặt ủi an toàn. Trong trường hợp làm rách, lem màu hoặc thất lạc đồ của khách, Bên Cung cấp bồi thường theo tỷ lệ thỏa thuận hoặc tối đa không quá 10 lần phí giặt của sản phẩm đó. Nước thải giặt ủi phải được xử lý qua hệ thống đạt chuẩn môi trường.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_16, content: "Thỏa thuận dịch vụ chung (Các dịch vụ khác): Hai bên tự do thỏa thuận nội dung công việc, phương thức thực hiện và thù lao trên tinh thần tự nguyện, không vi phạm điều cấm của Luật, không trái đạo đức xã hội. Nếu một bên vi phạm hợp đồng gây thiệt hại, bên vi phạm phải bồi thường toàn bộ thiệt hại thực tế phát sinh theo quy định của Bộ luật Dân sự 2015.", status: "ACTIVE", createdAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT TEMPLATES
  await prisma.contractTemplate.createMany({
    data: [
      {
        id: IDS.templates.TEMPLATE_ROOM, providerId: null, name: "Hợp đồng thuê phòng trọ (Tiêu chuẩn)", description: "Mẫu hợp đồng thuê phòng trọ tiêu chuẩn, dựa trên Luật Nhà ở.",
        content: { title: "HỢP ĐỒNG THUÊ PHÒNG TRỌ", sections: ["Thông tin các bên", "Đặc điểm tài sản thuê", "Giá thuê & Thanh toán", "Quyền và Nghĩa vụ", "Chấm dứt hợp đồng", "Cam kết chung"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_APARTMENT, providerId: null, name: "Hợp đồng thuê căn hộ chung cư", description: "Mẫu hợp đồng thuê căn hộ chung cư dài hạn, đầy đủ pháp lý.",
        content: { title: "HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ", sections: ["Căn cứ pháp lý (Bộ luật Dân sự 2015, Luật Nhà ở)", "Thông tin các bên", "Thông tin Căn hộ", "Giá thuê, Tiền cọc & Thanh toán", "Trách nhiệm các bên", "Quy định quản lý chung cư", "Chấm dứt hợp đồng"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_CLEANING, providerId: null, name: "Hợp đồng dịch vụ vệ sinh", description: "Hợp đồng cung cấp dịch vụ dọn dẹp vệ sinh nhà ở/văn phòng.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ VỆ SINH", sections: ["Thông tin các bên", "Nội dung dịch vụ", "Chi phí & Thanh toán", "Bảo hành dịch vụ", "Xử lý bồi thường hư hại tài sản"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_MAINTENANCE, providerId: null, name: "Hợp đồng bảo trì, sửa chữa", description: "Hợp đồng sửa chữa, bảo trì điện nước.",
        content: { title: "HỢP ĐỒNG SỬA CHỮA, BẢO TRÌ DỊCH VỤ", sections: ["Thông tin các bên", "Nghiệp vụ sửa chữa", "Phí dịch vụ & Vật tư", "Cam kết chất lượng (Bảo hành)", "Điều khoản bồi thường vi phạm"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_PARKING, providerId: null, name: "Hợp đồng cung cấp dịch vụ trông giữ xe", description: "Hợp đồng gửi xe ô tô, xe máy tại bãi đỗ xe nội khu.",
        content: { title: "HỢP ĐỒNG DỊCH VỤ TRÔNG GIỮ PHƯƠNG TIỆN", sections: ["Căn cứ pháp lý (Bộ luật Dân sự 2015)", "Thông tin các bên & Đặc điểm phương tiện", "Mức phí & Phương thức thanh toán", "Nghĩa vụ và Quyền hạn của Bên nhận giữ", "Trách nhiệm bồi thường thiệt hại"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_INTERNET, providerId: null, name: "Hợp đồng cung cấp Internet / Viễn thông", description: "Hợp đồng đăng ký dịch vụ mạng Internet, truyền hình cáp nội bộ.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ VIỄN THÔNG", sections: ["Thông tin các bên", "Gói cước & Băng thông", "Chi phí lắp đặt & Cước phí hàng tháng", "Cam kết chất lượng đường truyền (SLA)", "Bảo quản thiết bị", "Quy định cấm vi phạm pháp luật mạng"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_MANAGEMENT, providerId: null, name: "Hợp đồng Dịch vụ Quản lý vận hành", description: "Hợp đồng thu phí quản lý, vận hành tòa nhà, chung cư, khu dân cư.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ QUẢN LÝ VẬN HÀNH", sections: ["Căn cứ pháp lý (Thông tư 05/2024/TT-BXD, Luật Nhà ở 2023)", "Phạm vi công việc (Bảo vệ, Vệ sinh chung, PCCC)", "Đơn giá & Quy định đóng phí", "Quyền và Trách nhiệm của Ban quản lý", "Quyền và Trách nhiệm của Cư dân"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_AMENITIES, providerId: null, name: "Thỏa thuận sử dụng Tiện ích nội khu", description: "Quy định và thỏa thuận đăng ký sử dụng Gym, Hồ bơi, khu BBQ.",
        content: { title: "THỎA THUẬN SỬ DỤNG TIỆN ÍCH NỘI KHU", sections: ["Thông tin hội viên", "Danh sách tiện ích đăng ký", "Phí duy trì (Thẻ tháng/Năm)", "Nội quy an toàn & Trật tự", "Miễn trừ trách nhiệm tai nạn cá nhân"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_UTILITIES, providerId: null, name: "Hợp đồng cung cấp Dịch vụ Điện / Nước", description: "Hợp đồng mua bán điện, nước sạch sinh hoạt căn hộ/phòng trọ.",
        content: { title: "HỢP ĐỒNG CUNG CẤP VÀ SỬ DỤNG ĐIỆN NƯỚC", sections: ["Căn cứ pháp lý (Luật Điện lực, Nghị định 117)", "Chủ thể hợp đồng", "Quy định chỉ số & Đơn giá", "Chốt số & Thanh toán", "Quyền và Nghĩa vụ các bên", "Điều kiện tạm ngừng cấp dịch vụ"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_FITOUT, providerId: null, name: "Thỏa thuận thi công nội thất (Fit-out)", description: "Cam kết thi công sửa chữa, làm nội thất căn hộ an toàn.",
        content: { title: "THỎA THUẬN THI CÔNG SỬA CHỮA CĂN HỘ", sections: ["Thông tin Chủ hộ & Nhà thầu", "Phạm vi công việc & Bản vẽ", "Tiền cọc đảm bảo", "Nội quy thi công (PCCC, Giờ giấc, Tiếng ồn)", "Bồi thường hư hại"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_WASTE, providerId: null, name: "Hợp đồng Dịch vụ thu gom Rác thải sinh hoạt", description: "Cung cấp dịch vụ thu gom rác định kỳ cho cơ sở/hộ gia đình.",
        content: { title: "HỢP ĐỒNG DỊCH VỤ THU GOM RÁC THẢI SINH HOẠT", sections: ["Thông tin các bên", "Quy định phân loại rác tại nguồn", "Khối lượng & Lịch thu gom", "Chi phí & Thanh toán", "Chế tài vi phạm phân loại rác"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_FOOD, providerId: null, name: "Hợp đồng cung cấp Suất ăn / Catering", description: "Cung cấp suất ăn định kỳ (cơm tháng) hoặc đặt tiệc tận nơi.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ ĂN UỐNG", sections: ["Thông tin các bên", "Thực đơn & Đơn giá", "Giao nhận & Thời gian", "Cam kết Vệ sinh An toàn Thực phẩm", "Xử lý sự cố & Bồi thường y tế"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_LAUNDRY, providerId: null, name: "Hợp đồng Dịch vụ Giặt ủi", description: "Dịch vụ giặt sấy, ủi đồ định kỳ (giao nhận tận cửa).",
        content: { title: "HỢP ĐỒNG DỊCH VỤ GIẶT ỦI", sections: ["Thông tin các bên", "Bảng giá & Khối lượng", "Quy trình giao nhận & Kiểm đếm", "Bồi thường hư hại, rách, mất mát", "Quy định xử lý hóa chất"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_OTHER, providerId: null, name: "Hợp đồng Cung cấp Dịch vụ (Mẫu chung)", description: "Mẫu hợp đồng linh hoạt dành cho các loại hình dịch vụ khác chưa phân loại.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ", sections: ["Thông tin các bên", "Nội dung công việc & Tiêu chuẩn nghiệm thu", "Phí dịch vụ & Phương thức thanh toán", "Quyền lợi và Trách nhiệm", "Bồi thường thiệt hại & Giải quyết tranh chấp"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
    ],
    skipDuplicates: true,
  });

  // CONTRACTS
  await prisma.contract.createMany({
    data: [
      { id: IDS.contracts.CONTRACT_1, providerId: USERS.PROVIDER_RESIDENCE, contractNumber: "HD-2026-0001", roomId: ROOMS.ROOM_101, customerId: USERS.CUSTOMER, startDate: new Date("2026-08-01"), endDate: new Date("2027-08-01"), status: "ACTIVE", requireSignature: true, signedAt: new Date("2026-07-31"), createdAt: now, updatedAt: now },
      { id: IDS.contracts.CONTRACT_2, providerId: USERS.PROVIDER_RESIDENCE, contractNumber: "HD-2026-0002", roomId: ROOMS.ROOM_102, customerId: "30000000-0000-0000-0000-000000000002", startDate: new Date("2026-08-01"), endDate: new Date("2027-08-01"), status: "ACTIVE", requireSignature: true, signedAt: new Date("2026-07-31"), createdAt: now, updatedAt: now },
      // Edge cases
      { id: IDS.contracts.CONTRACT_DRAFT, providerId: USERS.PROVIDER_RESIDENCE, contractNumber: "HD-2026-DRAFT", roomId: ROOMS.ROOM_101, customerId: USERS.CUSTOMER, startDate: new Date("2026-09-01"), endDate: new Date("2027-09-01"), status: "DRAFT", requireSignature: true, signedAt: null, createdAt: now, updatedAt: now },
      { id: IDS.contracts.CONTRACT_EXPIRED, providerId: USERS.PROVIDER_RESIDENCE, contractNumber: "HD-2024-0001", roomId: ROOMS.ROOM_102, customerId: USERS.CUSTOMER, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), status: "EXPIRED", requireSignature: true, signedAt: new Date("2023-12-31"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT SERVICES
  await prisma.contractService.createMany({
    data: [
      { id: IDS.contractServices.CS_1, contractId: IDS.contracts.CONTRACT_1, servicePriceId: CATALOG.ROOM, quantity: 1, createdAt: now },
      { id: IDS.contractServices.CS_2, contractId: IDS.contracts.CONTRACT_1, servicePriceId: CATALOG.CLEANING, quantity: 2, createdAt: now },
      { id: IDS.contractServices.CS_3, contractId: IDS.contracts.CONTRACT_2, servicePriceId: CATALOG.ROOM, quantity: 1, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // BILLING PERIODS
  await prisma.billingPeriod.createMany({
    data: [
      { id: IDS.periods.PERIOD_1, contractId: IDS.contracts.CONTRACT_1, periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), createdAt: now, updatedAt: now },
      { id: IDS.periods.PERIOD_2, contractId: IDS.contracts.CONTRACT_2, periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT TERMS
  await prisma.contractTerm.createMany({
    data: [
      { id: IDS.contractTerms.CT_1, contractId: IDS.contracts.CONTRACT_1, termId: IDS.terms.TERM_1, createdAt: now },
      { id: IDS.contractTerms.CT_2, contractId: IDS.contracts.CONTRACT_1, termId: IDS.terms.TERM_2, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // VIOLATION RULES
  await prisma.violationRule.createMany({
    data: [
      { id: IDS.violationRules.RULE_LATE_PAYMENT, name: "Thanh toán trễ hạn", description: "Khách hàng không thanh toán đúng hạn trên 3 ngày", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_DAMAGE, name: "Gây hư hỏng tài sản", description: "Làm hư hỏng tài sản nhà ở hoặc tài sản của bên thứ ba", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_NOISE, name: "Gây ồn ào mất trật tự", description: "Làm ồn quá mức sau 22h đêm ảnh hưởng xung quanh", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_CONTRACT_BREAK, name: "Đơn phương phá hợp đồng", description: "Chấm dứt hợp đồng trước hạn không lý do chính đáng", targetType: "BOTH", isActive: true, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // VIOLATION CASES
  await prisma.violationCase.createMany({
    data: [
      { id: IDS.violationCases.CASE_1, violationRuleId: IDS.violationRules.RULE_LATE_PAYMENT, contractId: IDS.contracts.CONTRACT_1, reportedBy: USERS.PROVIDER_RESIDENCE, serviceId: null, status: "REPORTED", description: "Khách hàng chậm đóng tiền nhà tháng 8", occurredAt: new Date("2026-08-06"), createdAt: now, updatedAt: now },
      { id: IDS.violationCases.CASE_2, violationRuleId: IDS.violationRules.RULE_DAMAGE, contractId: IDS.contracts.CONTRACT_1, reportedBy: USERS.PROVIDER_RESIDENCE, serviceId: null, status: "RESOLVED", description: "Làm vỡ kính cửa sổ", occurredAt: new Date("2026-08-10"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // TEMPLATE VARIABLES
  await prisma.templateVariable.createMany({
    data: [
      { id: "78000000-0000-0000-0000-000000000001", key: "{{customer.name}}", label: "Tên khách hàng", groupName: "Khách hàng" },
      { id: "78000000-0000-0000-0000-000000000002", key: "{{customer.cccd}}", label: "CMND/CCCD", groupName: "Khách hàng" },
      { id: "78000000-0000-0000-0000-000000000003", key: "{{customer.phone}}", label: "Số điện thoại", groupName: "Khách hàng" },
      { id: "78000000-0000-0000-0000-000000000004", key: "{{provider.companyName}}", label: "Tên nhà cung cấp", groupName: "Nhà cung cấp" },
      { id: "78000000-0000-0000-0000-000000000005", key: "{{provider.representative}}", label: "Người đại diện", groupName: "Nhà cung cấp" },
      { id: "78000000-0000-0000-0000-000000000006", key: "{{contract.startDate}}", label: "Ngày bắt đầu", groupName: "Hợp đồng" },
      { id: "78000000-0000-0000-0000-000000000007", key: "{{contract.endDate}}", label: "Ngày kết thúc", groupName: "Hợp đồng" },
      { id: "78000000-0000-0000-0000-000000000008", key: "{{contract.deposit}}", label: "Tiền cọc", groupName: "Hợp đồng" },
      { id: "78000000-0000-0000-0000-000000000009", key: "{{property.address}}", label: "Địa chỉ tài sản", groupName: "Tài sản/Dịch vụ" },
      { id: "78000000-0000-0000-0000-000000000010", key: "{{property.area}}", label: "Diện tích", groupName: "Tài sản/Dịch vụ" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Contract seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
