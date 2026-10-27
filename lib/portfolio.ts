const file = (name: string) => `/portfolio/${name}`;

export const TRAFFIC_API =
  process.env.NEXT_PUBLIC_TRAFFIC_API || "https://traffic.xuyi.dev/api/traffic";

export const profile = {
  name: "XuYi",
  avatar: file("avatar.jpg"),
  bio: ["独立产品&游戏开发者。", "从解决自己的需求开始。"],
  blogTagline: "记录成长,写游戏、也写AI。",
  bioEn: ["Indie product & game developer.", " Starting from my own problems."],
  blogTaglineEn: " Notes on growing up — writing about games, and AI.",
  xUrl: "https://x.com/xuyidev",
  email: "ilikexff@gmail.com",
  github: "https://github.com/08820048",
  threads: "https://www.threads.com/@xuyidev",
  whatsapp: "https://wa.me/xuyidev",
} as const;

export type Product = {
  id: string;
  name: string;
  logo: string;
  desc: string;
  /** 英文简介（/en 下使用） */
  descEn: string;
  link: string;
  size: "big" | "thin";
  cta: string;
  badge?: "OPEN";
  apple?: boolean;
  /**
   * 产品展示图（点击可放大），图片或视频混合排列，视频会静音自动循环播放。
   * 要求：
   * - 图片放 public/portfolio/ 下（推荐 webp）或写完整在线 URL；视频用 mp4
   * - 展示容器为 240×240 正方形、居中裁切（object-fit: cover），
   *   请提供 1:1 正方形素材（建议 480×480 以上），横屏素材左右会被裁掉
   * - 若用横屏截图/录屏，主体放在画面中间，避免贴边
   */
  shots?: string[];
};

export const freeProject: Product[] = [
  {
    id: "ornata",
    name: "Ornata",
    logo: file("logo-ornata.png"),
    desc: "一款新概念、轻量化的笔记,尽享丝滑。",
    descEn: "A new, lightweight take on notes. Silky smooth.",
    link: "https://ornata.app/",
    size: "big",
    cta: "访问",
    apple: true,
    shots: [file("ornata-1.png"), file("ornata-2.png"), file("ornata-3.mp4")],
  },
  {
    id: "folio",
    name: "Folio",
    logo: file("logo-folio.png"),
    desc: "为读代码而做的 Mac 编辑器。",
    descEn: "A Mac editor built for reading code.",
    link: "https://folioedit.dev/",
    size: "thin",
    cta: "访问 →",
    badge: "OPEN",
  },
  {
    id: "toolpop",
    name: "ToolPop",
    logo: file("logo-pop.png"),
    desc: "功能齐全的在线工具站,无登录,直接用。",
    descEn: "A full-featured online toolbox. No login, just use it.",
    link: "https://toolpop.win/",
    size: "thin",
    cta: "访问 →",
  },
  {
    id: "berth",
    name: "Berth",
    logo: file("logo-berth.png"),
    desc: "菜单栏看端口，一键释放。",
    descEn: "See ports in the menu bar. Free them in one click.",
    link: "https://berth.fyi/",
    size: "thin",
    cta: "访问 →",
    badge: "OPEN",
  },
  {
    id: "citu",
    name: "词图",
    logo: file("logo-citu.svg"),
    desc: "社区驱动的 AI 生图提示词精选，收录 X 平台优质提示词，永久免费。",
    descEn: "Community-curated AI image prompts from X. Free forever.",
    link: "https://citu.work/",
    size: "thin",
    cta: "访问 →",
  },
];

