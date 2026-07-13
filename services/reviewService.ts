import type { Review } from '@/types/ecommerce';

const mockReviews: Review[] = [
  {
    id: '1',
    product_id: 'p1',
    product_name: 'Wireless Bluetooth Headphones',
    customer_name: 'Rahul Sharma',
    customer_email: 'rahul@example.com',
    rating: 5,
    title: 'Excellent sound quality!',
    body: 'Absolutely love these headphones. The sound quality is amazing and the battery life is fantastic. Highly recommended for music lovers.',
    is_approved: true,
    is_verified_purchase: true,
    helpful_count: 23,
    images: [],
    admin_response: 'Thank you for your review, Rahul! We are glad you love the product.',
    created_at: '2025-11-15T10:30:00Z',
  },
  {
    id: '2',
    product_id: 'p2',
    product_name: 'Smart Watch Pro',
    customer_name: 'Priya Patel',
    customer_email: 'priya@example.com',
    rating: 4,
    title: 'Great features, but battery could be better',
    body: 'The watch has all the features I need. Heart rate monitor, sleep tracking, and notifications work perfectly. Battery lasts about 2 days which is okay but could be better.',
    is_approved: true,
    is_verified_purchase: true,
    helpful_count: 15,
    images: ['/images/reviews/watch-1.jpg'],
    admin_response: null,
    created_at: '2025-11-20T14:00:00Z',
  },
  {
    id: '3',
    product_id: 'p3',
    product_name: 'Organic Cotton T-Shirt',
    customer_name: 'Amit Singh',
    customer_email: 'amit@example.com',
    rating: 3,
    title: 'Decent quality but runs small',
    body: 'The fabric quality is good and it feels soft. However, the sizing runs smaller than expected. I would recommend ordering one size up.',
    is_approved: true,
    is_verified_purchase: true,
    helpful_count: 8,
    images: [],
    admin_response: 'Hi Amit, thank you for your feedback. We have updated the size guide on the product page to help future customers.',
    created_at: '2025-12-01T09:15:00Z',
  },
  {
    id: '4',
    product_id: 'p4',
    product_name: 'Leather Messenger Bag',
    customer_name: 'Sneha Gupta',
    customer_email: 'sneha@example.com',
    rating: 2,
    title: 'Not worth the price',
    body: 'The bag looks good in pictures but the leather quality is not premium. Stitching could be better. Disappointed given the price point.',
    is_approved: false,
    is_verified_purchase: true,
    helpful_count: 12,
    images: ['/images/reviews/bag-1.jpg', '/images/reviews/bag-2.jpg'],
    admin_response: null,
    created_at: '2025-12-10T16:45:00Z',
  },
  {
    id: '5',
    product_id: 'p5',
    product_name: 'Stainless Steel Water Bottle',
    customer_name: 'Vikram Joshi',
    customer_email: 'vikram@example.com',
    rating: 5,
    title: 'Keeps water cold for 24 hours!',
    body: 'Best water bottle I have ever owned. Keeps water ice cold even in summer. The build quality is excellent and the cap seal is leak-proof.',
    is_approved: true,
    is_verified_purchase: true,
    helpful_count: 31,
    images: [],
    admin_response: null,
    created_at: '2025-12-20T11:30:00Z',
  },
  {
    id: '6',
    product_id: 'p1',
    product_name: 'Wireless Bluetooth Headphones',
    customer_name: 'Ananya Das',
    customer_email: 'ananya@example.com',
    rating: 1,
    title: 'Stopped working after a week',
    body: 'The headphones stopped charging after just one week of use. Tried contacting support but no response yet. Very disappointed.',
    is_approved: false,
    is_verified_purchase: true,
    helpful_count: 5,
    images: [],
    admin_response: null,
    created_at: '2025-12-25T08:00:00Z',
  },
];

class ReviewService {
  private data: Review[] = [...mockReviews];

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: Review[]; total: number; page: number; per_page: number }> {
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.product_name.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }
    if (params?.filterParams?.is_approved !== undefined && params.filterParams.is_approved !== null && params.filterParams.is_approved !== '') {
      const val = String(params.filterParams.is_approved) === 'true';
      filtered = filtered.filter(r => r.is_approved === val);
    }
    if (params?.filterParams?.rating !== undefined && params.filterParams.rating !== null && params.filterParams.rating !== '') {
      filtered = filtered.filter(r => r.rating === Number(params.filterParams!.rating));
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);
    return { data: paged, total, page, per_page: perPage };
  }

  async approve(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const review = this.data.find(r => r.id === id);
    if (review) review.is_approved = true;
  }

  async reject(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const review = this.data.find(r => r.id === id);
    if (review) review.is_approved = false;
  }

  async respond(id: string, response: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const review = this.data.find(r => r.id === id);
    if (review) review.admin_response = response;
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    this.data = this.data.filter(r => r.id !== id);
  }
}

const reviewService = new ReviewService();
export default reviewService;
