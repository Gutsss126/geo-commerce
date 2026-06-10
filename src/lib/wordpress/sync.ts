import { prisma } from "@/lib/db";
import { auditProduct } from "@/lib/geo/analyzer";
import { mapWooOrderStatus, type WooOrderPayload, type WooProductPayload } from "./mapper";

export async function upsertWordPressProduct(siteId: string, payload: WooProductPayload) {
  const sku = payload.sku?.trim() || payload.slug;
  const report = auditProduct({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    url: payload.url,
  });

  const product = await prisma.product.upsert({
    where: { siteId_slug: { siteId, slug: payload.slug } },
    update: {
      externalId: payload.externalId,
      title: payload.title,
      sku,
      description: payload.description,
      price: payload.price,
      currency: payload.currency ?? undefined,
      category: payload.category,
      url: payload.url,
      geoScore: report.overallScore,
      lastAuditAt: new Date(),
    },
    create: {
      siteId,
      externalId: payload.externalId,
      title: payload.title,
      slug: payload.slug,
      sku,
      description: payload.description,
      price: payload.price,
      currency: payload.currency ?? "USD",
      category: payload.category,
      url: payload.url,
      geoScore: report.overallScore,
      lastAuditAt: new Date(),
    },
  });

  return product;
}

export async function upsertWordPressOrder(siteId: string, payload: WooOrderPayload) {
  const status = mapWooOrderStatus(payload.status);
  const orderNumber = `WC-${payload.orderNumber}`;

  const lines = await Promise.all(
    payload.items.map(async (row) => {
      const product = await prisma.product.findFirst({
        where: {
          siteId,
          OR: [{ sku: row.sku }, { slug: row.sku }, { externalId: row.sku }],
        },
      });
      const unitPrice = row.unitPrice ?? product?.price ?? 0;
      return {
        sku: row.sku,
        title: row.title || product?.title || row.sku,
        quantity: row.quantity,
        unitPrice,
        lineTotal: unitPrice * row.quantity,
        productId: product?.id ?? null,
      };
    })
  );

  const totalAmount =
    payload.totalAmount ?? lines.reduce((s, l) => s + l.lineTotal, 0);

  const existing = await prisma.order.findUnique({
    where: { siteId_orderNumber: { siteId, orderNumber } },
  });

  if (existing) {
    await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
    return prisma.order.update({
      where: { id: existing.id },
      data: {
        userId: payload.userId,
        status,
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        contactEmail: payload.contactEmail,
        shippingCountry: payload.shippingCountry ?? "CN",
        shippingProvince: payload.shippingProvince,
        shippingCity: payload.shippingCity,
        shippingAddress: payload.shippingAddress,
        shippingPostalCode: payload.shippingPostalCode,
        currency: payload.currency ?? "USD",
        totalAmount,
        note: payload.note,
        items: { create: lines },
      },
      include: { items: true },
    });
  }

  return prisma.order.create({
    data: {
      siteId,
      orderNumber,
      userId: payload.userId,
      status,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactEmail: payload.contactEmail,
      shippingCountry: payload.shippingCountry ?? "CN",
      shippingProvince: payload.shippingProvince,
      shippingCity: payload.shippingCity,
      shippingAddress: payload.shippingAddress,
      shippingPostalCode: payload.shippingPostalCode,
      currency: payload.currency ?? "USD",
      totalAmount,
      note: payload.note,
      items: { create: lines },
    },
    include: { items: true },
  });
}
