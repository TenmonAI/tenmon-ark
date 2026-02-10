export type Lang =
  | "ja"
  | "en"
  | "es"
  | "fr"
  | "zh-Hans"
  | "zh-Hant"
  | "ko";

export const SUPPORTED_LANGS: Lang[] = [
  "ja",
  "en",
  "es",
  "fr",
  "zh-Hans",
  "zh-Hant",
  "ko",
];

type Dict = Record<string, string>;

const ja: Dict = {
  "sidebar.newChat": "新しいチャット",
  "sidebar.search": "検索",
  "sidebar.today": "今日",
  "sidebar.chat": "チャット",
  "sidebar.explore": "探索",
  "sidebar.dashboard": "ダッシュボード",
  "sidebar.profile": "プロフィール",
  "sidebar.settings": "設定",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "天聞アーク",

  "topbar.chatMeta": "/api/chat （同一オリジン）",

  "composer.placeholder": "天聞アークにメッセージを送る…",

  "settings.title": "設定",
  "settings.close": "閉じる",
  "settings.section.general": "全般",
  "settings.section.appearance": "外観",
  "settings.section.language": "言語",
  "settings.section.data": "データ",
  "settings.section.about": "このアプリについて",
  "settings.language.title": "表示言語",
  "settings.language.subtitle": "TENMON-ARK のUIに使う言語を選択できます。",
  "settings.language.label": "インターフェースの言語",
  "settings.language.option.ja": "日本語",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "このセクションは準備中です。",
};

const en: Dict = {
  "sidebar.newChat": "New chat",
  "sidebar.search": "Search",
  "sidebar.today": "Today",
  "sidebar.chat": "Chat",
  "sidebar.explore": "Explore",
  "sidebar.dashboard": "Dashboard",
  "sidebar.profile": "Profile",
  "sidebar.settings": "Settings",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "Tenmon Ark",

  "topbar.chatMeta": "/api/chat (same-origin)",

  "composer.placeholder": "Message TENMON-ARK...",

  "settings.title": "Settings",
  "settings.close": "Close",
  "settings.section.general": "General",
  "settings.section.appearance": "Appearance",
  "settings.section.language": "Language",
  "settings.section.data": "Data controls",
  "settings.section.about": "About",
  "settings.language.title": "Interface language",
  "settings.language.subtitle": "Choose the language used for TENMON-ARK.",
  "settings.language.label": "Language",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "This section is coming soon.",
};

const es: Dict = {
  "sidebar.newChat": "Nuevo chat",
  "sidebar.search": "Buscar",
  "sidebar.today": "Hoy",
  "sidebar.chat": "Chat",
  "sidebar.explore": "Explorar",
  "sidebar.dashboard": "Panel",
  "sidebar.profile": "Perfil",
  "sidebar.settings": "Ajustes",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "Tenmon Ark",

  "topbar.chatMeta": "/api/chat (origen común)",

  "composer.placeholder": "Escribe a TENMON-ARK…",

  "settings.title": "Ajustes",
  "settings.close": "Cerrar",
  "settings.section.general": "General",
  "settings.section.appearance": "Apariencia",
  "settings.section.language": "Idioma",
  "settings.section.data": "Datos",
  "settings.section.about": "Acerca de",
  "settings.language.title": "Idioma de la interfaz",
  "settings.language.subtitle": "Elige el idioma de TENMON-ARK.",
  "settings.language.label": "Idioma",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "Esta sección llegará pronto.",
};

const fr: Dict = {
  "sidebar.newChat": "Nouvelle discussion",
  "sidebar.search": "Recherche",
  "sidebar.today": "Aujourd’hui",
  "sidebar.chat": "Discussion",
  "sidebar.explore": "Explorer",
  "sidebar.dashboard": "Tableau de bord",
  "sidebar.profile": "Profil",
  "sidebar.settings": "Paramètres",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "Tenmon Ark",

  "topbar.chatMeta": "/api/chat (même origine)",

  "composer.placeholder": "Écrire à TENMON-ARK…",

  "settings.title": "Paramètres",
  "settings.close": "Fermer",
  "settings.section.general": "Général",
  "settings.section.appearance": "Apparence",
  "settings.section.language": "Langue",
  "settings.section.data": "Données",
  "settings.section.about": "À propos",
  "settings.language.title": "Langue de l’interface",
  "settings.language.subtitle": "Choisissez la langue de TENMON-ARK.",
  "settings.language.label": "Langue",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "Cette section arrive bientôt.",
};

