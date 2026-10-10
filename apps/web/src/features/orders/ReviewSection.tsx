import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_REVIEW_COMMENT_LENGTH,
  MAX_REVIEW_RATING,
  MIN_REVIEW_RATING,
  type OrderDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { TextAreaField } from '../../components/Field';
import { errorMessage } from '../../lib/errors';
import { useCreateReview } from './api';

const RATING_VALUES = Array.from(
  { length: MAX_REVIEW_RATING - MIN_REVIEW_RATING + 1 },
  (_, index) => MIN_REVIEW_RATING + index,
);

function Stars({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex"
      role="img"
      aria-label={t('orders.review.stars', { count: value })}
    >
      {RATING_VALUES.map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`size-6 text-mocha ${star <= value ? 'fill-mocha' : 'fill-transparent'}`}
        />
      ))}
    </span>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const mutation = useCreateReview(orderId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (rating === 0) return;
    mutation.mutate({ rating, comment: comment.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label={t('orders.review.ratingLabel')} className="flex gap-1">
        {RATING_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t('orders.review.stars', { count: value })}
            onClick={() => setRating(value)}
            className={`grid size-12 place-items-center rounded-field ${
              rating === value ? 'bg-bisque' : 'hover:bg-bisque/60'
            }`}
          >
            <Star
              aria-hidden="true"
              className={`size-8 text-mocha ${value <= rating ? 'fill-mocha' : 'fill-transparent'}`}
            />
          </button>
        ))}
      </div>
      <TextAreaField
        label={t('orders.review.commentLabel')}
        placeholder={t('orders.review.commentPlaceholder')}
        maxLength={MAX_REVIEW_COMMENT_LENGTH}
        rows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={rating === 0 || mutation.isPending}
      >
        {t('orders.review.submit')}
      </Button>
    </form>
  );
}

/** Customers can rate a delivered order once; afterwards the saved review is shown instead. */
export function ReviewSection({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  if (order.viewerRole !== 'customer' && !order.review) return null;
  if (!order.review && order.status !== 'delivered') return null;

  return (
    <section
      aria-labelledby="order-review"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="order-review" className="font-bold">
        {order.review ? t('orders.review.yourReview') : t('orders.review.title')}
      </h2>
      {order.review ? (
        <div className="space-y-2">
          <Stars value={order.review.rating} />
          {order.review.comment && <p className="whitespace-pre-line">{order.review.comment}</p>}
          <p role="status" className="text-sm text-mocha">
            {t('orders.review.thanks')}
          </p>
        </div>
      ) : (
        <ReviewForm orderId={order.id} />
      )}
    </section>
  );
}
