import React, { useRef, useEffect, useState } from 'react';
import { X, Star, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productTitle: string;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  productId,
  productTitle,
  onSuccess,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
      setRating(5);
      setReviewTitle('');
      setReviewText('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewText.trim()) {
      setError('Please provide both a title and review text');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await api.submitReview(orderId, {
        productId,
        rating,
        reviewTitle: reviewTitle.trim(),
        reviewText: reviewText.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="review-modal-title"
      className="p-0 rounded-2xl bg-surface border border-accent/40 shadow-2xl backdrop:bg-ink-primary/60 max-w-md w-full mx-auto"
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between pb-3 border-b border-accent/20">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Verified Buyer Review</span>
            </div>
            <h2 id="review-modal-title" className="font-serif text-xl font-semibold text-primary">
              Review Your Saree
            </h2>
            <p className="text-xs text-ink-muted line-clamp-1">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1.5">
              Your Overall Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-accent hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? 'fill-current text-accent' : 'text-accent/30'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-semibold text-ink-primary ml-2">
                {rating === 5 ? 'Masterpiece (5/5)' : `${rating} out of 5`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              Review Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Heirloom quality pure silk drape!"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              Detailed Experience (Weave, Zari, Fall, Drape)
            </label>
            <textarea
              required
              rows={4}
              placeholder="Share how the saree draped, the texture of the pure mulberry silk, and the shimmer of the zari..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-accent/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-canvas px-5 py-2 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow transition disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Post Verified Review'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
