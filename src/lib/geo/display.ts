import type { GeoCheckResult } from "./types";

export function formatGeoScoreGap(check: Pick<GeoCheckResult, "score" | "maxScore" | "message">) {
  const gap = check.maxScore - check.score;
  if (gap <= 0) return null;
  return `还差 ${gap} 分：${check.message}`;
}

export type GeoOptimizationPlan = {
  title: string;
  summary: string;
  events: Array<{ name: string; purpose: string; placement: string }>;
  steps: string[];
  code: string;
};

export function getGeoOptimizationPlan(check: Pick<GeoCheckResult, "id">): GeoOptimizationPlan | null {
  if (check.id !== "measurement-readiness") return null;

  return {
    title: "GA4 事件优化方案",
    summary: "把 GEO 建议和用户行为接起来，先追踪落地页核心点击，再扩展到加购和结账。",
    events: [
      { name: "page_view", purpose: "确认页面被访问", placement: "/tiktok/ 页面加载后自动触发" },
      { name: "shop_bundle_click", purpose: "确认主按钮是否吸引点击", placement: "Shop Bundle 按钮" },
      { name: "top_sellers_click", purpose: "确认用户是否继续浏览商品", placement: "See Top Sellers 按钮" },
      { name: "add_to_cart", purpose: "确认商品页是否产生购买意图", placement: "商品页加购按钮" },
      { name: "checkout_click", purpose: "确认购物车是否进入结账", placement: "购物车或 Checkout 按钮" },
    ],
    steps: [
      "先在 /tiktok/ 页面确认 page_view、shop_bundle_click、top_sellers_click 能进入 GA4 实时报告。",
      "再把 add_to_cart 和 checkout_click 接到 WooCommerce 商品页和购物车按钮。",
      "修改 GEO 内容后，对比 24-72 小时内点击、加购和结账事件是否提升。",
    ],
    code: `<script>
  window.fancraftiTrack = function(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, {
      page_path: "/tiktok/",
      page_location: "https://fancrafti.com/tiktok/",
      ...params
    });
  };

  document.addEventListener("click", function(event) {
    var target = event.target.closest("a, button");
    if (!target) return;
    var text = (target.textContent || "").trim().toLowerCase();
    var href = target.getAttribute("href") || "";

    if (text.includes("shop bundle")) {
      window.fancraftiTrack("shop_bundle_click", { link_url: href });
    }

    if (text.includes("top sellers")) {
      window.fancraftiTrack("top_sellers_click", { link_url: href });
    }

    if (text.includes("add to cart")) {
      window.fancraftiTrack("add_to_cart", { link_url: href });
    }

    if (text.includes("checkout")) {
      window.fancraftiTrack("checkout_click", { link_url: href });
    }
  });
</script>`,
  };
}
