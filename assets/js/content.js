/* ==========================================================================
   CONTENT · 全站内容都在这里改
   --------------------------------------------------------------------------
   - 改文字：直接改引号里的内容。
   - 加条目：复制数组里的一个 { ... }，粘贴在后面，改内容即可，页面会自动排版。
   - 图片：把图片放进 assets/img/，然后写 "assets/img/文件名.jpg"。
           留空 "" 会显示统一风格的占位框（写着该放什么图）。
           .mp4 / .webm 会自动按视频播放（静音循环）。
   - 坐标类字段（x / y / w / h）都是百分比，用来控制错落位置。
   ========================================================================== */

window.SITE = {
  meta: {
    name: "Patrick Xu",
    year: "2026",
    showEditButton: false, // true = 导航里显示 Edit；false = 隐藏（Shift + E 仍可打开）
  },

  /* 顶部导航：label 是显示文字，target 对应页面 id */
  nav: [
    { label: "Explore", target: "explore" },
    { label: "Influence", target: "influence" },
    { label: "Create", target: "create" },
    { label: "Climb", target: "climb" },
    { label: "Vibe", target: "vibe" },
    { label: "Contact", target: "contact" },
  ],

  /* P1 · Hero：半调球体 + 条纹块 + 小图标，中心名字，左下简介。
     tags 是右下角的小字，arcText 是橙色半圆外圈的小字（都属于图形的一部分） */
  hero: {
    name: "Patrick Xu",
    intro: "Welcome to my personal website. Meet Patrick, a marketer who acts fast but makes it last.",
    tags: ["Brand / Growth / PR", "Marketing portfolio"],
    arcText: "Portfolio 2026",
  },

  /* P2 · I Explore.：3D 等高线地图 + 经历路线。
     seed：地形的随机种子，换一个数字就生成一张新地图。
     at：这段经历在地图上的点（x / y，百分比）；card：卡片左上角位置（x / y，百分比）。
     路线按数组顺序把点连起来。照片默认黑白，鼠标悬停卡片时恢复彩色。
     logoH（可选）= logo 显示高度（px），默认 34；方形 logo 可以调大。
     lede：标题下面的一句小字，说明这一页是干嘛的（P2 到 P6 都有）。 */
  explore: {
    title: "I Explore.",
    lede: "Exploring my possibilities across different internships.",
    seed: 7,
    items: [
      {
        title: "CCTV News Editor Intern",
        intro: "Designed and created interview content for Leaders Talk across Chinese social media.",
        date: "2024.06 - 08",
        logo: "assets/img/cctv-logo.png",
        image: "assets/img/cctv-main.jpg",
        at: [10, 66], card: [12, 72],
      },
      {
        title: "UNIQLO Brand Marketing Intern (Scholarship)",
        intro: "Interviewed Tadashi Yanai, CEO of UNIQLO, in Tokyo; our case analysis ranked first out of 12 teams.",
        date: "2024.10 - 2025.05",
        logo: "assets/img/uniqlo-logo.svg",
        image: "assets/img/uniqlo-main.jpg",
        at: [30, 50], card: [19, 22],
      },
      {
        title: "Publicis Groupe PR Intern",
        intro: "Wrote press releases for Mars and Nippon Paint, picked up by 113+ websites; planned Mars' campaign at Pet Fair Asia.",
        date: "2025.06 - 09",
        logo: "assets/img/publicis-logo.svg",
        logoH: 44,
        image: "assets/img/publicis-main.jpg",
        at: [48, 62], card: [39, 70],
      },
      {
        title: "DOCUMENTS Brand Marketing Intern",
        intro: "Turned a 5 ml fragrance into a bag charm. First-month sales up 307%; built a new sub-brand, Peace Incense, from 0 to 1.",
        date: "2025.09 - 12",
        logo: "assets/img/documents-logo.png",
        logoH: 46,
        image: "assets/img/documents-main.jpg",
        at: [66, 42], card: [69, 47],
      },
      {
        title: "ByteDance Dola Growth Marketing Intern",
        intro: "Built a creator channel from zero to 4,500+ new videos a day; created the agent skill “AI Hotspot”, which is still in use today.",
        date: "2026.03 - 07",
        logo: "assets/img/bytedance-logo.svg",
        image: "assets/img/bytedance-main.jpg",
        at: [86, 18], card: [57, 3],
      },
    ],
  },

  /* P3 · I Influence.：文件夹堆，每个文件夹 = 一条视频。
     type "divider" = 黑色索引标签（平台分组）；type "file" = 一条视频。
     media：视频或截图，按原比例完整显示，不裁切。
     date / text / stats 里留空的项，页面上直接不显示（编辑模式下会出现，方便补填）。
     tabAt（可选）= 标签水平位置 0~1。 */
  influence: {
    title: "I Influence.",
    lede: "Driving sustained growth for brands through affiliate marketing.",
    drawerLabel: "Viral videos",
    files: [
      { type: "divider", tab: "Dola AI" },
      { type: "file", tab: "#4K AI", platform: "Dola AI / TikTok", date: "2026.4.21", text: "144p to 4K Tutorial",
        media: "assets/img/c0aea1843c7301cb54f44976bc7f3488.jpg",
        stats: { views: "7.9M", likes: "139K", comments: "1.2K", shares: "5.7K", saves: "35K" } },
      { type: "file", tab: "#AIPetStudio", platform: "Dola AI / TikTok", date: "2026.5.12", text: "Nine-Square Grid for Pets",
        media: "assets/img/c6769c5718029e8e3619b237aff747b3.jpg",
        stats: { views: "2.3M", likes: "74K", comments: "", shares: "", saves: "2.1K" } },
      { type: "file", tab: "#PoseSwapAI", platform: "Dola AI / TikTok", date: "2026.4.23", text: "POV: u only got 1 ready-to-post picture...",
        media: "assets/img/1.jpg",
        stats: { views: "4.9M", likes: "23.2K", comments: "", shares: "", saves: "2.1K" } },
      { type: "file", tab: "#LazyMorningAI", platform: "Dola AI / TikTok", date: "2026.5.12", text: "AI Morning Selfies (Dola AI, for LATAM)",
        media: "assets/img/ab54817a46c1c6989f58b5626bc85910.jpg",
        stats: { views: "2.9M", likes: "79.8K", comments: "", shares: "", saves: "2.1K" } },
      { type: "file", tab: "AI Side Hustle", platform: "Dola AI / TikTok", date: "2026.7.13", text: "POV: this Dola hack covers ur lunch money",
        media: "assets/img/2.jpg",
        stats: { views: "7.9M", likes: "39.3K", comments: "", shares: "1.7K", saves: "9.6K" } },
      { type: "file", tab: "Learning with AI", platform: "Dola AI / TikTok", date: "2026.7.16", text: "POV: the exam is tomorrow 😭",
        media: "assets/img/425165055a78c3808ff1d64da9d5bf5d.jpg",
        stats: { views: "5.8M", likes: "131K", comments: "", shares: "4.6K", saves: "25.2K" } },
      { type: "divider", tab: "DOCUMENTS" },
      { type: "file", tab: "VOID EDP Perfume", platform: "DOCUMENTS / RedNote", date: "2025.11.27", text: "Slow Down, Grow Naturally",
        media: "assets/img/ccdbcb2fe97046ae5e802d6a78eb4660.jpg",
        stats: { views: "", likes: "1.7K", comments: "", shares: "", saves: "" } },
      { type: "file", tab: "Knot Charm", platform: "DOCUMENTS / RedNote", date: "2025.11.30", text: "POV: your perfume matches your OOTD",
        media: "assets/img/3.jpg",
        stats: { views: "", likes: "1.2K", comments: "", shares: "", saves: "" } },
    ],
  },

  /* P4 · I Create.：可旋转的线框球，8 个位置 = 8 件作品。
     拖动球体旋转，点击某一张图，在右侧看详情。
     球面上每张图的面板形状跟着图片比例走，不裁切；点开后右侧的大图也按原比例完整显示。
     link 留空时页面上不显示链接按钮。
     想加第 9 件：复制一个 { ... } 粘贴在后面，球面会自动重新排布。 */
  create: {
    title: "I Create.",
    lede: "Turning ideas into stories, campaigns and products.",
    hint: "Drag to rotate. Click an image to open it.",
    items: [
      {
        kind: "Non-fiction feature",
        title: "Elderly Singles Falling in Love at IKEA",
        outlet: "Published online by The Paper, Shanghai",
        abstract: "Investigated for over 2 months, did more than 40 hours of fieldwork and wrote over 8,500 words.",
        link: "https://mp.weixin.qq.com/s/LcvsoQXqcW9mL1JMBtaYdA",
        image: "assets/img/102acf23937f6aa2537236468f884207.jpg",
      },
      {
        kind: "Data journalism work",
        title: "Farewell, NPD Lover!",
        outlet: "Published online by The Paper, Shanghai",
        abstract: "Scraped over 4,000 Douban posts with Python, totalling 2,003,040 characters of usable data, and visualised them in Tableau.",
        link: "https://mp.weixin.qq.com/s/-27uRyxGco-gLAnEP51khw",
        image: "assets/img/3cb3833663a170aeb1453f2a19c0ec81.jpg",
      },
      {
        kind: "Brand manifesto",
        title: "DOCUMENTS' Official Brand Manifesto",
        outlet: "Included in Instagram Stories",
        abstract: "Wrote DOCUMENTS' official English brand manifesto. Published on Instagram Stories and used to brief fragrance houses, including Givaudan and Firmenich.",
        link: "",
        image: "assets/img/e464dce569931f6a33426136b6c9709b.jpg",
      },
      {
        kind: "S-tier campaign",
        title: "DOCUMENTS CNY Campaign",
        outlet: "DOCUMENTS Brand Marketing",
        abstract: "Planned and secured DOCUMENTS' CNY campaign, including the opening of the Red House, as shown in the picture.",
        link: "",
        image: "assets/img/fac54c58e208c2f083965104c0f7ecac.jpg",
      },
      {
        kind: "PR competition",
        title: "10th China University Students PR Planning Contest",
        outlet: "A brand marketing pitch for SpringSummer, a sunscreen brand",
        abstract: "Won National First Prize.",
        link: "",
        image: "assets/img/c30b2da36777f9c4b8474f359a8212a7.jpg",
      },
      {
        kind: "Product GTM",
        title: "DOCUMENTS EDP Knot Charm",
        outlet: "Product Marketing",
        abstract: "Created the industry's first fragrance bag charm.",
        link: "",
        image: "assets/img/bf2f2cf9490e515074399eb4ed338009.jpg",
      },
      {
        kind: "Live TV",
        title: "Leaders Talk on CCTV",
        outlet: "Editor Intern",
        abstract: "Created one of the programme's most-watched episodes.",
        link: "",
        image: "assets/img/16560a401cc10e3e4427e756dcf7a3e3.jpg",
      },
      {
        kind: "Brand GTM",
        title: "GTM Strategy for Peace Incense",
        outlet: "Building a sub-brand of DOCUMENTS from 0 to 1",
        abstract: "Shaped Peace Incense's GTM from scratch, generating RMB 1.5M in 15 days; conceived GuiBao, a turtle character still used across official social channels as a core visual asset.",
        link: "",
        image: "assets/img/4.jpg",
      },
    ],
  },

  /* P5 · I Climb.：几何攀岩墙。
     有 media 的岩点可悬停放大成图片 / 视频；没有 media 的只是装饰。
     route: true 的岩点按顺序连成路线（从 START 到 TOP）。
     shape: tri | disc | half | pill | hex | crescent | square | drop
     color: 任意颜色（这一页不受全站色板限制）
     media.src 可以是图片，也可以是视频（.mp4 / .webm 悬停时静音循环播放）。 */
  climb: {
    title: "I Climb.",
    lede: "Bouldering and rope climbing between London and Shanghai.",
    stats: ["Bouldering V4-V5", "Rope 5.11b"],
    holds: [
      { x: 18, y: 84, s: 6.7, shape: "half", color: "#e0457b", rot: 0, route: true,
        media: { src: "assets/img/64d689bc1ef81f7ccb4554126a023037_raw.mp4", caption: "LONDON_THE FONT" } },
      { x: 30, y: 66, s: 5.8, shape: "tri", color: "#f4b51f", rot: 12, route: true,
        media: { src: "assets/img/c0cf696eaedbecd0a93d801290bba4e2_raw.mp4", caption: "LONDON_THE FONT" } },
      { x: 26, y: 44, s: 5.1, shape: "pill", color: "#7b5cd6", rot: -24, route: true,
        media: { src: "assets/img/303b3a624c487ca477c9f1a3e03ab4ef_raw.mp4", caption: "LONDON_THE FONT" } },
      { x: 43, y: 50, s: 7.0, shape: "hex", color: "#1e917d", rot: 8, route: true,
        media: { src: "assets/img/7049feab48bf9fbc45f04dfd181a3c3e_raw.mp4", caption: "SHANGHAI_BANANA CLIMBING" } },
      { x: 52, y: 30, s: 5.4, shape: "crescent", color: "#e0457b", rot: -30, route: true,
        media: { src: "assets/img/4923f7a18697d7f356d0382e1ba79406_raw.mp4", caption: "LONDON_THE FONT" } },
      { x: 66, y: 38, s: 6.1, shape: "drop", color: "#3a7bd5", rot: 140, route: true,
        media: { src: "assets/img/7ac4e5fd0528495c9004077905553005_raw.mp4", caption: "SHANGHAI_ROC88" } },
      { x: 76, y: 17, s: 7.4, shape: "disc", color: "#f68353", rot: 0, route: true,
        media: { src: "assets/img/807e26aeba4fe12a2f06a49cf250b768_raw.mp4", caption: "SHANGHAI_LEDONGLI" } },

      { x: 9, y: 30, s: 3.8, shape: "square", color: "#2fb36b", rot: 18 },
      { x: 12, y: 62, s: 3.5, shape: "tri", color: "#7b5cd6", rot: -40 },
      { x: 38, y: 82, s: 4.2, shape: "disc", color: "#f4b51f", rot: 0 },
      { x: 37, y: 18, s: 3.5, shape: "half", color: "#3a7bd5", rot: 160 },
      { x: 58, y: 70, s: 4.8, shape: "pill", color: "#f68353", rot: 35 },
      { x: 70, y: 82, s: 3.8, shape: "hex", color: "#e0457b", rot: 0 },
      { x: 84, y: 56, s: 4.5, shape: "tri", color: "#2fb36b", rot: 200 },
      { x: 90, y: 30, s: 3.5, shape: "crescent", color: "#f4b51f", rot: 60 },
      { x: 62, y: 12, s: 3.2, shape: "square", color: "#7b5cd6", rot: -12 },
    ],
  },

  /* P6 · I Vibe.：三栏撕纸拼贴（健身 / 穿搭 / 生活），原图彩色显示。
     photo：x / y / w 是“栏宽的百分比”，高度按 ar 自动算（默认 4:5 竖版，可写 ar: "3 / 4"）。
     其他图形（graph 坐标纸曲线 / halftone 半调点阵 / stripes 条纹）用 x / y / w / h。
     torn: 撕边方向，可组合，如 ["bottom", "right"]；rot: 轻微旋转角度。 */
  vibe: {
    title: "I Vibe.",
    lede: "Fitness, outfits and everyday life away from work.",
    columns: [
      {
        label: "Fitness",
        pieces: [
          { kind: "photo", image: "assets/img/4f062deaef6ebdcacd9039ca9ac95afe.jpg", x: 0, y: 0, w: 56, rot: -0.6, torn: ["bottom"] },
          { kind: "graph", x: 60, y: 4, w: 38, h: 26, rot: 0, torn: ["left", "bottom"] },
          { kind: "photo", image: "assets/img/5baa06efc79e016a0c4a8d978d3bd87f.jpg", x: 46, y: 36, w: 54, rot: 0.8, torn: ["left"] },
          { kind: "photo", image: "assets/img/69a6b76d98369110b5b2d4490b8957ce.jpg", x: 0, y: 90, w: 54, rot: 0.5, torn: ["top", "right"] },
          { kind: "photo", image: "assets/img/97acc93588ae473ce04d27032a6ff604.jpg", x: 44, y: 142, w: 56, rot: -0.8, torn: ["left", "bottom"] },
        ],
      },
      {
        label: "Outfit",
        pieces: [
          { kind: "photo", image: "assets/img/1201360c9d3b9c1e936be1f9900d8dc4.jpg", x: 6, y: 0, w: 60, rot: 0.6, torn: ["bottom", "right"] },
          { kind: "stripes", x: 70, y: 10, w: 28, h: 30, rot: 0, torn: ["left"] },
          { kind: "photo", image: "assets/img/746833bc2c1f3d17da94e02851144546.jpg", x: 44, y: 52, w: 56, rot: -0.7, torn: ["top"] },
          { kind: "photo", image: "assets/img/21efe87e45cd1726bb485189543afe6d.jpg", x: 0, y: 88, w: 48, rot: 0.6, torn: ["right", "bottom"] },
          { kind: "photo", image: "assets/img/877150df02ea498cd58c421452dceaa3.jpg", x: 40, y: 132, w: 54, rot: 0.4, torn: ["top"] },
          { kind: "photo", image: "assets/img/3a3395d1ca0bcfc37a69e148d3f46dc7.jpg", x: 4, y: 160, w: 44, rot: -0.5, torn: ["top", "right"] },
        ],
      },
      {
        label: "Life",
        pieces: [
          { kind: "halftone", x: 58, y: 0, w: 38, h: 24, rot: 0, torn: ["bottom"] },
          { kind: "photo", image: "assets/img/0fdbe2aa73f77b9d6b08bd9ae4d78f17.jpg", x: 0, y: 8, w: 56, rot: -0.5, torn: ["right", "bottom"] },
          { kind: "photo", image: "assets/img/cef5696c6d67be5502b6161196c6d9e2.jpg", x: 48, y: 30, w: 52, rot: 0.7, torn: ["top"] },
          { kind: "photo", image: "assets/img/8c196772c498db82036687fbccceff62.jpg", x: 6, y: 84, w: 52, rot: 0.5, torn: ["top", "right"] },
          { kind: "photo", image: "assets/img/3a62369ad9960e90ba5641ed28996329.jpg", x: 50, y: 104, w: 50, rot: -0.6, torn: ["left"] },
          { kind: "photo", image: "assets/img/4c0b63b9fdbaf66603458821bdfd2fc4.jpg", x: 2, y: 152, w: 56, rot: 0.3, torn: ["top"] },
        ],
      },
    ],
  },

  /* P7 · 结束页：标题还没定，先用占位。
     value 为空时显示 “Pending”。href 可选（有 href 的会变成链接）。 */
  contact: {
    title: "I Connect.",
    plateFooterLeft: "Acts fast. Makes it last.",
    plateFooterRight: "Personal Website",
    rows: [
      { label: "Email", value: "xingpei.xu26@imperial.ac.uk", href: "mailto:xingpei.xu26@imperial.ac.uk" },
      { label: "LinkedIn", value: "linkedin.com/in/xingpei-xu", href: "https://www.linkedin.com/in/xingpei-xu" },
      { label: "Telephone", value: "+44 7434 213869", href: "tel:+447434213869" },
      { label: "Instagram", value: "paaatrick_xxp", href: "" },
      { label: "WeChat", value: "Patrick20040502", href: "" },
    ],
  },
};