export const projects: Product[] = [
  {
    id: "runnock",
    name: "Runnock",
    logo: file("logo-runnock.png"),
    desc: "把 Mac 刘海变成编码智能体的状态岛。",
    descEn: "Turns the Mac notch into a status island for coding agents.",
    link: "https://runnock.com/#pricing",
    size: "big",
    cta: "去购买",
    apple: true,
    shots: [file("runnock-1.mp4"), file("runnock-2.png"), file("runnock-3.mp4")],
  },
  {
    id: "hoolo",
    name: "Hoolo",
    logo: file("logo-hoolo.png"),
    desc: "妈妈再也不用担心我的Mac像狗窝,杂乱无章了。",
    descEn: "Keep your Mac tidy. Mom would be proud.",
    link: "https://hoolo.cc/#pricing",
    size: "big",
    cta: "去购买",
    apple: true,
    shots: [file("hoolo-1.mp4"), file("hoolo-2.png"), file("hoolo-3.png")],
  },
  {
    id: "chupin",
    name: "Chupin",
    logo: file("logo-chupin.png"),
    desc: "一页纸在线简历。支持PDF导出、邮件发送。",
    descEn: "One-page online résumés with PDF export and email sending.",
    link: "https://chupin.site/pricing",
    size: "big",
    cta: "去购买",
    shots: [file("chupin-1.webp"), file("chupin-2.webp"), file("chupin-3.webp")],
  },
  {
    id: "welight",
    name: "Welight",
    logo: file("logo-welight.png"),
    desc: "公众号创作排版神器,好看的排版,从来简约。",
    descEn: "A WeChat article formatter. Beautiful layouts, always simple.",
    link: "https://welight.fyi/",
    size: "big",
    cta: "去购买",
    shots: [file("welight-1.png"), file("welight-2.png"), file("welight-3.png")],
  },
  {
    id: "clibo",
    name: "Clibo",
    logo: file("logo-clibo.png"),
    desc: "复制过的东西,也可以有迹可循。",
    descEn: "Everything you've copied, easy to trace back.",
    link: "https://clibo.us/#pricing",
    size: "big",
    cta: "去购买",
    apple: true,
    shots: [file("clibo-1.mp4"), file("clibo-2.png"), file("clibo-3.mp4")],
  },
  {
    id: "xingchao",
    name: "星潮",
    logo: file("logo-xing.png"),
    desc: "自托管的 QQ 群助手,能量超乎你想象。",
    descEn: "A self-hosted QQ group assistant that does more than you'd expect.",
    link: "https://xingchao.dev/",
    size: "thin",
    cta: "访问 →",
    badge: "OPEN",
  },
  {
    id: "jevsift",
    name: "JevSift",
    logo: file("logo-jevsift.svg"),
    desc: "投研 Agent 的出处核验 API，对照源文判断声明能不能发。支持 HTTP 与 MCP。",
    descEn: "A source-verification API for research agents: check claims against the source text before publishing. HTTP and MCP supported.",
    link: "https://jevsift.com/pricing",
    size: "thin",
    cta: "去购买",
  },
];

export const collections: { name: string; logo: string; link: string }[] = [
  { name: "Runnock", logo: file("logo-runnock.png"), link: "https://runnock.com/" },
  { name: "Hoolo", logo: file("logo-hoolo.png"), link: "https://hoolo.cc/" },
  { name: "Chupin", logo: file("logo-chupin.png"), link: "https://chupin.site/" },
  { name: "Welight", logo: file("logo-welight.png"), link: "https://welight.fyi/" },
  { name: "Folio", logo: file("logo-folio.png"), link: "https://folioedit.dev/" },
  { name: "Ornata", logo: file("logo-ornata.png"), link: "https://ornata.app/" },
  { name: "Clibo", logo: file("logo-clibo.png"), link: "https://clibo.us" },
  { name: "ToolPop", logo: file("logo-pop.png"), link: "https://toolpop.win/" },
  { name: "Berth", logo: file("logo-berth.png"), link: "https://berth.fyi/" },
  { name: "星潮", logo: file("logo-xing.png"), link: "https://xingchao.dev/" },
  { name: "词图", logo: file("logo-citu.svg"), link: "https://citu.work/" },
  { name: "JevSift", logo: file("logo-jevsift.svg"), link: "https://jevsift.com/" },
];

/** 「100 个产品计划」：目标数量与当前已上线数量（取自产品图标合集）。 */
export const productPlan = {
  goal: 100,
  done: collections.length,
} as const;
