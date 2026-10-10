import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Page, PublicReviewDto } from '@barakali/shared';
import { apiRequest } from '../../lib/api';
import { Pagination } from '../catalog/Pagination';

export function WorkerReviews({ workerId }: { workerId: string }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const reviews = useQuery({
    queryKey: ['worker-reviews', workerId, page],
    queryFn: () =>
      apiRequest<Page<PublicReviewDto>>(`/workers/${workerId}/reviews`, { query: { page } }),
  });
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  if (!reviews.data || reviews.data.total === 0) return null;

  return (
    <section aria-labelledby="worker-reviews" className="space-y-3">
      <h2 id="worker-reviews" className="text-xl font-bold">
        {t('catalog.reviewsTitle', { count: reviews.data.total })}
      </h2>
      <ul className="space-y-3">
        {reviews.data.items.map((review) => (
          <li
            key={review.id}
            className="space-y-1 rounded-card border border-bisque bg-white/60 p-4"
          >
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{review.authorName ?? t('catalog.customer')}</span>
              <span
                role="img"
                aria-label={t('orders.review.stars', { count: review.rating })}
                className="inline-flex items-center gap-0.5 text-mocha"
              >
                {Array.from({ length: review.rating }, (_, i) => (
                  <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                ))}
              </span>
            </p>
            {review.comment && <p className="whitespace-pre-line break-words">{review.comment}</p>}
            <p className="text-sm text-mocha">
              {new Date(review.createdAt).toLocaleDateString(locale, { timeZone: 'Asia/Tashkent' })}
            </p>
          </li>
        ))}
      </ul>
      <Pagination
        page={reviews.data.page}
        pageSize={reviews.data.pageSize}
        total={reviews.data.total}
        onChange={setPage}
      />
    </section>
  );
}
