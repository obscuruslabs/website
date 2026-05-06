type AppliedProps = {
  kind: 'applied';
  code: string;
  percentOff: number;
};

type InvalidProps = {
  kind: 'invalid';
  code: string;
};

export type DiscountBannerProps = AppliedProps | InvalidProps;

export default function DiscountBanner(props: DiscountBannerProps) {
  if (props.kind === 'applied') {
    return (
      <div
        role="status"
        className="mb-10 rounded-2xl border border-emerald-700/50 bg-emerald-950/40 px-5 py-4 flex items-center gap-4 flex-wrap"
      >
        <span aria-hidden className="text-emerald-400 font-mono text-sm">[ ✓ ]</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base text-emerald-200">
            Code{' '}
            <span className="font-mono font-semibold text-emerald-100 bg-emerald-900/60 px-2 py-0.5 rounded">
              {props.code}
            </span>{' '}
            applied — <span className="font-semibold">{props.percentOff}% off</span> your prototype at checkout.
          </p>
        </div>
        <form action="/api/discount/clear" method="post">
          <button
            type="submit"
            className="text-xs uppercase tracking-widest text-emerald-300/70 hover:text-emerald-200 cursor-pointer"
            aria-label="Remove discount code"
          >
            remove
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-10 rounded-2xl border border-red-700/50 bg-red-950/30 px-5 py-4 flex items-center gap-4 flex-wrap"
    >
      <span aria-hidden className="text-red-400 font-mono text-sm">[ ✕ ]</span>
      <p className="flex-1 min-w-0 text-sm md:text-base text-red-200">
        Code{' '}
        <span className="font-mono font-semibold text-red-100 bg-red-900/60 px-2 py-0.5 rounded">
          {props.code}
        </span>{' '}
        is invalid or expired. Your buy will go through at full price.
      </p>
    </div>
  );
}