const zhHans: Dict = {
  "sidebar.newChat": "新对话",
  "sidebar.search": "搜索",
  "sidebar.today": "今天",
  "sidebar.chat": "对话",
  "sidebar.explore": "探索",
  "sidebar.dashboard": "控制面板",
  "sidebar.profile": "个人资料",
  "sidebar.settings": "设置",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "天闻方舟",

  "topbar.chatMeta": "/api/chat（同源）",

  "composer.placeholder": "向 TENMON-ARK 发送消息…",

  "settings.title": "设置",
  "settings.close": "关闭",
  "settings.section.general": "通用",
  "settings.section.appearance": "外观",
  "settings.section.language": "语言",
  "settings.section.data": "数据",
  "settings.section.about": "关于",
  "settings.language.title": "界面语言",
  "settings.language.subtitle": "选择 TENMON-ARK 使用的语言。",
  "settings.language.label": "语言",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "此部分即将推出。",
};

const zhHant: Dict = {
  "sidebar.newChat": "新對話",
  "sidebar.search": "搜尋",
  "sidebar.today": "今天",
  "sidebar.chat": "對話",
  "sidebar.explore": "探索",
  "sidebar.dashboard": "控制台",
  "sidebar.profile": "個人資料",
  "sidebar.settings": "設定",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "天聞方舟",

  "topbar.chatMeta": "/api/chat（同源）",

  "composer.placeholder": "向 TENMON-ARK 發送訊息…",

  "settings.title": "設定",
  "settings.close": "關閉",
  "settings.section.general": "一般",
  "settings.section.appearance": "外觀",
  "settings.section.language": "語言",
  "settings.section.data": "資料",
  "settings.section.about": "關於",
  "settings.language.title": "介面語言",
  "settings.language.subtitle": "選擇 TENMON-ARK 使用的語言。",
  "settings.language.label": "語言",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "此區塊即將推出。",
};

const ko: Dict = {
  "sidebar.newChat": "새 채팅",
  "sidebar.search": "검색",
  "sidebar.today": "오늘",
  "sidebar.chat": "채팅",
  "sidebar.explore": "탐색",
  "sidebar.dashboard": "대시보드",
  "sidebar.profile": "프로필",
  "sidebar.settings": "설정",
  "sidebar.brandLine1": "TENMON-ARK",
  "sidebar.brandLine2": "텐몬 아크",

  "topbar.chatMeta": "/api/chat (same-origin)",

  "composer.placeholder": "TENMON-ARK 에게 메시지를 보내세요…",

  "settings.title": "설정",
  "settings.close": "닫기",
  "settings.section.general": "일반",
  "settings.section.appearance": "모양",
  "settings.section.language": "언어",
  "settings.section.data": "데이터",
  "settings.section.about": "정보",
  "settings.language.title": "인터페이스 언어",
  "settings.language.subtitle": "TENMON-ARK 에 사용할 언어를 선택합니다.",
  "settings.language.label": "언어",
  "settings.language.option.ja": "日本語 / Japanese",
  "settings.language.option.en": "English",
  "settings.language.option.es": "Español",
  "settings.language.option.fr": "Français",
  "settings.language.option.zh-Hans": "简体中文",
  "settings.language.option.zh-Hant": "繁體中文",
  "settings.language.option.ko": "한국어",
  "settings.comingSoon": "이 섹션은 준비 중입니다.",
};

export const STRINGS: Record<Lang, Dict> = {
  ja,
  en,
  es,
  fr,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  ko,
};

