import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders";

const itemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().optional(),
});

const createSchema = z.object({
  siteId: z.string().min(1),
  userId: z.string().min(1),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().optional().nullable(),
  shippingCountry: z.string().optional(),
  shippingProvince: z.string().optional().nullable(),
  shippingCity: z.string().optional().nullable(),
  shippingAddress: z.string().min(1),
  shippingPostalCode: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    },
    include: { items: true, site: { select: { name: true, domain: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, orders });
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());

    const lines = await Promise.all(
      body.items.map(async (row) => {
        const product = await prisma.product.findFirst({
          where: {
            siteId: body.siteId,
            OR: [{ sku: row.sku }, { slug: row.sku }],
          },
        });
        const unitPrice = row.unitPrice ?? product?.price ?? 0;
        return {
          sku: row.sku,
          quantity: row.quantity,
          unitPrice,
          lineTotal: unitPrice * row.quantity,
          title: product?.title ?? row.sku,
          productId: product?.id ?? null,
        };
      })
    );

    const totalAmount = lines.reduce((s, l) => s + l.lineTotal, 0);

    const order = await prisma.order.create({
      data: {
        siteId: body.siteId,
        orderNumber: body.orderNumber ?? generateOrderNumber(),
        userId: body.userId,
        status: body.status ?? "pending",
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        shippingCountry: body.shippingCountry ?? "CN",
        shippingProvince: body.shippingProvince,
        shippingCity: body.shippingCity,
        shippingAddress: body.shippingAddress,
        shippingPostalCode: body.shippingPostalCode,
        note: body.note,
        totalAmount,
        items: { create: lines },
      },
      include: { items: true },
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
