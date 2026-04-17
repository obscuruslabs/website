import { PRODUCT } from '@/lib/product';
import { SITE_URL } from '@/lib/env';

export default function ProductJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${PRODUCT.name} '${PRODUCT.codename}'`,
    brand: { '@type': 'Brand', name: 'obscurus labs' },
    description: PRODUCT.description,
    sku: PRODUCT.id,
    image: [`${SITE_URL}/visor-on.png`, `${SITE_URL}/visor-off.jpg`],
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/`,
      priceCurrency: PRODUCT.currency.toUpperCase(),
      price: (PRODUCT.priceCents / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
