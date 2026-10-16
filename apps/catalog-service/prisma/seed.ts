import { PrismaClient } from "@prisma/client-catalog";

const prisma = new PrismaClient();

// Cross-service UUID generators (Đồng bộ chuẩn 100% với identity, contract, billing, notification, audit)
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const categoryId = (n: number) => `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const priceId = (n: number) => `62000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const imageId = (n: number) => `63000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scheduleId = (n: number) => `64000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ruleId = (n: number) => `65000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tierId = (n: number) => `66000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const propertyId = (n: number) => `67000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const blockId = (n: number) => `68000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const floorId = (n: number) => `69000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roomTypeId = (n: number) => `6a000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const requirementId = (n: number) => `6c000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractTemplateId = (n: number) => `7c000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const now = new Date();

// Danh mục dịch vụ chuẩn
const categories = [
    { id: 1, name: "Cho thuê Bất động sản", desc: "Căn hộ chung cư, phòng trọ sinh viên, căn hộ dịch vụ cao cấp." },
    { id: 2, name: "Vệ sinh & Dọn dẹp", desc: "Dọn dẹp nhà cửa, giặt ủi công nghiệp, vệ sinh sofa, nệm, rèm." },
    { id: 3, name: "Bảo trì & Sửa chữa", desc: "Sửa chữa điện nước dân dụng, cơ điện lạnh, mở khóa khẩn cấp 24/7." },
    { id: 4, name: "Ăn uống & Thực phẩm", desc: "Cơm trưa văn phòng, suất ăn gia đình sạch và giao tận nơi." },
    { id: 5, name: "Viễn thông & An ninh", desc: "Cáp quang Internet tốc độ cao, camera an ninh, dịch vụ bảo vệ." },
    { id: 6, name: "Tiện ích Đời sống", desc: "Nước uống đóng bình, chuyển nhà trọn gói, nội thất và cứu hộ IT." },
];

