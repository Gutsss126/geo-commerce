import type { GeoCheckResult } from "./types";

export function formatGeoScoreGap(check: Pick<GeoCheckResult, "score" | "maxScore" | "message">) {
  const gap = check.maxScore - check.score;
  if (gap <= 0) return null;
  return `还差 ${gap} 分：${check.message}`;
}

export type GeoOptimizationPlan = {
  title: string;
  summary: string;
  why: string;
  steps: string[];
  validation: string[];
  template?: string;
  events?: Array<{ name: string; purpose: string; placement: string }>;
  code?: string;
};

export function getGeoOptimizationPlan(check: Pick<GeoCheckResult, "id">): GeoOptimizationPlan | null {
  const plans: Record<string, GeoOptimizationPlan> = {
    "brand-entity": {
      title: "品牌实体清晰度优化方案",
      summary: "让品牌名、域名和站内介绍保持一致，方便 AI 把它识别为同一个实体。",
      why: "AI 需要确认页面背后是谁、官网在哪里、是否和商品页/落地页属于同一个品牌。",
      steps: [
        "确认首页、页脚、About 页面使用同一个品牌名。",
        "确认域名、社媒名称、客服邮箱的品牌拼写一致。",
        "在首页或 About 页面加入一句简短品牌介绍。",
      ],
      validation: [
        "重新运行 GEO Audit，确认品牌实体清晰度提升。",
        "检查首页、/tiktok/、About 页是否都能看到同一个品牌名。",
      ],
      template:
        "FanCrafti is an independent studio creating handmade resin LED lamps for gifts, bedroom desks, gaming rooms, and collectors.",
    },
    "offer-clarity": {
      title: "核心销售主张优化方案",
      summary: "用一句话讲清楚卖什么、适合谁、为什么值得买。",
      why: "如果首页和落地页只有氛围词，AI 很难把站点匹配到具体购买意图。",
      steps: [
        "在首页首屏加入一条清晰主张。",
        "在 /tiktok/ 落地页重复同一核心主张，并突出当前活动。",
        "避免只写 unique、beautiful 这类抽象词，补充品类和场景。",
      ],
      validation: [
        "重新运行 GEO Audit，确认核心销售主张分数提升。",
        "检查 GA4 中主按钮点击是否改善。",
      ],
      template:
        "Handmade resin LED lamps for anime fans, gamers, collectors, and cozy bedroom desks. Pick any 3 styles and save on your first bundle.",
    },
    "audience-fit": {
      title: "目标用户和场景优化方案",
      summary: "把抽象卖点改成具体使用场景，让 AI 能判断应该推荐给谁。",
      why: "AI 推荐时需要把商品匹配到具体需求，例如送礼、卧室桌面、游戏房、收藏展示。只写好看或独特不够。",
      steps: [
        "在首页首屏加入 1 句目标用户说明。",
        "在 /tiktok/ 落地页加入 3 个使用场景标签。",
        "在 Top 商品描述里重复这些场景词，但不要堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认目标用户和场景分数提升。",
        "用 GA4 查看 /tiktok/ 的停留和点击是否改善。",
      ],
      template:
        "适合送给 anime fans、gamers、collector desk owners，也适合 bedroom desk、gaming room 和 cozy home decor 场景。",
    },
    "policy-clarity": {
      title: "配送/退货/信任信息优化方案",
      summary: "把购买前最担心的问题放到 AI 和用户都能读到的位置。",
      why: "如果配送、退货、联系和安全支付不清晰，AI 很难把站点判断为可信购买结果。",
      steps: [
        "确认站点有 Shipping、Returns、Contact、About 页面。",
        "在商品页或落地页底部加入简短的配送和退货摘要。",
        "把客服邮箱、损坏处理、退款周期写成明确句子。",
      ],
      validation: [
        "重新运行 GEO Audit，确认配送/退货/信任信息不再是高优先级问题。",
        "检查 GA4 中从落地页到商品页的继续浏览是否提升。",
      ],
      template:
        "Shipping: Orders are processed within 3-7 business days. Returns: Contact us within 30 days if your item arrives damaged or incorrect. Support: support@example.com.",
    },
    "llms-txt": {
      title: "llms.txt 与 AI 爬虫说明优化方案",
      summary: "给 AI 爬虫一份简洁站点说明，告诉它哪些页面最重要。",
      why: "llms.txt 不能保证被所有 AI 使用，但它是低成本的站点说明文件，能让核心页面、品牌、产品目录更容易被理解。",
      steps: [
        "在站点根目录创建 /llms.txt。",
        "写清品牌、主站、产品目录、核心落地页和联系方式。",
        "发布后用浏览器打开 https://你的域名/llms.txt 确认可访问。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 llms.txt 检测通过。",
        "确认 robots.txt 和 sitemap.xml 也能访问。",
      ],
      template:
        "# FanCrafti\n\nFanCrafti sells handmade resin LED lamps for gifts, bedroom desks, gaming rooms, and collectors.\n\nImportant pages:\n- https://fancrafti.com/\n- https://fancrafti.com/tiktok/\n- https://fancrafti.com/shop/\n\nContact: support@fancrafti.com",
    },
    "product-schema-readiness": {
      title: "Product Schema 优化方案",
      summary: "让商品页具备机器可读的名称、图片、价格、库存和链接。",
      why: "Product Schema 是搜索系统和 AI 理解商品实体的重要信号，尤其影响价格、库存、评价和可购买性判断。",
      steps: [
        "确认商品页输出 Product JSON-LD。",
        "至少包含 name、image、description、offers.price、availability、url。",
        "如果有评价，加入 aggregateRating 或 review。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 Product Schema 准备度提升。",
        "用 Google Rich Results Test 或页面源码确认 JSON-LD 存在。",
      ],
      template:
        '{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "FanCrafti Handmade Resin LED Lamp",\n  "image": "https://fancrafti.com/path-to-image.jpg",\n  "description": "Handmade resin LED lamp for bedroom desks and gifts.",\n  "offers": {\n    "@type": "Offer",\n    "priceCurrency": "USD",\n    "price": "39.99",\n    "availability": "https://schema.org/InStock",\n    "url": "https://fancrafti.com/products/example"\n  }\n}',
    },
    "catalog-coverage": {
      title: "商品目录覆盖优化方案",
      summary: "优先让 Top SKU 被同步、可访问、可解析，而不是一次性追求全站完美。",
      why: "AI 需要足够商品实体和内部链接，才能理解你的产品范围并做推荐。",
      steps: [
        "优先同步并优化 Top 20 个最想推广的商品。",
        "确保这些商品有标题、类目、价格、图片、URL 和描述。",
        "在首页、/tiktok/、集合页里链接到这些重点商品。",
      ],
      validation: [
        "重新运行 GEO Audit，确认商品目录覆盖提升。",
        "检查低分商品列表是否减少。",
      ],
      template:
        "Top SKU checklist: title, category, price, product URL, main image, 120+ word description, Product Schema, FAQ, shipping/return note.",
    },
    "title-clarity": {
      title: "商品标题优化方案",
      summary: "让标题直接说清品牌、品类、核心卖点和使用场景。",
      why: "商品标题是 AI 理解商品实体的第一入口，太短或太抽象会降低可推荐性。",
      steps: [
        "标题控制在 28-90 个字符左右。",
        "包含品牌、品类、材质/风格、使用场景。",
        "避免只写 Lamp、Gift、Cute 这类过短标题。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品标题分数提升。",
        "检查商品页标题在搜索结果和页面 H1 中一致。",
      ],
      template:
        "FanCrafti Handmade Resin LED Ocean Lamp for Bedroom Desk Gift",
    },
    "taxonomy": {
      title: "商品类目优化方案",
      summary: "给商品设置清晰类目，帮助 AI 判断它属于哪类购买需求。",
      why: "没有类目时，AI 只能依赖标题和描述猜测商品类型，容易把商品放错推荐场景。",
      steps: [
        "为每个商品设置稳定类目，例如 Handmade Resin LED Lamps。",
        "集合页和面包屑中使用同一类目名称。",
        "避免同类商品使用多个近似但不同的类目名。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品类目分数提升。",
        "检查低分商品中缺少类目的数量是否减少。",
      ],
      template:
        "Recommended categories: Handmade Resin LED Lamps, Gift Lamps, Desk Decor, Gaming Room Decor, Anime Gifts.",
    },
    "factual-density": {
      title: "商品事实密度优化方案",
      summary: "补充材质、尺寸、供电、包装、适用场景等可验证事实。",
      why: "AI 摘要更依赖事实而不是形容词。事实越清楚，越容易被准确引用和推荐。",
      steps: [
        "每个商品描述至少加入 5 个事实点。",
        "覆盖材质、尺寸、供电方式、包装、适用场景、手工差异。",
        "用短段落或列表展示，避免一整段堆满形容词。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品事实密度提升。",
        "检查页面证据里是否出现 resin、wood、USB、size、handmade 等词。",
      ],
      template:
        "Material: resin and wood base. Power: USB LED light. Use: bedroom desk, gaming room, collector shelf. Note: each handmade resin pattern is unique.",
    },
    "price-trust": {
      title: "价格与购买信号优化方案",
      summary: "让价格、库存、配送和退货信息稳定出现在商品页。",
      why: "AI 和用户都需要确认商品是否可购买，以及购买风险是否清楚。",
      steps: [
        "确认商品页显示价格、库存状态和购买按钮。",
        "在价格附近加入简短 Shipping、Returns 或 Secure checkout 信息。",
        "确保 Product Schema 中 offers.price 和 availability 正确。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认价格与购买信号提升。",
        "检查 GA4 add_to_cart 和 checkout_click 是否能被记录。",
      ],
      template:
        "Price includes the handmade lamp only. Shipping is calculated at checkout. Returns are accepted within 30 days for damaged or incorrect items.",
    },
    "qa-structure": {
      title: "购买疑问 FAQ 优化方案",
      summary: "把用户买之前会问的问题直接写出来，降低 AI 摘要的不确定性。",
      why: "FAQ 能帮助 AI 回答配送、材质、尺寸、是否适合送礼等具体问题，也能减少用户犹豫。",
      steps: [
        "在落地页或商品页加入 3-5 个 FAQ。",
        "优先覆盖是否手工、尺寸、供电方式、配送、退货、是否适合送礼。",
        "问题和答案都用自然语言，不要只堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认购买疑问覆盖提升。",
        "观察 GA4 user_engagement 和商品点击是否改善。",
      ],
      template:
        "Q: Is each lamp handmade?\nA: Yes. Each resin lamp is handmade, so small pattern differences are normal.\n\nQ: Is it suitable as a gift?\nA: Yes. It is designed for bedroom desks, gaming rooms, collectors, and handmade gift buyers.",
    },
    "comparison-intent": {
      title: "对比与替代意图优化方案",
      summary: "说明为什么买这个，而不是普通灯或其他装饰品。",
      why: "AI 推荐通常发生在比较场景里。没有差异化描述时，页面很难成为推荐答案。",
      steps: [
        "在商品页加入一段 Compared with ordinary lamps 的说明。",
        "突出 handmade、unique resin pattern、gift-ready、desk decor 等差异。",
        "避免攻击竞品，只讲选择理由。",
      ],
      validation: [
        "重新运行 GEO Audit，确认对比与替代意图提升。",
        "观察商品页点击和加购是否改善。",
      ],
      template:
        "Compared with ordinary desk lamps, each FanCrafti resin lamp is handmade with a unique glowing scene, making it both a functional light and a collectible desk decor piece.",
    },
    "buyer-proof": {
      title: "信任证据优化方案",
      summary: "补充能证明商品真实可信的评价、制作过程和品牌信息。",
      why: "AI 和用户都需要可信信号。没有评价、实拍、制作过程或品牌故事时，推荐风险会更高。",
      steps: [
        "在商品页加入买家评价或真实使用场景。",
        "补充 handmade 制作过程、实拍图或工作室介绍。",
        "如果有评分，尽量用结构化数据输出 aggregateRating。",
      ],
      validation: [
        "重新运行 GEO Audit，确认信任证据提升。",
        "观察 add_to_cart 和 checkout_click 是否改善。",
      ],
      template:
        "Each lamp is handmade by the FanCrafti studio. Product photos show real lighting effects, and customer feedback is used to improve packaging, brightness, and desk display experience.",
    },
    "measurement-readiness": {
      title: "GA4 事件优化方案",
      summary: "把 GEO 建议和用户行为接起来，先追踪落地页核心点击，再扩展到加购和结账。",
      why: "GEO 优化不是只看分数，还要确认修改后用户是否真的点击、加购或结账。",
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
      validation: [
        "打开 GA4 实时概览，确认事件能出现。",
        "回到 GEO 的 GA4 诊断页面，确认实时反馈和事件分析有数据。",
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
    },
  };

  return plans[check.id] ?? null;
}
