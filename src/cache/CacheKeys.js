const USER_KEYS = {
  ALL_SKILLS: "all_skills",
  ALL_UNSKILLED_SKILLS: "all_unskilled_skills",
};

const ADMIN_KEYS = {
  ADMIN_SKILL_LIST: "admin_skill_list",
  ADMIN_UNSKILLED_LIST: "admin_unskilled_list",
};

const SYSTEM_SETTINGS = {
  GET_SYSTEM_COIN_SETTINGS: "get_system_coin_setting",
};

const BANNER_KEY = {
  bannerKey: "banners_admin",
};

const CacheKeys = {
  ...USER_KEYS,
  ...ADMIN_KEYS,
  ...SYSTEM_SETTINGS,
  ...BANNER_KEY,
};

export default CacheKeys;