// Danh sách 10 Bất động sản có thật tại TP.HCM (Khớp với 10 Property Managers từ identity seed)
const propertiesData = [
    {
        id: 1,
        providerNum: 1,
        name: "Vinhomes Central Park",
        desc: "Khu đô thị sinh thái hiện đại ven sông Sài Gòn với công viên 14ha, đầy đủ tiện ích chuẩn 5 sao.",
        address: "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM",
        lat: 10.795000,
        lng: 106.721800,
        blocks: ["Landmark 1", "Landmark Plus"],
        roomTypes: [
            { name: "Căn Hộ 1PN Landmark Luxury", area: 54.5, occupancy: 2, price: 16000000, desc: "Căn hộ 1 phòng ngủ full nội thất ngoại nhập, view công viên Landmark." },
            { name: "Căn Hộ 2PN Panoramic River", area: 79.2, occupancy: 4, price: 23000000, desc: "Căn hộ 2 phòng ngủ 2WC ban công trực diện sông Sài Gòn, bếp đảo sang trọng." },
        ],
    },
    {
        id: 2,
        providerNum: 2,
        name: "Ký túc xá Cỏ May",
        desc: "Mô hình ký túc xá thiện nguyện và giáo dục hiện đại dành cho sinh viên vượt khó học giỏi.",
        address: "Khu đô thị Đại học Quốc gia, Phường Linh Trung, TP. Thủ Đức, TP.HCM",
        lat: 10.870100,
        lng: 106.802300,
        blocks: ["Khu Nam Sinh Viên", "Khu Nữ Sinh Viên"],
        roomTypes: [
            { name: "Phòng KTX Tiêu Chuẩn 4 Người", area: 32.0, occupancy: 4, price: 1200000, desc: "Phòng 4 giường tầng cao cấp, bàn học riêng, tủ cá nhân và WC khép kín." },
            { name: "Phòng KTX Nâng Cao 2 Người", area: 24.0, occupancy: 2, price: 2000000, desc: "Phòng 2 giường đơn yên tĩnh có máy lạnh Inverter, ban công đón gió trời." },
        ],
    },
    {
        id: 3,
        providerNum: 3,
        name: "Căn hộ dịch vụ CityHouse Pham Ngoc Thach",
        desc: "Chuỗi căn hộ dịch vụ phong cách Boutique tọa lạc tại trung tâm ngoại giao Quận 3.",
        address: "17 Phạm Ngọc Thạch, Phường Võ Thị Sáu, Quận 3, TP.HCM",
        lat: 10.783400,
        lng: 106.696100,
        blocks: ["Tháp Boutique A", "Tháp Boutique B"],
        roomTypes: [
            { name: "Studio Tiêu Chuẩn Trung Tâm", area: 35.0, occupancy: 2, price: 12500000, desc: "Phòng Studio thông minh có bếp nhỏ, máy giặt riêng và dịch vụ dọn phòng 2 lần/tuần." },
            { name: "Suite 1 Phòng Ngủ Ban Công", area: 48.0, occupancy: 2, price: 17000000, desc: "Phòng Suite tiện nghi với bồn tắm nằm, smart TV 55 inch và nội thất gỗ sồi." },
        ],
    },
    {
        id: 4,
        providerNum: 4,
        name: "Masteri Thảo Điền",
        desc: "Khu phức hợp căn hộ cao cấp kết nối trực tiếp ga Metro số 7 An Phú, Thảo Điền.",
        address: "159 Xa Lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
        lat: 10.803200,
        lng: 106.741200,
        blocks: ["Tháp T1", "Tháp T2"],
        roomTypes: [
            { name: "Căn Hộ 2PN Masteri View Metro", area: 68.0, occupancy: 4, price: 18500000, desc: "Căn hộ 2 phòng ngủ thiết kế mở, sàn gỗ nhập khẩu, bếp từ và lò nướng âm tủ." },
            { name: "Căn Hộ 3PN Góc View Sông", area: 89.5, occupancy: 5, price: 26000000, desc: "Căn góc 3 phòng ngủ thoáng mát, đón gió tự nhiên 3 mặt, tiện ích hồ bơi resort." },
        ],
    },
    {
        id: 5,
        providerNum: 5,
        name: "Chung cư Eco Green Sài Gòn",
        desc: "Tổ hợp thương mại dịch vụ và căn hộ xanh hiện đại nhất Nam Sài Gòn trên mặt tiền Nguyễn Văn Linh.",
        address: "39/8B Nguyễn Văn Linh, Phường Tân Thuận Tây, Quận 7, TP.HCM",
        lat: 10.748500,
        lng: 106.711500,
        blocks: ["Tòa HR1", "Tòa HR2"],
        roomTypes: [
            { name: "Căn Hộ 2PN Eco Comfort", area: 65.0, occupancy: 4, price: 14000000, desc: "Căn hộ 2 phòng ngủ view công viên nội khu Hương Tràm 22ha xanh mát." },
            { name: "Căn Hộ 3PN Eco Grand", area: 86.0, occupancy: 6, price: 19500000, desc: "Căn hộ 3 phòng ngủ trang bị kính Low-E cản nhiệt, máy lạnh trung tâm Daikin." },
        ],
    },
    {
        id: 6,
        providerNum: 6,
        name: "Khu căn hộ EHome 3 Tây Sài Gòn",
        desc: "Căn hộ cộng đồng chất lượng cao của tập đoàn Nam Long, không gian sống xanh văn minh.",
        address: "Hồ Học Lãm, Phường An Lạc, Quận Bình Tân, TP.HCM",
        lat: 10.723100,
        lng: 106.612400,
        blocks: ["Block A1", "Block A2"],
        roomTypes: [
            { name: "Căn Hộ Ấm Cúng 1PN+1", area: 50.0, occupancy: 3, price: 6500000, desc: "Thiết kế tối ưu 1 phòng ngủ lớn và 1 không gian mở đa năng cho gia đình trẻ." },
            { name: "Căn Hộ Gia Đình 2PN", area: 64.0, occupancy: 4, price: 8500000, desc: "Căn hộ 2 phòng ngủ 2 vệ sinh riêng biệt, sân phơi rộng rãi nhiều ánh sáng." },
        ],
    },
    {
        id: 7,
        providerNum: 7,
        name: "Sunrise City Quận 7",
        desc: "Biểu tượng sống đẳng cấp tại cửa ngõ Nam Sài Gòn, đối diện Lotte Mart Quận 7.",
        address: "23 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM",
        lat: 10.756200,
        lng: 106.698500,
        blocks: ["Khu South Tower", "Khu Central Tower"],
        roomTypes: [
            { name: "Căn Hộ 1PN Sunrise Executive", area: 56.0, occupancy: 2, price: 13500000, desc: "Căn hộ cao cấp 1 phòng ngủ sàn gỗ tự nhiên, thiết bị vệ sinh Kohler." },
            { name: "Căn Hộ 2PN Sunrise Prime", area: 76.0, occupancy: 4, price: 18000000, desc: "Căn hộ 2 phòng ngủ hiện đại với ban công rộng, tích hợp hồ bơi tràn chân mây." },
        ],
    },
    {
        id: 8,
        providerNum: 8,
        name: "Ký túc xá Sinh viên ĐHQG TP.HCM - Khu B",
        desc: "Khu ký túc xá sinh viên lớn nhất Đông Nam Á, đầy đủ tiện ích thể thao, xe buýt, căn tin.",
        address: "Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP.HCM",
        lat: 10.878500,
        lng: 106.799500,
        blocks: ["Tòa Nhà B1", "Tòa Nhà B2"],
        roomTypes: [
            { name: "Phòng KTX Sinh Viên 6 Người", area: 38.0, occupancy: 6, price: 600000, desc: "Mỗi sinh viên 1 giường tầng, tủ khóa sắt an toàn, kết nối wifi ĐHQG miễn phí." },
            { name: "Phòng KTX Chất Lượng Cao 4 Người", area: 38.0, occupancy: 4, price: 1400000, desc: "Phòng gắn máy lạnh, bình nước nóng năng lượng mặt trời, tủ lạnh cá nhân." },
        ],
    },
    {
        id: 9,
        providerNum: 9,
        name: "Dãy Nhà Trọ Sinh Viên Hoàng Phát",
        desc: "Hệ thống nhà trọ mới xây an ninh, cổng vân tay, camera 24/24 gần trường Đại học Sư phạm Kỹ thuật.",
        address: "45 Đường số 8, Phường Linh Trung, TP. Thủ Đức, TP.HCM",
        lat: 10.865000,
        lng: 106.772000,
        blocks: ["Dãy Trọ Trệt", "Dãy Trọ Lầu"],
        roomTypes: [
            { name: "Phòng Trọ Gác Lửng Cao 20m²", area: 20.0, occupancy: 2, price: 3200000, desc: "Gác lửng đúc bê tông đứng không chạm đầu, kệ bếp ốp đá hoa cương, giờ giấc tự do." },
            { name: "Phòng Trọ Ban Công Thoáng 25m²", area: 25.0, occupancy: 3, price: 4200000, desc: "Có ban công riêng phơi đồ, cửa sổ trời mát mẻ, cho nuôi thú cưng nhỏ." },
        ],
    },
    {
        id: 10,
        providerNum: 10,
        name: "Căn hộ mini Hàng Xanh Residence",
        desc: "Căn hộ mini studio cách ngã tư Hàng Xanh 300m, thuận tiện di chuyển sang Quận 1 chỉ 5 phút.",
        address: "185 Xô Viết Nghệ Tĩnh, Phường 17, Bình Thạnh, TP.HCM",
        lat: 10.798000,
        lng: 106.710000,
        blocks: ["Khu Căn Hộ A", "Khu Căn Hộ B"],
        roomTypes: [
            { name: "Studio Full Nội Thất 26m²", area: 26.0, occupancy: 2, price: 6200000, desc: "Full nội thất: Giường nệm, tủ quần áo, máy lạnh, máy giặt riêng, khóa từ vân tay." },
            { name: "Phòng 1PN Riêng Biệt 36m²", area: 36.0, occupancy: 2, price: 8200000, desc: "Phòng khách và phòng ngủ riêng biệt, bếp tách mùi, ánh sáng ngập tràn." },
        ],
    },
];

