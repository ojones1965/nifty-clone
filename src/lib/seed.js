// Demo data written for every newly created account.

import { DATA_PREFIX, write, uid, isoDate, daysAgo } from './storage';
import { emptyData } from './data';

export function seedData(userId) {
  const mkItem = (title, status, price, cogs, marketplaces, ageDays, extra = {}) => ({
    id: uid(),
    title,
    description: '',
    photos: [],
    price,
    costOfGoods: cogs,
    status,
    marketplaces,
    readyToList: false,
    createdAt: daysAgo(ageDays).getTime(),
    listedAt: status !== 'draft' ? daysAgo(ageDays).getTime() : null,
    soldAt: null,
    soldPrice: null,
    soldMarketplace: null,
    ...extra,
  });

  const i1 = mkItem('Nike SB Llama Sneaker Graphic Hoodie Gray Heather Fleece Mens XL Pullover', 'listed', 35, 6, ['poshmark', 'ebay'], 12);
  const i2 = mkItem('Honors Vintage Halloween Patchwork Sweatshirt Navy Blue Plus Size 18/20 Cat Moon', 'listed', 34, 2, ['poshmark', 'depop'], 9);
  const i3 = mkItem('Gianni Bini Pink Lace Up Square Toe Flared Heel Sandals Size 9.5M', 'listed', 22, 4, ['poshmark'], 40);
  const i4 = mkItem('Patagonia Better Sweater Fleece Vest Womens M Navy', 'listed', 48, 12, ['poshmark', 'ebay', 'depop'], 5);
  const i5 = mkItem('Levi\'s 501 Original Fit Jeans 34x32 Medium Wash', 'draft', 42, 9, ['poshmark'], 2, { readyToList: true });
  const i6 = mkItem('Free People Ivory Cable Knit Sweater Womens S', 'draft', 38, 5, [], 1);
  const sold1 = mkItem('Carhartt WIP Detroit Jacket Duck Canvas Mens L', 'sold', 89, 25, ['ebay'], 20, {
    soldAt: daysAgo(3).getTime(), soldPrice: 89, soldMarketplace: 'ebay',
  });
  const sold2 = mkItem('Vintage Harley Davidson Tee 90s Single Stitch XL', 'sold', 56, 8, ['depop'], 15, {
    soldAt: daysAgo(1).getTime(), soldPrice: 56, soldMarketplace: 'depop',
  });
  const sold3 = mkItem('Dr. Martens 1460 Boots Black Womens 8', 'sold', 65, 18, ['poshmark'], 25, {
    soldAt: daysAgo(8).getTime(), soldPrice: 65, soldMarketplace: 'poshmark',
  });

  const mkOrder = (item, fees, shippingFee = 0) => ({
    id: uid(),
    itemId: item.id,
    title: item.title,
    date: isoDate(new Date(item.soldAt)),
    marketplace: item.soldMarketplace,
    salePrice: item.soldPrice,
    fees,
    shippingFee,
    shippingExpense: 0,
    cogs: item.costOfGoods,
  });

  const data = {
    ...emptyData(),
    items: [i1, i2, i3, i4, i5, i6, sold1, sold2, sold3],
    orders: [mkOrder(sold1, 11.57, 0), mkOrder(sold2, 7.28, 4.99), mkOrder(sold3, 12.95, 0)],
    expenses: [
      { id: uid(), date: isoDate(daysAgo(21)), description: 'Nifty cross listing', category: 'Dues & Subscriptions', amount: 29.99 },
      { id: uid(), date: isoDate(daysAgo(21)), description: 'Scale', category: 'Inventory Purchases', amount: 24.5 },
      { id: uid(), date: isoDate(daysAgo(21)), description: 'Label printer', category: 'Inventory Purchases', amount: 89.99 },
      { id: uid(), date: isoDate(daysAgo(6)), description: 'Poly mailers 100pk', category: 'Shipping Supplies', amount: 18.75 },
    ],
    automation: {
      shares: 3290,
      relists: 3,
      offers: 31,
      follows: 123,
      enabled: { shares: true, relists: true, offers: true, follows: true },
    },
  };
  write(DATA_PREFIX + userId, data);
}
