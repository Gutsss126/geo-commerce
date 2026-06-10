import type { OrderStatus } from "@/lib/orders";

/** WooCommerce order status → GEO Commerce status */
const WC_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "pending",
  "on-hold": "pending",
  processing: "processing",
  completed: "delivered",
  cancelled: "cancelled",
  refunded: "cancelled",
  failed: "cancelled",
};

export function mapWooOrderStatus(wcStatus: string): OrderStatus {
  return WC_STATUS_MAP[wcStatus] ?? "processing";
}

export type WooProductPayload = {
  externalId: string;
  title: string;
  slug: string;
  sku?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  url?: string | null;
};

export type WooOrderPayload = {
  externalId: string;
  orderNumber: string;
  userId: string;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  shippingCountry?: string | null;
  shippingProvince?: string | null;
  shippingCity?: string | null;
  shippingAddress: string;
  shippingPostalCode?: string | null;
  currency?: string | null;
  totalAmount?: number | null;
  note?: string | null;
  items: { sku: string; title: string; quantity: number; unitPrice?: number }[];
};

/** Normalize WooCommerce REST webhook / plugin POST body */
export function parseWooProductBody(body: Record<string, unknown>): WooProductPayload {
  const id = String(body.externalId ?? body.id ?? "");
  const title = String(body.title ?? body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  if (!id || !title || !slug) throw new Error("product requires externalId, title, slug");

  return {
    externalId: id,
    title,
    slug,
    sku: body.sku != null ? String(body.sku) : null,
    description: body.description != null ? String(body.description) : null,
    price: body.price != null ? Number(body.price) : null,
    currency: body.currency != null ? String(body.currency) : null,
    category: body.category != null ? String(body.category) : null,
    url: body.url != null ? String(body.url) : body.permalink != null ? String(body.permalink) : null,
  };
}

export function parseWooOrderBody(body: Record<string, unknown>): WooOrderPayload {
  const externalId = String(body.externalId ?? body.id ?? "");
  const orderNumber = String(body.orderNumber ?? body.number ?? externalId);
  const userId = String(body.userId ?? body.customer_id ?? body.customerId ?? "guest");
  if (!externalId || !orderNumber) throw new Error("order requires externalId and orderNumber");

  const shipping = (body.shipping as Record<string, unknown>) ?? {};
  const billing = (body.billing as Record<string, unknown>) ?? {};

  const contactName = String(
    body.contactName ??
      (`${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim() || "Guest")
  );
  const contactPhone = String(body.contactPhone ?? billing.phone ?? "");
  const shippingAddress = String(
    body.shippingAddress ??
      [
        shipping.address_1,
        shipping.address_2,
        body.shippingAddress1,
        body.shippingAddress2,
      ]
        .filter(Boolean)
        .join(" ")
  );

  if (!shippingAddress && !contactName) {
    throw new Error("order requires shipping address or contact name");
  }

  const rawItems = (body.items ?? body.line_items ?? []) as Record<string, unknown>[];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("order requires at least one line item");
  }

  const items = rawItems.map((row) => {
    const sku = String(row.sku ?? row.product_sku ?? row.product_id ?? "unknown");
    const title = String(row.title ?? row.name ?? sku);
    const quantity = Number(row.quantity ?? 1);
    const unitPrice = row.unitPrice != null ? Number(row.unitPrice) : row.price != null ? Number(row.price) : undefined;
    return { sku, title, quantity, unitPrice };
  });

  return {
    externalId,
    orderNumber,
    userId: String(userId),
    status: String(body.status ?? "pending"),
    contactName,
    contactPhone: contactPhone || "—",
    contactEmail: body.contactEmail != null ? String(body.contactEmail) : billing.email != null ? String(billing.email) : null,
    shippingCountry: String(body.shippingCountry ?? shipping.country ?? "CN"),
    shippingProvince: body.shippingProvince != null ? String(body.shippingProvince) : shipping.state != null ? String(shipping.state) : null,
    shippingCity: body.shippingCity != null ? String(body.shippingCity) : shipping.city != null ? String(shipping.city) : null,
    shippingAddress: shippingAddress || "—",
    shippingPostalCode:
      body.shippingPostalCode != null
        ? String(body.shippingPostalCode)
        : shipping.postcode != null
          ? String(shipping.postcode)
          : null,
    currency: body.currency != null ? String(body.currency) : null,
    totalAmount: body.totalAmount != null ? Number(body.totalAmount) : body.total != null ? Number(body.total) : null,
    note: body.note != null ? String(body.note) : body.customer_note != null ? String(body.customer_note) : null,
    items,
  };
}