// 25 Dịch vụ ngoài (External Services) từ 15 nhà cung cấp chuyên nghiệp (Provider 11 -> 25)
const externalServicesData = [
    // Provider 11: Sakura Giặt ủi
    {
        providerNum: 11,
        catId: 2,
        name: "Giặt sấy lấy liền trong ngày",
        desc: "Giặt sấy thơm tho, gấp gọn ngăn nắp bằng nước giặt hữu cơ, giao nhận tận phòng trong 4 giờ.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "RECURRING" as const,
        price: 25000,
        unit: "kg",
        img: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800",
    },
    {
        providerNum: 11,
        catId: 2,
        name: "Giặt hấp cao cấp áo vest & đầm dạ hội",
        desc: "Quy trình giặt khô công nghệ Nhật Bản, giữ phom dáng nguyên bản, bảo vệ sợi vải tinh tế.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 90000,
        unit: "bộ",
        img: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800",
    },
    // Provider 12: Vệ sinh Hoàn Mỹ
    {
        providerNum: 12,
        catId: 2,
        name: "Tổng vệ sinh căn hộ sau xây dựng / chuyển nhà",
        desc: "Vệ sinh chuyên sâu bằng máy hút bụi công nghiệp Karcher, lau kính, khử mùi ozone toàn diện.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 1600000,
        unit: "căn",
        img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
    },
    {
        providerNum: 12,
        catId: 2,
        name: "Giặt sofa, nệm và rèm cửa tại nhà",
        desc: "Phun hút hơi nước nóng 140 độ C diệt khuẩn 99.9%, hút sạch mạt bụi gây dị ứng da.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 350000,
        unit: "bộ",
        img: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800",
    },
    // Provider 13: Điện nước Minh Trí
    {
        providerNum: 13,
        catId: 3,
        name: "Sửa chữa hệ thống điện chập cháy dân dụng",
        desc: "Thợ kỹ thuật có chứng chỉ kiểm tra rò điện, thay CB tự ngắt, đi lại dây điện âm tường an toàn.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 250000,
        unit: "lần",
        img: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800",
    },
    {
        providerNum: 13,
        catId: 3,
        name: "Thông tắc đường ống lavabo & bồn cầu",
        desc: "Sử dụng máy lò xo chuyên dụng không đục phá sàn, xử lý triệt để mùi hôi cống thoát nước.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 300000,
        unit: "lần",
        img: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800",
    },
    // Provider 14: Điện lạnh Á Châu
    {
        providerNum: 14,
        catId: 3,
        name: "Vệ sinh máy lạnh treo tường & xịt khử khuẩn",
        desc: "Tháo mặt nạ, vệ sinh dàn lạnh và dàn nóng bằng bơm áp lực, tặng kèm gói kiểm tra gas miễn phí.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 180000,
        unit: "máy",
        img: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800",
    },
    {
        providerNum: 14,
        catId: 3,
        name: "Nạp gas máy lạnh R32 / R410A chính hãng",
        desc: "Kiểm tra rò rỉ tán loe, hút chân không và nạp đủ áp suất gas chuẩn kỹ thuật nhà sản xuất.",
        type: "FIXED" as const,
        servType: "ADDITION" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 350000,
        unit: "lần",
        img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
    },
    // Provider 15: JupViec Dọn dẹp
    {
        providerNum: 15,
        catId: 2,
        name: "Giúp việc nhà theo giờ định kỳ",
        desc: "Nhân viên đào tạo bài bản, lý lịch rõ ràng: Lau nhà, dọn bếp, ủi đồ, chuẩn bị bữa ăn gia đình.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "RECURRING" as const,
        price: 85000,
        unit: "giờ",
        img: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800",
    },
    {
        providerNum: 15,
        catId: 2,
        name: "Gói giúp việc cố định theo tháng (3 buổi/tuần)",
        desc: "Tiết kiệm 20% chi phí, bảo đảm cùng một nhân viên quen việc đến làm việc đúng khung giờ.",
        type: "FIXED" as const,
        servType: "ADDITION" as const,
        calc: "FIXED" as const,
        freq: "RECURRING" as const,
        price: 2400000,
        unit: "tháng",
        img: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=800",
    },
    // Provider 16: Rentokil Diệt côn trùng
    {
        providerNum: 16,
        catId: 3,
        name: "Phun xịt muỗi và diệt gián Đức sinh học",
        desc: "Thuốc sinh học Bayer không mùi, an toàn tuyệt đối cho trẻ nhỏ và thú cưng, bảo hành 3 tháng.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 550000,
        unit: "lần",
        img: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800",
    },
    {
        providerNum: 16,
        catId: 3,
        name: "Xử lý và phòng chống mối mọt công trình",
        desc: "Đặt hộp nhử mối công nghệ lây nhiễm lan truyền, triệt tiêu tận gốc tổ mối chúa dưới lòng đất.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 1800000,
        unit: "gói",
        img: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800",
    },
    // Provider 17: AquaWater Nước suối
    {
        providerNum: 17,
        catId: 6,
        name: "Bình nước khoáng thiên nhiên Lavie 19L (Có vòi)",
        desc: "Khai thác từ nguồn khoáng tự nhiên sâu trong lòng đất, giàu khoáng chất Canxi, Magie, Kali.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "RECURRING" as const,
        price: 68000,
        unit: "bình",
        img: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800",
    },
    {
        providerNum: 17,
        catId: 6,
        name: "Bình nước tinh khiết Aquafina 20L",
        desc: "Nước tinh khiết qua quy trình thanh lọc Hydro-7 tiêu chuẩn Hoa Kỳ, vị ngọt mát sảng khoái.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "RECURRING" as const,
        price: 55000,
        unit: "bình",
        img: "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800",
    },
    // Provider 18: Sửa khóa nhanh 24/7
    {
        providerNum: 18,
        catId: 3,
        name: "Mở khóa cửa nhà, cửa phòng khẩn cấp",
        desc: "Có mặt trong 15 phút, kỹ thuật mở bi không phá khóa, giữ nguyên ổ khóa ban đầu của chủ nhà.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 150000,
        unit: "lần",
        img: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800",
    },
    {
        providerNum: 18,
        catId: 3,
        name: "Thay lắp khóa vân tay thông minh cửa chính",
        desc: "Cung cấp và lắp đặt khóa vân tay Philips / Kaadas mã số, thẻ từ, kết nối app điện thoại.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 3800000,
        unit: "bộ",
        img: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800",
    },
    // Provider 19: Camera Đạt Phát
    {
        providerNum: 19,
        catId: 5,
        name: "Lắp đặt trọn gói Camera an ninh Wifi EZVIZ",
        desc: "Camera xoay 360 độ độ phân giải 2K, đàm thoại 2 chiều, phát hiện người bằng trí tuệ nhân tạo AI.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 750000,
        unit: "máy",
        img: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800",
    },
    // Provider 20: Viettel Cáp Quang
    {
        providerNum: 20,
        catId: 5,
        name: "Gói Internet Cáp Quang Sinh Viên FAST2 (150Mbps)",
        desc: "Băng thông 150Mbps không giới hạn dung lượng, trang bị miễn phí Modem WiFi 6 2 băng tần.",
        type: "FIXED" as const,
        servType: "ADDITION" as const,
        calc: "FIXED" as const,
        freq: "RECURRING" as const,
        price: 180000,
        unit: "tháng",
        img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
    },
    {
        providerNum: 20,
        catId: 5,
        name: "Gói Combo Internet 250Mbps + Truyền hình TV360",
        desc: "Xem trọn vẹn 160 kênh truyền hình HD, giải Ngoại hạng Anh, kho phim bom tấn chiếu rạp 4K.",
        type: "FIXED" as const,
        servType: "ADDITION" as const,
        calc: "FIXED" as const,
        freq: "RECURRING" as const,
        price: 240000,
        unit: "tháng",
        img: "https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800",
    },
    // Provider 21: Hoàng Long Security
    {
        providerNum: 21,
        catId: 5,
        name: "Thuê bảo vệ trực an ninh sự kiện theo giờ",
        desc: "Vệ sĩ chuyên nghiệp chiều cao từ 1m75, có võ thuật, đồng phục chỉnh tề, kiểm soát an ninh nghiêm ngặt.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 120000,
        unit: "giờ",
        img: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800",
    },
    // Provider 22: Thành Hưng Chuyển Nhà
    {
        providerNum: 22,
        catId: 6,
        name: "Chuyển phòng trọ trọn gói bằng xe tải 750kg",
        desc: "Bao gồm xe tải, tài xế và 2 nhân viên bốc xếp, đóng gói thùng carton miễn phí, bọc màng PE chống xước.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 850000,
        unit: "chuyến",
        img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    },
    // Provider 23: Nội Thất Xinh
    {
        providerNum: 23,
        catId: 6,
        name: "Thiết kế & lắp đặt bàn học sinh viên thông minh",
        desc: "Bàn học kết hợp giá sách gỗ MDF lõi xanh chống ẩm An Cường, bảo hành ray trượt và bản lề 2 năm.",
        type: "FIXED" as const,
        servType: "NORMAL" as const,
        calc: "FIXED" as const,
        freq: "ONE_TIME" as const,
        price: 2200000,
        unit: "bộ",
        img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800",
    },
    // Provider 24: Tâm Phát Thực Phẩm
    {
        providerNum: 24,
        catId: 4,
        name: "Suất cơm trưa dinh dưỡng giao tận nơi",
        desc: "Thực đơn thay đổi theo ngày, gồm món mặn, món xào, canh thanh nhiệt, tráng miệng hoa quả sạch VietGAP.",
        type: "QUANTITY" as const,
        servType: "ADDITION" as const,
        calc: "QUANTITY" as const,
        freq: "RECURRING" as const,
        price: 45000,
        unit: "suất",
        img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    },
    // Provider 25: ITCare
    {
        providerNum: 25,
        catId: 6,
        name: "Vệ sinh laptop & tra keo tản nhiệt MX-4 tại nhà",
        desc: "Tháo máy hút bụi quạt gió, tra keo tản nhiệt Arctic MX-4 cao cấp, giảm ngay 15-20 độ C nhiệt độ CPU.",
        type: "QUANTITY" as const,
        servType: "NORMAL" as const,
        calc: "QUANTITY" as const,
        freq: "ONE_TIME" as const,
        price: 150000,
        unit: "máy",
        img: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=800",
    },
];

