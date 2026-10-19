/** GB/T 2260 行政区划代码子集（覆盖主要省份的部分区县，用于模拟数据生成） */
export interface Area {
  code: string
  province: string
  city: string
  district: string
}

export const AREAS: Area[] = [
  { code: '110101', province: '北京市', city: '北京市', district: '东城区' },
  { code: '110105', province: '北京市', city: '北京市', district: '朝阳区' },
  { code: '110106', province: '北京市', city: '北京市', district: '丰台区' },
  { code: '110108', province: '北京市', city: '北京市', district: '海淀区' },
  { code: '310104', province: '上海市', city: '上海市', district: '徐汇区' },
  { code: '310106', province: '上海市', city: '上海市', district: '静安区' },
  { code: '310112', province: '上海市', city: '上海市', district: '闵行区' },
  { code: '310115', province: '上海市', city: '上海市', district: '浦东新区' },
  { code: '440103', province: '广东省', city: '广州市', district: '荔湾区' },
  { code: '440104', province: '广东省', city: '广州市', district: '越秀区' },
  { code: '440106', province: '广东省', city: '广州市', district: '天河区' },
  { code: '440305', province: '广东省', city: '深圳市', district: '南山区' },
  { code: '440306', province: '广东省', city: '深圳市', district: '宝安区' },
  { code: '440307', province: '广东省', city: '深圳市', district: '龙岗区' },
  { code: '330102', province: '浙江省', city: '杭州市', district: '上城区' },
  { code: '330105', province: '浙江省', city: '杭州市', district: '拱墅区' },
  { code: '330106', province: '浙江省', city: '杭州市', district: '西湖区' },
  { code: '330203', province: '浙江省', city: '宁波市', district: '海曙区' },
  { code: '320102', province: '江苏省', city: '南京市', district: '玄武区' },
  { code: '320104', province: '江苏省', city: '南京市', district: '秦淮区' },
  { code: '320505', province: '江苏省', city: '苏州市', district: '虎丘区' },
  { code: '320506', province: '江苏省', city: '苏州市', district: '吴中区' },
  { code: '510104', province: '四川省', city: '成都市', district: '锦江区' },
  { code: '510107', province: '四川省', city: '成都市', district: '武侯区' },
  { code: '510108', province: '四川省', city: '成都市', district: '成华区' },
  { code: '420102', province: '湖北省', city: '武汉市', district: '江岸区' },
  { code: '420106', province: '湖北省', city: '武汉市', district: '武昌区' },
  { code: '420111', province: '湖北省', city: '武汉市', district: '洪山区' },
  { code: '430102', province: '湖南省', city: '长沙市', district: '芙蓉区' },
  { code: '430104', province: '湖南省', city: '长沙市', district: '岳麓区' },
  { code: '610103', province: '陕西省', city: '西安市', district: '碑林区' },
  { code: '610113', province: '陕西省', city: '西安市', district: '雁塔区' },
  { code: '370102', province: '山东省', city: '济南市', district: '历下区' },
  { code: '370202', province: '山东省', city: '青岛市', district: '市南区' },
  { code: '370212', province: '山东省', city: '青岛市', district: '崂山区' },
]

export const STREETS = [
  '建设路', '解放大道', '人民路', '中山街', '和平路', '友谊街',
  '朝阳路', '新华路', '文化路', '幸福大街', '胜利街', '迎宾大道',
  '学府路', '兴业街', '锦绣路', '安康路', '望江路', '青云街',
]
