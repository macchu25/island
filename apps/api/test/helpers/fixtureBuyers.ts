import type { Buyers } from '@chemimon/shared';

/**
 * Fixture buyers for API tests: the 4 real stalls and a few real templates whose chemicals exist in the fixture catalog.
 * fe (factory) and au (tech) are not starter elements, so a player without discoveries of them sees no order there.
 */
export const fixtureBuyers: Buyers = {
  orderCooldownS: 1800,
  orderLifetimeS: 14400,
  stalls: [
    { id: 'food', name: 'Phố ẩm thực', icon: '🍜' },
    { id: 'factory', name: 'Khu nhà máy', icon: '🏭' },
    { id: 'city', name: 'Dịch vụ thành phố', icon: '🏙️' },
    { id: 'tech', name: 'Kim hoàn và công nghệ', icon: '💍' },
  ],
  orders: [
    { id: 'snack-n2', stallId: 'food', buyer: 'Xưởng bánh snack', chemicalId: 'n2', count: 3, reward: 15, line: 'bơm vào túi snack để bánh không ẩm, không nát' },
    { id: 'pool-cl2', stallId: 'city', buyer: 'Hồ bơi', chemicalId: 'cl2', count: 2, reward: 12, line: 'khử trùng nước hồ bơi' },
    { id: 'hospital-o2', stallId: 'city', buyer: 'Bệnh viện', chemicalId: 'o2', count: 3, reward: 15, line: 'bình thở oxy cho bệnh nhân' },
    { id: 'bus-h2', stallId: 'city', buyer: 'Bến xe buýt', chemicalId: 'h2', count: 4, reward: 10, line: 'nhiên liệu cho xe buýt chạy pin hydro' },
    { id: 'pencil-c', stallId: 'city', buyer: 'Văn phòng phẩm', chemicalId: 'c', count: 3, reward: 15, line: 'làm ruột bút chì' },
    { id: 'steel-fe', stallId: 'factory', buyer: 'Nhà máy thép', chemicalId: 'fe', count: 2, reward: 30, line: 'làm thép đúc dầm cầu' },
    { id: 'ring-au', stallId: 'tech', buyer: 'Tiệm kim hoàn', chemicalId: 'au', count: 2, reward: 25, line: 'làm nhẫn vàng' },
  ],
};