async function main() {
    console.log("--> Đang seed Catalog Service...");

    // 1. CLEAR DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ PHỤ THUỘC
    await prisma.serviceImage.deleteMany();
    await prisma.serviceRequirement.deleteMany();
    await prisma.servicePriceTier.deleteMany();
    await prisma.servicePrice.deleteMany();
    await prisma.billingSchedule.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceBillingRule.deleteMany();
    await prisma.room.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.block.deleteMany();
    await prisma.roomType.deleteMany();
    await prisma.property.deleteMany();
    await prisma.category.deleteMany();

    // 2. CATEGORIES (6 Danh mục)
    await prisma.category.createMany({
        data: categories.map(c => ({
            id: categoryId(c.id),
            name: c.name,
            description: c.desc,
        })),
        skipDuplicates: true,
    });

    // 3. PROPERTIES (10 Bất động sản có thật)
    const propertyInserts = propertiesData.map(p => ({
        id: propertyId(p.id),
        providerId: providerId(p.providerNum),
        propertyName: p.name,
        description: p.desc,
        address: p.address,
        latitude: p.lat,
        longitude: p.lng,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.property.createMany({ data: propertyInserts, skipDuplicates: true });

    // 4. ROOM TYPES, BLOCKS, FLOORS & ROOMS (400 phòng với mã số P.101, P.202,...)
    const roomTypeInserts = [];
    const blockInserts = [];
    const floorInserts = [];
    const roomInserts = [];

    let totalRoomCount = 0;
    let roomTypeCounter = 1;
    let blockCounter = 1;
    let floorCounter = 1;

    for (let pIdx = 0; pIdx < propertiesData.length; pIdx++) {
        const prop = propertiesData[pIdx];
        const propDbId = propertyId(prop.id);

        // 2 Room Types per property (Tổng 20 loại phòng)
        const localRoomTypeIds: string[] = [];
        for (let rtIdx = 0; rtIdx < prop.roomTypes.length; rtIdx++) {
            const rt = prop.roomTypes[rtIdx];
            const rtDbId = roomTypeId(roomTypeCounter++);
            localRoomTypeIds.push(rtDbId);

            roomTypeInserts.push({
                id: rtDbId,
                propertyId: propDbId,
                typeName: rt.name,
                area: rt.area,
                maxOccupancy: rt.occupancy,
                description: rt.desc,
                status: "ACTIVE" as const,
                createdAt: now,
                updatedAt: now,
            });
        }

        // 2 Blocks per property (Tổng 20 Tòa)
        for (let bIdx = 0; bIdx < prop.blocks.length; bIdx++) {
            const blockName = prop.blocks[bIdx];
            const blockDbId = blockId(blockCounter++);

            blockInserts.push({
                id: blockDbId,
                propertyId: propDbId,
                blockName: blockName,
                status: "ACTIVE" as const,
                createdAt: now,
                updatedAt: now,
            });

            // 5 Floors per block (Tổng 100 Tầng)
            for (let fIdx = 1; fIdx <= 5; fIdx++) {
                const floorDbId = floorId(floorCounter++);

                floorInserts.push({
                    id: floorDbId,
                    blockId: blockDbId,
                    floorName: `Tầng ${fIdx}`,
                    status: "ACTIVE" as const,
                    createdAt: now,
                    updatedAt: now,
                });

                // 4 Rooms per floor (Tổng 400 Phòng)
                for (let rIdx = 1; rIdx <= 4; rIdx++) {
                    totalRoomCount++;
                    const roomDbId = roomId(totalRoomCount);
                    const roomNumber = `P.${fIdx}${String(rIdx).padStart(2, "0")}`; // e.g., P.101, P.102

                    // Phân bổ trạng thái phòng thực tế: 85% ACTIVE, 10% MAINTENANCE, 5% INACTIVE
                    let status: "ACTIVE" | "MAINTENANCE" | "INACTIVE" = "ACTIVE";
                    if (totalRoomCount % 10 === 0) {
                        status = "MAINTENANCE";
                    } else if (totalRoomCount % 20 === 0) {
                        status = "INACTIVE";
                    }

                    // Ghép loại phòng tương ứng
                    const assignedRoomTypeId = localRoomTypeIds[rIdx % 2];

                    roomInserts.push({
                        id: roomDbId,
                        roomTypeId: assignedRoomTypeId,
                        floorId: floorDbId,
                        roomNumber: roomNumber,
                        status: status,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
        }
    }

    await prisma.roomType.createMany({ data: roomTypeInserts, skipDuplicates: true });
    await prisma.block.createMany({ data: blockInserts, skipDuplicates: true });
    await prisma.floor.createMany({ data: floorInserts, skipDuplicates: true });

    // Insert rooms theo chunks
    for (let i = 0; i < roomInserts.length; i += 200) {
        await prisma.room.createMany({ data: roomInserts.slice(i, i + 200), skipDuplicates: true });
    }

    // 5. SERVICES, BILLING RULES, SCHEDULES, PRICES & IMAGES
    const ruleInserts = [];
    const serviceInserts = [];
    const scheduleInserts = [];
    const priceInserts = [];
    const imageInserts = [];
    const requirementInserts = [];

    let serviceCounter = 1;
    let ruleCounter = 1;
    let priceCounter = 1;
    let imageCounter = 1;
    let reqCounter = 1;

    // A. 10 Dịch vụ thuê phòng (Housing) cho 10 Bất động sản
    for (let i = 0; i < propertiesData.length; i++) {
        const prop = propertiesData[i];
        const sId = serviceId(serviceCounter);
        const rId = ruleId(ruleCounter);
        const pId = priceId(priceCounter);
        const sSchedId = scheduleId(serviceCounter);

        // Quy tắc tính tiền phòng: FIXED hàng tháng, Proration theo ngày
        ruleInserts.push({
            id: rId,
            calculationMethod: "FIXED" as const,
            billingFrequency: "RECURRING" as const,
            billingIntervalValue: 1,
            billingIntervalUnit: "MONTH" as const,
            prorationMethod: "DAILY" as const,
            usageSource: false,
            createdAt: now,
            updatedAt: now,
        });

        // Dịch vụ thuê phòng chính (NORMAL)
        serviceInserts.push({
            id: sId,
            name: `Thuê phòng / Căn hộ tại ${prop.name}`,
            description: `Hợp đồng thuê phòng lưu trú dài hạn với đầy đủ tiện ích và quản lý chuyên nghiệp tại ${prop.name}.`,
            status: "ACTIVE" as const,
            address: prop.address,
            latitude: prop.lat,
            longitude: prop.lng,
            requiresPrepayment: true,
            requiresContract: true,
            contractTemplateId: contractTemplateId(1), // Gắn Template Hợp đồng thuê nhà ở chuẩn (Template 1)
            providerId: providerId(prop.providerNum),
            categoryId: categoryId(1), // Danh mục Cho thuê BĐS
            billingRuleId: rId,
            serviceType: "NORMAL" as const,
            roomTypeId: roomTypeId(i * 2 + 1),
            createdAt: now,
            updatedAt: now,
        });

        scheduleInserts.push({
            id: sSchedId,
            serviceId: sId,
            billingDay: 1,
            dueDays: 5,
            createdAt: now,
            updatedAt: now,
        });

        // Bảng giá thuê phòng
        priceInserts.push({
            id: pId,
            createdBy: userId(1),
            serviceId: sId,
            price: String(prop.roomTypes[0].price),
            unit: "tháng",
            effectiveFrom: new Date("2025-01-01"),
            effectiveTo: null,
            createdAt: now,
        });

        imageInserts.push({
            id: imageId(imageCounter++),
            serviceId: sId,
            imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            displayOrder: 1,
            createdAt: now,
        });

        // Tiện ích 1 kèm theo: Điện sinh hoạt
        serviceCounter++;
        ruleCounter++;
        priceCounter++;
        const elecServiceId = serviceId(serviceCounter);
        const elecRuleId = ruleId(ruleCounter);
        const elecPriceId = priceId(priceCounter);

        ruleInserts.push({
            id: elecRuleId,
            calculationMethod: "QUANTITY" as const,
            billingFrequency: "RECURRING" as const,
            billingIntervalValue: 1,
            billingIntervalUnit: "MONTH" as const,
            prorationMethod: "NONE" as const,
            usageSource: true,
            createdAt: now,
            updatedAt: now,
        });

        serviceInserts.push({
            id: elecServiceId,
            name: `Điện sinh hoạt - ${prop.name}`,
            description: `Tính theo chỉ số công tơ điện thực tế tiêu thụ tại ${prop.name}.`,
            status: "ACTIVE" as const,
            address: prop.address,
            latitude: prop.lat,
            longitude: prop.lng,
            requiresPrepayment: false,
            requiresContract: true,
            contractTemplateId: contractTemplateId(2), // Gắn Template Hợp đồng tiện ích (Template 2)
            providerId: providerId(prop.providerNum),
            categoryId: categoryId(3), // Bảo trì & Tiện ích
            billingRuleId: elecRuleId,
            serviceType: "ADDITION" as const,
            roomTypeId: null,
            createdAt: now,
            updatedAt: now,
        });

        scheduleInserts.push({
            id: scheduleId(serviceCounter),
            serviceId: elecServiceId,
            billingDay: 1,
            dueDays: 5,
            createdAt: now,
            updatedAt: now,
        });

        priceInserts.push({
            id: elecPriceId,
            createdBy: userId(1),
            serviceId: elecServiceId,
            price: "3800",
            unit: "kWh",
            effectiveFrom: new Date("2025-01-01"),
            effectiveTo: null,
            createdAt: now,
        });

        // Tiện ích 2 kèm theo: Nước sinh hoạt
        serviceCounter++;
        ruleCounter++;
        priceCounter++;
        const waterServiceId = serviceId(serviceCounter);
        const waterRuleId = ruleId(ruleCounter);
        const waterPriceId = priceId(priceCounter);

        ruleInserts.push({
            id: waterRuleId,
            calculationMethod: "QUANTITY" as const,
            billingFrequency: "RECURRING" as const,
            billingIntervalValue: 1,
            billingIntervalUnit: "MONTH" as const,
            prorationMethod: "NONE" as const,
            usageSource: true,
            createdAt: now,
            updatedAt: now,
        });

        serviceInserts.push({
            id: waterServiceId,
            name: `Nước sinh hoạt - ${prop.name}`,
            description: `Tính theo chỉ số đồng hồ nước thực tế tiêu thụ tại ${prop.name}.`,
            status: "ACTIVE" as const,
            address: prop.address,
            latitude: prop.lat,
            longitude: prop.lng,
            requiresPrepayment: false,
            requiresContract: true,
            contractTemplateId: contractTemplateId(2), // Gắn Template Hợp đồng tiện ích (Template 2)
            providerId: providerId(prop.providerNum),
            categoryId: categoryId(3),
            billingRuleId: waterRuleId,
            serviceType: "ADDITION" as const,
            roomTypeId: null,
            createdAt: now,
            updatedAt: now,
        });

        scheduleInserts.push({
            id: scheduleId(serviceCounter),
            serviceId: waterServiceId,
            billingDay: 1,
            dueDays: 5,
            createdAt: now,
            updatedAt: now,
        });

        priceInserts.push({
            id: waterPriceId,
            createdBy: userId(1),
            serviceId: waterServiceId,
            price: "22000",
            unit: "m³",
            effectiveFrom: new Date("2025-01-01"),
            effectiveTo: null,
            createdAt: now,
        });

        // Ràng buộc dịch vụ: Khi thuê phòng tại prop, gắn kèm Điện và Nước
        requirementInserts.push({
            id: requirementId(reqCounter++),
            serviceId: sId,
            additionalServiceId: elecServiceId,
            status: "ACTIVE" as const,
        });
        requirementInserts.push({
            id: requirementId(reqCounter++),
            serviceId: sId,
            additionalServiceId: waterServiceId,
            status: "ACTIVE" as const,
        });

        serviceCounter++;
        ruleCounter++;
        priceCounter++;
    }

    // B. 25 Dịch vụ ngoài (External Services)
    for (let s of externalServicesData) {
        const sId = serviceId(serviceCounter);
        const rId = ruleId(ruleCounter);
        const pId = priceId(priceCounter);
        const sSchedId = scheduleId(serviceCounter);

        ruleInserts.push({
            id: rId,
            calculationMethod: s.calc,
            billingFrequency: s.freq,
            billingIntervalValue: 1,
            billingIntervalUnit: s.freq === "RECURRING" ? ("MONTH" as const) : ("DAY" as const),
            prorationMethod: "NONE" as const,
            usageSource: false,
            createdAt: now,
            updatedAt: now,
        });

        serviceInserts.push({
            id: sId,
            name: s.name,
            description: s.desc,
            status: "ACTIVE" as const,
            address: "TP. Hồ Chí Minh",
            latitude: 10.7769,
            longitude: 106.7009,
            requiresPrepayment: s.freq === "ONE_TIME",
            requiresContract: true,
            contractTemplateId: contractTemplateId(3), // Gắn Template Hợp đồng dịch vụ ngoài (Template 3)
            providerId: providerId(s.providerNum),
            categoryId: categoryId(s.catId),
            billingRuleId: rId,
            serviceType: s.servType,
            roomTypeId: null,
            createdAt: now,
            updatedAt: now,
        });

        scheduleInserts.push({
            id: sSchedId,
            serviceId: sId,
            billingDay: 1,
            dueDays: 5,
            createdAt: now,
            updatedAt: now,
        });

        priceInserts.push({
            id: pId,
            createdBy: userId(1),
            serviceId: sId,
            price: String(s.price),
            unit: s.unit,
            effectiveFrom: new Date("2025-01-01"),
            effectiveTo: null,
            createdAt: now,
        });

        imageInserts.push({
            id: imageId(imageCounter++),
            serviceId: sId,
            imageUrl: s.img,
            displayOrder: 1,
            createdAt: now,
        });

        serviceCounter++;
        ruleCounter++;
        priceCounter++;
    }

    await prisma.serviceBillingRule.createMany({ data: ruleInserts, skipDuplicates: true });
    await prisma.service.createMany({ data: serviceInserts, skipDuplicates: true });
    await prisma.billingSchedule.createMany({ data: scheduleInserts, skipDuplicates: true });
    await prisma.servicePrice.createMany({ data: priceInserts, skipDuplicates: true });
    await prisma.serviceImage.createMany({ data: imageInserts, skipDuplicates: true });
    await prisma.serviceRequirement.createMany({ data: requirementInserts, skipDuplicates: true });

    console.log(`✅ Seed Catalog Service thành công:`);
    console.log(`   - ${propertiesData.length} Bất động sản lớn có thật.`);
    console.log(`   - ${roomTypeInserts.length} Loại phòng & ${blockInserts.length} Tòa & ${floorInserts.length} Tầng.`);
    console.log(`   - ${roomInserts.length} Phòng thực tế (Status: ACTIVE, MAINTENANCE, INACTIVE).`);
    console.log(`   - ${serviceInserts.length} Dịch vụ (Bao gồm thuê nhà, điện, nước & 25 dịch vụ ngoài).`);
    console.log(`   - ${priceInserts.length} Bảng giá & ${imageInserts.length} Hình ảnh chất lượng cao.`);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi seed Catalog Service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());