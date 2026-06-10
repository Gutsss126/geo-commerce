"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  generateOrderNumber,
  parseOrderItemsJson,
  type OrderStatus,
} from "@/lib/orders";

async function resolveLineItems(
  siteId: string,
  rows: { sku: string; quantity: number; unitPrice: number }[]
) {
  const lines: {
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    title: string;
    productId: string | null;
  }[] = [];

  for (const row of rows) {
    const product = await prisma.product.findFirst({
      where: {
        siteId,
        OR: [{ sku: row.sku }, { slug: row.sku }],
      },
    });
    const unitPrice = row.unitPrice > 0 ? row.unitPrice : (product?.price ?? 0);
    const lineTotal = unitPrice * row.quantity;
    lines.push({
      sku: row.sku,
      quantity: row.quantity,
      unitPrice,
      lineTotal,
      title: product?.title ?? row.sku,
      productId: product?.id ?? null,
    });
  }
  return lines;
}

export async function createOrder(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const userId = String(formData.get("userId") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const shippingCountry = String(formData.get("shippingCountry") ?? "CN").trim();
  const shippingProvince = String(formData.get("shippingProvince") ?? "").trim() || null;
  const shippingCity = String(formData.get("shippingCity") ?? "").trim() || null;
  const shippingAddress = String(formData.get("shippingAddress") ?? "").trim();
  const shippingPostalCode =
    String(formData.get("shippingPostalCode") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const status = (String(formData.get("status") ?? "pending") as OrderStatus) || "pending";
  const itemsJson = String(formData.get("itemsJson") ?? "[]");

  if (!siteId || !userId || !contactName || !contactPhone || !shippingAddress) {
    throw new Error("站点、用户 ID、联系人、电话、收件地址为必填");
  }

  const rows = parseOrderItemsJson(itemsJson);
  const lines = await resolveLineItems(siteId, rows);
  const totalAmount = lines.reduce((s, l) => s + l.lineTotal, 0);
  const orderNumber =
    String(formData.get("orderNumber") ?? "").trim() || generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      siteId,
      orderNumber,
      userId,
      status,
      contactName,
      contactPhone,
      contactEmail,
      shippingCountry,
      shippingProvince,
      shippingCity,
      shippingAddress,
      shippingPostalCode,
      note,
      totalAmount,
      items: {
        create: lines.map((l) => ({
          sku: l.sku,
          title: l.title,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          productId: l.productId,
        })),
      },
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function deleteOrder(orderId: string) {
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/orders");
  revalidatePath("/");
}
