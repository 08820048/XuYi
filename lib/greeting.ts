import type { Locale } from '@/lib/i18n'

export interface VisitorPlace {
  country?: string
  region?: string
  city?: string
}

const ZH_COUNTRIES = new Set(['CN', 'HK', 'MO', 'TW'])

/** 常见城市的中文名（Cloudflare 给的是英文名）。没收录的城市在中文问候里退回成国家名。 */
const CITY_ZH: Record<string, string> = {
  Beijing: '北京', Shanghai: '上海', Guangzhou: '广州', Shenzhen: '深圳', Hangzhou: '杭州', Chengdu: '成都',
  Chongqing: '重庆', Wuhan: '武汉', Nanjing: '南京', Tianjin: '天津', "Xi'an": '西安', Xian: '西安', Suzhou: '苏州',
  Changsha: '长沙', Zhengzhou: '郑州', Qingdao: '青岛', Dalian: '大连', Xiamen: '厦门', Ningbo: '宁波', Hefei: '合肥',
  Jinan: '济南', Fuzhou: '福州', Kunming: '昆明', Shenyang: '沈阳', Harbin: '哈尔滨', Changchun: '长春',
  Shijiazhuang: '石家庄', Taiyuan: '太原', Nanchang: '南昌', Guiyang: '贵阳', Nanning: '南宁', Lanzhou: '兰州',
  Urumqi: '乌鲁木齐', Hohhot: '呼和浩特', Yinchuan: '银川', Xining: '西宁', Lhasa: '拉萨', Haikou: '海口',
  Wuxi: '无锡', Dongguan: '东莞', Foshan: '佛山', Zhuhai: '珠海', Wenzhou: '温州', Jiaxing: '嘉兴', Shaoxing: '绍兴',
  Jinhua: '金华', Taizhou: '台州', Changzhou: '常州', Nantong: '南通', Yantai: '烟台', Weifang: '潍坊', Luoyang: '洛阳',
  Quanzhou: '泉州', Zhongshan: '中山', Huizhou: '惠州', Tangshan: '唐山', Baoding: '保定', Xuzhou: '徐州',
  Yangzhou: '扬州', Zibo: '淄博', Linyi: '临沂', Handan: '邯郸', Anshan: '鞍山', Daqing: '大庆', Guilin: '桂林',
  Sanya: '三亚', Zunyi: '遵义', Mianyang: '绵阳', Yichang: '宜昌', Xiangyang: '襄阳', Wuhu: '芜湖', Bengbu: '蚌埠',
  'Hong Kong': '香港', Macau: '澳门', Macao: '澳门', Taipei: '台北', Kaohsiung: '高雄', Taichung: '台中',
  Tokyo: '东京', Osaka: '大阪', Kyoto: '京都', Seoul: '首尔', Singapore: '新加坡', Bangkok: '曼谷',
  'Kuala Lumpur': '吉隆坡', Sydney: '悉尼', Melbourne: '墨尔本', London: '伦敦', Paris: '巴黎', Berlin: '柏林',
  'New York': '纽约', 'Los Angeles': '洛杉矶', 'San Francisco': '旧金山', Seattle: '西雅图', Toronto: '多伦多',
  Vancouver: '温哥华', Dubai: '迪拜', Moscow: '莫斯科', Amsterdam: '阿姆斯特丹', Madrid: '马德里', Rome: '罗马',
}

/** 省级行政区（拿不到城市时，国内访客说到省）。 */
const REGION_ZH: Record<string, string> = {
  Beijing: '北京', Shanghai: '上海', Tianjin: '天津', Chongqing: '重庆', Guangdong: '广东', Zhejiang: '浙江',
  Jiangsu: '江苏', Sichuan: '四川', Hubei: '湖北', Hunan: '湖南', Henan: '河南', Hebei: '河北', Shandong: '山东',
  Fujian: '福建', Anhui: '安徽', Jiangxi: '江西', Shaanxi: '陕西', Shanxi: '山西', Yunnan: '云南', Guizhou: '贵州',
  Guangxi: '广西', Hainan: '海南', Liaoning: '辽宁', Jilin: '吉林', Heilongjiang: '黑龙江', Gansu: '甘肃',
  Qinghai: '青海', Ningxia: '宁夏', Xinjiang: '新疆', Tibet: '西藏', 'Inner Mongolia': '内蒙古',
}

function countryName(code: string | undefined, locale: Locale) {
  if (!code) return ''
  try {
    return new Intl.DisplayNames([locale === 'zh' ? 'zh-CN' : 'en'], { type: 'region' }).of(code) ?? ''
  } catch {
    return ''
  }
}

/**
 * 问候用哪种语言：在 /en 下一律英文；否则看浏览器语言，浏览器没表态时再看 IP 所在国家
 * （大陆、港澳台 → 中文，其余 → 英文）。只靠 IP 会误判在海外的中文读者和在国内的外国人，所以 IP 只是兜底。
 */
export function greetingLocale(pageLocale: Locale, browserLanguage: string | undefined, place: VisitorPlace): Locale {
  if (pageLocale === 'en') return 'en'
  const lang = (browserLanguage ?? '').toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('en') && !ZH_COUNTRIES.has(place.country ?? '')) return 'en'
  return ZH_COUNTRIES.has(place.country ?? '') || !place.country ? 'zh' : 'en'
}

function placeName(place: VisitorPlace, locale: Locale) {
  if (locale === 'en') return place.city || countryName(place.country, 'en')
  if (place.city && CITY_ZH[place.city]) return CITY_ZH[place.city]
  if (place.country === 'CN' && place.region && REGION_ZH[place.region]) return REGION_ZH[place.region]
  return countryName(place.country, 'zh')
}

export function buildGreeting(locale: Locale, place: VisitorPlace, hour: number): string {
  const where = placeName(place, locale)
  if (locale === 'zh') {
    const hello =
      hour >= 5 && hour < 11 ? '早上好'
      : hour >= 11 && hour < 13 ? '中午好'
      : hour >= 13 && hour < 18 ? '下午好'
      : hour >= 18 && hour < 23 ? '晚上好'
      : '夜深了'
    return where ? `${hello}，欢迎来自${where}的朋友` : `${hello}，欢迎来访`
  }
  const hello =
    hour >= 5 && hour < 12 ? 'Good morning'
    : hour >= 12 && hour < 18 ? 'Good afternoon'
    : hour >= 18 && hour < 23 ? 'Good evening'
    : 'Still up'
  return where ? `${hello}, welcome from ${where}` : `${hello}, welcome`
}
