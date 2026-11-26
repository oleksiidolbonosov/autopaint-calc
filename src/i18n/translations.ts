import {
  EstimateStageId,
  LaborOperationType,
  LocaleCode,
  MaterialCategory,
  MaterialUnit,
  PartGroupCategory,
  VehiclePartId,
  VehicleType,
  VehicleView,
} from '../types/models';

export interface TranslationDictionary {
  appName: string;
  nav: {
    dashboard: string;
    newEstimate: string;
    history: string;
    materials: string;
    labor: string;
    settings: string;
  };
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    duplicate: string;
    printPdf: string;
    close: string;
    add: string;
    search: string;
    reset: string;
    confirm: string;
    uah: string;
    usd: string;
    sampleLabel: string;
    overridden: string;
    offlineBanner: string;
    installApp: string;
    installIosTitle: string;
    installIosStep1: string;
    installIosStep2: string;
    noResults: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    createEstimateCta: string;
    exchangeRateTitle: string;
    fetchNbu: string;
    fetchingNbu: string;
    manualRate: string;
    sourceNbu: string;
    sourceManual: string;
    sourceCached: string;
    updatedAt: string;
    nbuOfflineFallback: string;
    totalEstimates: string;
    totalVolume: string;
    avgTicket: string;
    recentEstimates: string;
    viewAll: string;
    quickActions: string;
  };
  estimate: {
    newTitle: string;
    editTitle: string;
    stepClient: string;
    stepParts: string;
    stepLabor: string;
    stepMaterials: string;
    stepStages: string;
    stepSummary: string;
    customerName: string;
    customerNamePlaceholder: string;
    customerPhone: string;
    customerPhonePlaceholder: string;
    vehicleType: string;
    orderDate: string;
    dueDate: string;
    dueDateHint: string;
    vehicleMake: string;
    vehicleMakePlaceholder: string;
    vehicleModel: string;
    vehicleModelPlaceholder: string;
    vehicleYear: string;
    vehicleColor: string;
    notes: string;
    notesPlaceholder: string;
    fullResprayTitle: string;
    fullResprayDesc: string;
    fullResprayActive: string;
    diagramTab: string;
    listTab: string;
    searchPartsPlaceholder: string;
    selectedCount: string;
    clearSelection: string;
    selectPartHint: string;
    noPartsSelected: string;
    addOperation: string;
    addCustomOperation: string;
    customOperationName: string;
    customOperationPlaceholder: string;
    duplicateWarning: string;
    priceOverrideHint: string;
    restoreMasterPrice: string;
    materialsModeQuick: string;
    materialsModeDetailed: string;
    quickModeHint: string;
    detailedModeHint: string;
    multiplierLabel: string;
    recalculateFromTemplates: string;
    addMaterialFromCatalog: string;
    addCustomMaterial: string;
    materialName: string;
    quantity: string;
    unit: string;
    packPrice: string;
    packSize: string;
    proportionalCost: string;
    adjustmentNone: string;
    adjustmentDiscount: string;
    adjustmentMarkup: string;
    percent: string;
    fixedUah: string;
    laborSubtotal: string;
    materialsSubtotal: string;
    subtotal: string;
    adjustmentRow: string;
    finalTotal: string;
    appliedRate: string;
    frozenRateNotice: string;
    refreshRateDraft: string;
    saveEstimate: string;
    savedToast: string;
    customerViewBtn: string;
    doubleSidedPaint: string;
    doubleSidedBadge: string;
    orderPhaseLabel: string;
    phasePreliminary: string;
    phaseFinal: string;
    lockPreliminaryBtn: string;
    preliminaryAmount: string;
    finalAmount: string;
    phaseDifference: string;
    depositSection: string;
    depositExpected: string;
    depositReceived: string;
    depositMarkFull: string;
    depositNotePlaceholder: string;
    depositBalanceDue: string;
    depositQuickBtn: string;
  };
  history: {
    title: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDesc: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    partsShort: string;
    rateLabel: string;
    frozenBadge: string;
  };
  materials: {
    title: string;
    catalogTab: string;
    templatesTab: string;
    addMaterial: string;
    editMaterial: string;
    nameLabel: string;
    categoryLabel: string;
    packageSizeLabel: string;
    packageUnitLabel: string;
    packagePriceLabel: string;
    currencyLabel: string;
    templatePartSelect: string;
    templateHint: string;
    addTemplateRule: string;
    emptyTitle: string;
    emptyDesc: string;
    templatesNoMaterialsHint: string;
  };
  labor: {
    title: string;
    subtitle: string;
    addCustomPreset: string;
    operationLabel: string;
    basePriceLabel: string;
    currencyLabel: string;
  };
  settings: {
    title: string;
    workshopSection: string;
    workshopName: string;
    workshopPhone: string;
    workshopAddress: string;
    workshopIdLabel: string;
    appearanceSection: string;
    language: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    currencySection: string;
    manualRateLabel: string;
    applyManualRate: string;
    backupSection: string;
    exportJson: string;
    importJson: string;
    importSuccess: string;
    importError: string;
    resetSample: string;
    resetConfirmTitle: string;
    resetConfirmDesc: string;
    pwaSection: string;
    pwaInstalled: string;
  };
  customerEstimate: {
    documentTitle: string;
    finalDocumentTitle: string;
    estimateNo: string;
    date: string;
    customer: string;
    vehicle: string;
    partsTitle: string;
    laborTableTitle: string;
    materialsTableTitle: string;
    colItem: string;
    colPart: string;
    colQty: string;
    colCostUah: string;
    colCostUsd: string;
    rateFootnote: string;
    preliminaryRateFootnote: string;
    thankYou: string;
    sharePdf: string;
    downloadPdf: string;
    generatingPdf: string;
    pdfDownloaded: string;
    shareFallbackDownloaded: string;
    pdfError: string;
    stagesSummary: string;
  };
  reminder: {
    title: string;
    subtitle: string;
    dueToday: string;
    dueTomorrow: string;
    dueInDays: string;
    overdueDays: string;
    openOrder: string;
    dismissWork: string;
    bannerText: string;
    viewOrders: string;
  };
  cloud: {
    title: string;
    signInGoogle: string;
    signingIn: string;
    signOut: string;
    syncActive: string;
    syncing: string;
    syncOfflinePrompt: string;
    syncDesc: string;
    syncError: string;
    signedInAs: string;
    ordersStoredInCloud: string;
    localOnlyWarning: string;
    localOnlySaveHint: string;
    savedToCloudToast: string;
    saveToCloudHint: string;
    refreshCloud: string;
    popupBlockedHint: string;
    unauthorizedDomainHint: string;
  };
  partGroups: Record<PartGroupCategory, string> & {
    all: string;
    selectedSummary: string;
  };
  vehicleTypes: Record<VehicleType, string>;
  stages: Record<EstimateStageId, string>;
  views: Record<VehicleView, string>;
  parts: Record<VehiclePartId, string>;
  operations: Record<LaborOperationType, string>;
  categories: Record<MaterialCategory, string>;
  units: Record<MaterialUnit, string>;
}

const uk: TranslationDictionary = {
  appName: 'AutoPaint Calc',
  nav: {
    dashboard: 'Головна',
    newEstimate: 'Розрахунок',
    history: 'Історія',
    materials: 'Матеріали',
    labor: 'Роботи',
    settings: 'Налашт.',
  },
  common: {
    save: 'Зберегти',
    cancel: 'Скасувати',
    delete: 'Видалити',
    edit: 'Редагувати',
    duplicate: 'Дублювати',
    printPdf: 'Друк / PDF',
    close: 'Закрити',
    add: 'Додати',
    search: 'Пошук...',
    reset: 'Скинути',
    confirm: 'Підтвердити',
    uah: 'UAH',
    usd: 'USD',
    sampleLabel: 'Зразок',
    overridden: 'Змінено вручну',
    offlineBanner: 'Офлайн-режим — дані зберігаються локально',
    installApp: 'Встановити додаток',
    installIosTitle: 'Встановлення на iPhone / iPad',
    installIosStep1: '1. Натисніть кнопку «Поділитися» (Share) на панелі Safari.',
    installIosStep2: '2. Прокрутіть вниз і виберіть «На екран «Домой»» (Add to Home Screen).',
    noResults: 'Нічого не знайдено',
  },
  dashboard: {
    title: 'AutoPaint Calc',
    subtitle: 'Оцінка кузовного ремонту та фарбування',
    createEstimateCta: 'Новий розрахунок',
    exchangeRateTitle: 'Курс USD / UAH',
    fetchNbu: 'Оновити НБУ',
    fetchingNbu: 'Оновлення...',
    manualRate: 'Вручну',
    sourceNbu: 'Офіційний курс НБУ',
    sourceManual: 'Задано вручну',
    sourceCached: 'Кешований курс НБУ',
    updatedAt: 'Оновлено',
    nbuOfflineFallback: 'Немає зʼєднання з НБУ, використано кеш',
    totalEstimates: 'Кошторисів',
    totalVolume: 'Сума оцінок',
    avgTicket: 'Середній чек',
    recentEstimates: 'Останні розрахунки',
    viewAll: 'Усі',
    quickActions: 'Довідники та сервіс',
  },
  estimate: {
    newTitle: 'Новий кошторис',
    editTitle: 'Редагування кошторису',
    stepClient: 'Клієнт і авто',
    stepParts: 'Деталі кузова',
    stepLabor: 'Роботи',
    stepMaterials: 'Матеріали',
    stepStages: 'Етапи',
    stepSummary: 'Підсумок',
    customerName: "Ім'я клієнта",
    customerNamePlaceholder: 'Наприклад, Олександр',
    customerPhone: 'Телефон (необовʼязково)',
    customerPhonePlaceholder: '+380...',
    vehicleType: 'Тип транспорту',
    orderDate: 'Дата замовлення',
    dueDate: 'Орієнтовна дата здачі',
    dueDateHint: 'Орієнтовний термін видачі авто клієнту (для нагадування за 2 дні)',
    vehicleMake: 'Марка авто',
    vehicleMakePlaceholder: 'Наприклад, Volkswagen',
    vehicleModel: 'Модель',
    vehicleModelPlaceholder: 'Наприклад, Passat B8',
    vehicleYear: 'Рік',
    vehicleColor: 'Код фарби / колір',
    notes: 'Примітки',
    notesPlaceholder: 'Особливості пошкоджень, перехід, терміни...',
    fullResprayTitle: 'Повне фарбування кузова',
    fullResprayDesc: 'Розрахунок повного окрасу в один клік із урахуванням типу авто',
    fullResprayActive: 'Обрано повне фарбування',
    diagramTab: 'Схема авто',
    listTab: 'Список деталей',
    searchPartsPlaceholder: 'Пошук деталі (бампер, двері, капот)...',
    selectedCount: 'Обрано деталей',
    clearSelection: 'Очистити вибір',
    selectPartHint: 'Торкніться деталей на схемі або оберіть зі списку',
    noPartsSelected: 'Спочатку оберіть хоча б одну деталь кузова на кроці «Деталі».',
    addOperation: 'Додати роботу',
    addCustomOperation: 'Своя робота',
    customOperationName: 'Назва додаткової роботи',
    customOperationPlaceholder: 'Наприклад, Плавний перехід на сусідню деталь',
    duplicateWarning: 'Така операція вже додана для цієї деталі.',
    priceOverrideHint: 'Ціна змінена лише для цього кошторису (прайс не змінюється)',
    restoreMasterPrice: 'Відновити з прайсу',
    materialsModeQuick: 'Швидкий (за шаблонами)',
    materialsModeDetailed: 'Детальний (точна витрата)',
    quickModeHint: 'Витрата матеріалів розрахована автоматично за налаштованими нормами для обраних деталей.',
    detailedModeHint: 'Оберіть матеріали з каталогу або додайте власні та вкажіть точну витрату.',
    multiplierLabel: 'Коефіцієнт витрати',
    recalculateFromTemplates: 'Перерахувати за шаблонами',
    addMaterialFromCatalog: 'З каталогу',
    addCustomMaterial: 'Свій матеріал',
    materialName: 'Назва матеріалу',
    quantity: 'Витрата',
    unit: 'Од.',
    packPrice: 'Ціна тари',
    packSize: 'Фасування',
    proportionalCost: 'Вартість витрати',
    adjustmentNone: 'Без коригування',
    adjustmentDiscount: 'Знижка',
    adjustmentMarkup: 'Націнка',
    percent: '%',
    fixedUah: '₴ фікс.',
    laborSubtotal: 'Роботи разом',
    materialsSubtotal: 'Матеріали разом',
    subtotal: 'Проміжний підсумок',
    adjustmentRow: 'Коригування',
    finalTotal: 'Разом до сплати',
    appliedRate: 'Застосований курс',
    frozenRateNotice: 'Курс зафіксовано в кошторисі — історичні розрахунки не змінюються автоматично.',
    refreshRateDraft: 'Підтягнути поточний курс',
    saveEstimate: 'Зберегти кошторис',
    savedToast: 'Кошторис збережено локально в IndexedDB',
    customerViewBtn: 'Кошторис для клієнта (PDF)',
    doubleSidedPaint: 'Двостороннє фарбування (×2)',
    doubleSidedBadge: '2 сторони',
    orderPhaseLabel: 'Етап замовлення',
    phasePreliminary: 'Попередня оцінка',
    phaseFinal: 'Фінальний підсумок',
    lockPreliminaryBtn: 'Зафіксувати попередню',
    preliminaryAmount: 'Попередня оцінка',
    finalAmount: 'Фінальний підсумок',
    phaseDifference: 'Різниця до попередньої',
    depositSection: 'Завдаток та оплата',
    depositExpected: 'Завдаток (за домовленістю), ₴',
    depositReceived: 'Отримано завдатку по факту, ₴',
    depositMarkFull: 'Отримано повністю',
    depositNotePlaceholder: 'Коментар: готівка, картка, дата...',
    depositBalanceDue: 'Залишок до сплати',
    depositQuickBtn: 'Завдаток',
  },
  history: {
    title: 'Історія кошторисів',
    searchPlaceholder: 'Пошук за клієнтом, авто або номером...',
    emptyTitle: 'Кошторисів ще немає',
    emptyDesc: 'Створіть перший розрахунок ремонту та фарбування.',
    deleteConfirmTitle: 'Видалити кошторис?',
    deleteConfirmDesc: 'Цю дію неможливо скасувати. Запис буде видалено з локальної бази.',
    partsShort: 'дет.',
    rateLabel: 'Курс',
    frozenBadge: 'Зафіксовано',
  },
  materials: {
    title: 'Каталог матеріалів',
    catalogTab: 'Матеріали',
    templatesTab: 'Норми витрати',
    addMaterial: 'Додати матеріал',
    editMaterial: 'Редагувати матеріал',
    nameLabel: 'Назва матеріалу',
    categoryLabel: 'Категорія',
    packageSizeLabel: 'Обʼєм / вага / шт. в упаковці',
    packageUnitLabel: 'Одиниця',
    packagePriceLabel: 'Ціна за упаковку',
    currencyLabel: 'Валюта ціни',
    templatePartSelect: 'Деталь кузова',
    templateHint: 'Налаштуйте стандартну витрату матеріалів на 1 деталь для «Швидкого режиму».',
    addTemplateRule: 'Додати позицію в шаблон',
    emptyTitle: 'Каталог матеріалів порожній',
    emptyDesc: 'Додайте власні фарби, лаки, ґрунти та розхідники, щоб використовувати їх у розрахунках.',
    templatesNoMaterialsHint: 'Спочатку додайте матеріали на вкладці «Матеріали», щоб налаштувати норми витрати для деталей.',
  },
  labor: {
    title: 'Прайс-лист робіт',
    subtitle: 'Базові ціни використовуються при додаванні робіт у новий кошторис. Усі ціни можна редагувати.',
    addCustomPreset: 'Додати дод. операцію',
    operationLabel: 'Назва операції',
    basePriceLabel: 'Базова ціна',
    currencyLabel: 'Валюта',
  },
  settings: {
    title: 'Налаштування',
    workshopSection: 'Майстерня',
    workshopName: 'Назва майстерні',
    workshopPhone: 'Телефон майстерні',
    workshopAddress: 'Адреса',
    workshopIdLabel: 'ID майстерні',
    appearanceSection: 'Мова та тема',
    language: 'Мова інтерфейсу',
    theme: 'Тема оформлення',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeSystem: 'Системна',
    currencySection: 'Валюта та курс USD/UAH',
    manualRateLabel: 'Ручний курс (UAH за 1 USD)',
    applyManualRate: 'Застосувати курс',
    backupSection: 'Резервне копіювання (IndexedDB)',
    exportJson: 'Експортувати JSON бекап',
    importJson: 'Імпортувати JSON бекап',
    importSuccess: 'Резервну копію успішно перевірено та відновлено.',
    importError: 'Помилка валідації файлу резервної копії.',
    resetSample: 'Відновити зразкові дані',
    resetConfirmTitle: 'Скинути дані до зразків?',
    resetConfirmDesc: 'Поточні кошториси, матеріали та прайси будуть замінені початковими зразками.',
    pwaSection: 'Додаток (PWA)',
    pwaInstalled: 'Додаток встановлено на пристрій',
  },
  customerEstimate: {
    documentTitle: 'Попередній кошторис робіт та матеріалів',
    finalDocumentTitle: 'Фінальний підсумок робіт та матеріалів',
    estimateNo: 'Кошторис №',
    date: 'Дата',
    customer: 'Замовник',
    vehicle: 'Автомобіль',
    partsTitle: 'Деталі, що підлягають ремонту / фарбуванню',
    laborTableTitle: 'Перелік робіт',
    materialsTableTitle: 'Витратні матеріали',
    colItem: 'Найменування',
    colPart: 'Деталь',
    colQty: 'К-сть',
    colCostUah: 'Сума, ₴',
    colCostUsd: 'Сума, $',
    rateFootnote: 'Розрахунок виконано у гривні (UAH) за зафіксованим курсом на момент створення кошторису:',
    preliminaryRateFootnote: 'Попередню оцінку розраховано у доларах США (USD) за курсом на момент створення кошторису:',
    thankYou: 'Дякуємо за звернення! Остаточна вартість може уточнюватися після прихованого дефектування.',
    sharePdf: 'Поділитися PDF',
    downloadPdf: 'Завантажити PDF',
    generatingPdf: 'Формування PDF...',
    pdfDownloaded: 'PDF-файл збережено на пристрій.',
    shareFallbackDownloaded: 'Прямий шеринг PDF недоступний у цьому браузері — файл завантажено, ви можете надіслати його в месенджері.',
    pdfError: 'Не вдалося сформувати PDF. Спробуйте кнопку Друк.',
    stagesSummary: 'Етапи робіт',
  },
  reminder: {
    title: 'Нагадування: орієнтовна здача замовлення',
    subtitle: 'Перевірте готовність етапів — до орієнтовної дати здачі залишилося 2 дні або менше:',
    dueToday: 'Сьогодні',
    dueTomorrow: 'Завтра',
    dueInDays: 'Через {n} дн.',
    overdueDays: 'Прострочено на {n} дн.',
    openOrder: 'Відкрити',
    dismissWork: 'Закрити і працювати далі',
    bannerText: 'Замовлень до орієнтовної здачі (≤ 2 дн.):',
    viewOrders: 'Переглянути',
  },
  cloud: {
    title: 'Хмарна синхронізація між пристроями',
    signInGoogle: 'Увійти через Google',
    signingIn: 'Вхід...',
    signOut: 'Вийти',
    syncActive: 'Хмара підключена — замовлення синхронізуються',
    syncing: 'Синхронізація...',
    syncOfflinePrompt: 'Синхронізація між пристроями',
    syncDesc: 'Увійдіть через Google, щоб створені замовлення та прайси одразу відкривалися на телефоні й інших пристроях.',
    syncError: 'Помилка синхронізації з хмарою',
    signedInAs: 'Акаунт',
    ordersStoredInCloud: 'Замовлення зберігаються у хмарі',
    localOnlyWarning: 'Зараз замовлення зберігаються тільки на цьому пристрої. Увійдіть через Google, щоб перенести й зберігати їх у хмарі.',
    localOnlySaveHint: 'Збережеться локально на пристрої. Увійдіть через Google для збереження у хмарі.',
    savedToCloudToast: 'Замовлення збережено у хмарі.',
    saveToCloudHint: 'Збереження напряму у хмарну базу',
    refreshCloud: 'Оновити з хмари',
    popupBlockedHint: 'Браузер заблокував вікно входу Google. Дозвольте спливаючі вікна для цього сайту й спробуйте знову.',
    unauthorizedDomainHint: 'Домен ({host}) не додано до списку авторизованих доменів у Firebase Console → Authentication → Settings → Authorized domains.',
  },
  partGroups: {
    all: 'Усі',
    front: 'Передня частина',
    top: 'Дах і верх',
    side_left: 'Ліва сторона',
    side_right: 'Права сторона',
    rear: 'Задня частина',
    openings: 'Прорізи, стійки та арки',
    full: 'Повне фарбування',
    selectedSummary: 'Обрані деталі',
  },
  vehicleTypes: {
    car: 'Легкова',
    van: 'Бус',
    truck: 'Фура',
  },
  stages: {
    disassembly: 'Розбирання',
    bodywork: 'Рихтування / кузовні роботи',
    prep: 'Підготовка та ґрунтування',
    painting: 'Фарбування та лакування',
    polishing: 'Полірування',
    assembly: 'Збирання та видача авто',
  },
  views: {
    top: 'Зверху',
    front: 'Спереду',
    rear: 'Ззаду',
    left: 'Зліва',
    right: 'Справа',
  },
  parts: {
    full_respray: 'Повне фарбування кузова',
    front_bumper: 'Передній бампер',
    front_grille: 'Решітка радіатора',
    hood: 'Капот (зовні)',
    hood_inner: 'Капот (внутрішня сторона)',
    roof: 'Дах',
    trunk_lid: 'Кришка багажника',
    trunk_jamb: 'Проріз багажника',
    rear_spoiler: 'Задній спойлер',
    rear_bumper: 'Задній бампер',
    left_a_pillar: 'Ліва стійка лобового скла',
    right_a_pillar: 'Права стійка лобового скла',
    left_c_pillar: 'Задня ліва стійка',
    right_c_pillar: 'Задня права стійка',
    front_left_fender: 'Переднє ліве крило',
    front_right_fender: 'Переднє праве крило',
    front_left_door: 'Передні ліві двері',
    front_right_door: 'Передні праві двері',
    rear_left_door: 'Задні ліві двері',
    rear_right_door: 'Задні праві двері',
    front_left_jamb: 'Проріз передніх лівих дверей',
    front_right_jamb: 'Проріз передніх правих дверей',
    rear_left_jamb: 'Проріз задніх лівих дверей',
    rear_right_jamb: 'Проріз задніх правих дверей',
    rear_left_quarter: 'Заднє ліве крило',
    rear_right_quarter: 'Заднє праве крило',
    front_left_arch: 'Передня ліва колісна арка',
    front_right_arch: 'Передня права колісна арка',
    rear_left_arch: 'Задня ліва колісна арка',
    rear_right_arch: 'Задня права колісна арка',
    left_mirror: 'Ліве дзеркало',
    right_mirror: 'Праве дзеркало',
    left_sill: 'Лівий поріг',
    right_sill: 'Правий поріг',
    fuel_door: 'Лючок бензобака',
    // Van parts
    van_high_roof: 'Високий дах (бус)',
    van_sliding_door_left: 'Зсувні бічні двері (ліві)',
    van_sliding_door_right: 'Зсувні бічні двері (праві)',
    van_left_upper_panel: 'Боковина кузова ліва (довга панель)',
    van_right_upper_panel: 'Боковина кузова права (довга панель)',
    van_rear_left_door: 'Задні розпашні двері (ліві)',
    van_rear_right_door: 'Задні розпашні двері (праві)',
    // Truck parts
    truck_cab_roof: 'Дах кабіни / обтічник',
    truck_visor: 'Сонцезахисний козирок кабіни',
    truck_front_panel: 'Передній щиток / облицювання кабіни',
    truck_sleeper_left: 'Спальник / боковина кабіни (ліва)',
    truck_sleeper_right: 'Спальник / боковина кабіни (права)',
    truck_side_fairing_left: 'Бічний обтічник / спойлер шасі (лівий)',
    truck_side_fairing_right: 'Бічний обтічник / спойлер шасі (правий)',
    truck_fender_left: 'Крило колеса / арка фури (ліве)',
    truck_fender_right: 'Крило колеса / арка фури (праве)',
    truck_step_left: 'Підніжка кабіни (ліва)',
    truck_step_right: 'Підніжка кабіни (права)',
    truck_rear_wall: 'Задня стінка кабіни',
  },
  operations: {
    removal: 'Зняття',
    installation: 'Встановлення',
    disassembly: 'Розбирання',
    assembly: 'Збирання',
    surface_prep: 'Підготовка поверхні',
    painting: 'Фарбування',
    dent_repair: 'Рихтування / ремонт вмʼятин',
    plastic_repair: 'Ремонт пластику / пайка',
    polishing: 'Полірування',
    custom: 'Додаткова операція',
  },
  categories: {
    basecoat: 'Базова фарба',
    clearcoat: 'Лак',
    primer: 'Ґрунт',
    filler: 'Шпаклівка',
    hardener: 'Затверджувач',
    thinner: 'Розчинник',
    sandpaper: 'Абразив / наждачка',
    masking: 'Маскування',
    other: 'Інші витратні',
  },
  units: {
    g: 'г',
    kg: 'кг',
    ml: 'мл',
    l: 'л',
    pcs: 'шт',
  },
};

const ru: TranslationDictionary = {
  appName: 'AutoPaint Calc',
  nav: {
    dashboard: 'Главная',
    newEstimate: 'Расчёт',
    history: 'История',
    materials: 'Материалы',
    labor: 'Работы',
    settings: 'Настр.',
  },
  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Изменить',
    duplicate: 'Дублировать',
    printPdf: 'Печать / PDF',
    close: 'Закрыть',
    add: 'Добавить',
    search: 'Поиск...',
    reset: 'Сбросить',
    confirm: 'Подтвердить',
    uah: 'UAH',
    usd: 'USD',
    sampleLabel: 'Образец',
    overridden: 'Изменено вручную',
    offlineBanner: 'Офлайн-режим — данные сохраняются локально',
    installApp: 'Установить приложение',
    installIosTitle: 'Установка на iPhone / iPad',
    installIosStep1: '1. Нажмите кнопку «Поделиться» (Share) на панели Safari.',
    installIosStep2: '2. Прокрутите вниз и выберите «На экран «Домой»» (Add to Home Screen).',
    noResults: 'Ничего не найдено',
  },
  dashboard: {
    title: 'AutoPaint Calc',
    subtitle: 'Оценка кузовного ремонта и покраски',
    createEstimateCta: 'Новый расчёт',
    exchangeRateTitle: 'Курс USD / UAH',
    fetchNbu: 'Обновить НБУ',
    fetchingNbu: 'Обновление...',
    manualRate: 'Вручную',
    sourceNbu: 'Официальный курс НБУ',
    sourceManual: 'Задан вручную',
    sourceCached: 'Кэшированный курс НБУ',
    updatedAt: 'Обновлено',
    nbuOfflineFallback: 'Нет связи с НБУ, использован кэш',
    totalEstimates: 'Смет',
    totalVolume: 'Сумма оценок',
    avgTicket: 'Средний чек',
    recentEstimates: 'Последние расчёты',
    viewAll: 'Все',
    quickActions: 'Справочники и сервис',
  },
  estimate: {
    newTitle: 'Новая смета',
    editTitle: 'Редактирование сметы',
    stepClient: 'Клиент и авто',
    stepParts: 'Детали кузова',
    stepLabor: 'Работы',
    stepMaterials: 'Материалы',
    stepStages: 'Этапы',
    stepSummary: 'Итог',
    customerName: 'Имя клиента',
    customerNamePlaceholder: 'Например, Александр',
    customerPhone: 'Телефон (необязательно)',
    customerPhonePlaceholder: '+380...',
    vehicleType: 'Тип транспорта',
    orderDate: 'Дата заказа',
    dueDate: 'Ориентировочная дата сдачи',
    dueDateHint: 'Ориентировочный срок выдачи авто клиенту (для напоминания за 2 дня)',
    vehicleMake: 'Марка авто',
    vehicleMakePlaceholder: 'Например, Volkswagen',
    vehicleModel: 'Модель',
    vehicleModelPlaceholder: 'Например, Passat B8',
    vehicleYear: 'Год',
    vehicleColor: 'Код краски / цвет',
    notes: 'Примечания',
    notesPlaceholder: 'Характер повреждений, переход, сроки...',
    fullResprayTitle: 'Полный окрас кузова',
    fullResprayDesc: 'Быстрый расчёт полного окраса в один клик с учётом типа авто',
    fullResprayActive: 'Выбран полный окрас',
    diagramTab: 'Схема авто',
    listTab: 'Список деталей',
    searchPartsPlaceholder: 'Поиск детали (бампер, дверь, капот)...',
    selectedCount: 'Выбрано деталей',
    clearSelection: 'Очистить выбор',
    selectPartHint: 'Коснитесь деталей на схеме или выберите из списка',
    noPartsSelected: 'Сначала выберите хотя бы одну деталь кузова на шаге «Детали».',
    addOperation: 'Добавить работу',
    addCustomOperation: 'Своя работа',
    customOperationName: 'Название дополнительной работы',
    customOperationPlaceholder: 'Например, Плавный переход на соседнюю деталь',
    duplicateWarning: 'Такая операция уже добавлена для этой детали.',
    priceOverrideHint: 'Цена изменена только для этой сметы (прайс не меняется)',
    restoreMasterPrice: 'Вернуть из прайса',
    materialsModeQuick: 'Быстрый (по шаблонам)',
    materialsModeDetailed: 'Детальный (точный расход)',
    quickModeHint: 'Расход материалов рассчитан автоматически по настроенным нормам для выбранных деталей.',
    detailedModeHint: 'Выберите материалы из каталога или добавьте свои и укажите точный расход.',
    multiplierLabel: 'Коэффициент расхода',
    recalculateFromTemplates: 'Пересчитать по шаблонам',
    addMaterialFromCatalog: 'Из каталога',
    addCustomMaterial: 'Свой материал',
    materialName: 'Название материала',
    quantity: 'Расход',
    unit: 'Ед.',
    packPrice: 'Цена тары',
    packSize: 'Фасовка',
    proportionalCost: 'Стоимость расхода',
    adjustmentNone: 'Без корректировки',
    adjustmentDiscount: 'Скидка',
    adjustmentMarkup: 'Наценка',
    percent: '%',
    fixedUah: '₴ фикс.',
    laborSubtotal: 'Работы итого',
    materialsSubtotal: 'Материалы итого',
    subtotal: 'Промежуточный итог',
    adjustmentRow: 'Корректировка',
    finalTotal: 'Итого к оплате',
    appliedRate: 'Применённый курс',
    frozenRateNotice: 'Курс зафиксирован в смете — исторические расчёты не пересчитываются автоматически.',
    refreshRateDraft: 'Подтянуть текущий курс',
    saveEstimate: 'Сохранить смету',
    savedToast: 'Смета сохранена локально в IndexedDB',
    customerViewBtn: 'Смета для клиента (PDF)',
    doubleSidedPaint: 'Двусторонняя окраска (×2)',
    doubleSidedBadge: '2 стороны',
    orderPhaseLabel: 'Этап заказа',
    phasePreliminary: 'Предварительная оценка',
    phaseFinal: 'Финальный итог',
    lockPreliminaryBtn: 'Зафиксировать предварительную',
    preliminaryAmount: 'Предварительная оценка',
    finalAmount: 'Финальный итог',
    phaseDifference: 'Разница с предварительной',
    depositSection: 'Задаток и оплата',
    depositExpected: 'Задаток (по плану), ₴',
    depositReceived: 'Получено задатка по факту, ₴',
    depositMarkFull: 'Задаток получен',
    depositNotePlaceholder: 'Комментарий: наличные, карта, дата...',
    depositBalanceDue: 'Остаток к оплате',
    depositQuickBtn: 'Задаток',
  },
  history: {
    title: 'История смет',
    searchPlaceholder: 'Поиск по клиенту, авто или номеру...',
    emptyTitle: 'Смет пока нет',
    emptyDesc: 'Создайте первый расчёт ремонта и покраски.',
    deleteConfirmTitle: 'Удалить смету?',
    deleteConfirmDesc: 'Это действие нельзя отменить. Запись будет удалена из локальной базы.',
    partsShort: 'дет.',
    rateLabel: 'Курс',
    frozenBadge: 'Зафиксирован',
  },
  materials: {
    title: 'Каталог материалов',
    catalogTab: 'Материалы',
    templatesTab: 'Нормы расхода',
    addMaterial: 'Добавить материал',
    editMaterial: 'Редактировать материал',
    nameLabel: 'Название материала',
    categoryLabel: 'Категория',
    packageSizeLabel: 'Объём / вес / шт. в упаковке',
    packageUnitLabel: 'Единица',
    packagePriceLabel: 'Цена за упаковку',
    currencyLabel: 'Валюта цены',
    templatePartSelect: 'Деталь кузова',
    templateHint: 'Настройте стандартный расход материалов на 1 деталь для «Быстрого режима».',
    addTemplateRule: 'Добавить позицию в шаблон',
    emptyTitle: 'Каталог материалов пуст',
    emptyDesc: 'Добавьте свои краски, лаки, грунты и расходники для использования в расчётах.',
    templatesNoMaterialsHint: 'Сначала добавьте материалы на вкладке «Материалы», чтобы настроить нормы расхода для деталей.',
  },
  labor: {
    title: 'Прайс-лист работ',
    subtitle: 'Базовые цены используются при добавлении работ в новую смету. Все цены можно редактировать.',
    addCustomPreset: 'Добавить доп. операцию',
    operationLabel: 'Название операции',
    basePriceLabel: 'Базовая цена',
    currencyLabel: 'Валюта',
  },
  settings: {
    title: 'Настройки',
    workshopSection: 'Мастерская',
    workshopName: 'Название мастерской',
    workshopPhone: 'Телефон мастерской',
    workshopAddress: 'Адрес',
    workshopIdLabel: 'ID мастерской',
    appearanceSection: 'Язык и тема',
    language: 'Язык интерфейса',
    theme: 'Тема оформления',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeSystem: 'Системная',
    currencySection: 'Валюта и курс USD/UAH',
    manualRateLabel: 'Ручной курс (UAH за 1 USD)',
    applyManualRate: 'Применить курс',
    backupSection: 'Резервное копирование (IndexedDB)',
    exportJson: 'Экспортировать JSON бэкап',
    importJson: 'Импортировать JSON бэкап',
    importSuccess: 'Резервная копия успешно проверена и восстановлена.',
    importError: 'Ошибка валидации файла резервной копии.',
    resetSample: 'Восстановить образцы данных',
    resetConfirmTitle: 'Сбросить данные к образцам?',
    resetConfirmDesc: 'Текущие сметы, материалы и прайсы будут заменены исходными образцами.',
    pwaSection: 'Приложение (PWA)',
    pwaInstalled: 'Приложение установлено на устройство',
  },
  customerEstimate: {
    documentTitle: 'Предварительная смета работ и материалов',
    finalDocumentTitle: 'Финальный итог работ и материалов',
    estimateNo: 'Смета №',
    date: 'Дата',
    customer: 'Заказчик',
    vehicle: 'Автомобиль',
    partsTitle: 'Детали, подлежащие ремонту / покраске',
    laborTableTitle: 'Перечень работ',
    materialsTableTitle: 'Расходные материалы',
    colItem: 'Наименование',
    colPart: 'Деталь',
    colQty: 'Кол-во',
    colCostUah: 'Сумма, ₴',
    colCostUsd: 'Сумма, $',
    rateFootnote: 'Расчёт выполнен в гривне (UAH) по зафиксированному курсу на момент создания сметы:',
    preliminaryRateFootnote: 'Предварительная оценка выполнена в долларах США (USD) по курсу на момент создания сметы:',
    thankYou: 'Спасибо за обращение! Окончательная стоимость может уточняться после скрытой дефектовки.',
    sharePdf: 'Поделиться PDF',
    downloadPdf: 'Скачать PDF',
    generatingPdf: 'Создание PDF...',
    pdfDownloaded: 'PDF-файл сохранён на устройство.',
    shareFallbackDownloaded: 'Прямая отправка файлов не поддерживается этим браузером — PDF скачан, его можно отправить вручную.',
    pdfError: 'Не удалось сформировать PDF. Воспользуйтесь кнопкой Печать.',
    stagesSummary: 'Этапы работ',
  },
  reminder: {
    title: 'Напоминание: ориентировочная сдача заказа',
    subtitle: 'Проверьте готовность этапов — до ориентировочной даты сдачи осталось 2 дня или меньше:',
    dueToday: 'Сегодня',
    dueTomorrow: 'Завтра',
    dueInDays: 'Через {n} дн.',
    overdueDays: 'Просрочено на {n} дн.',
    openOrder: 'Открыть',
    dismissWork: 'Закрыть и работать дальше',
    bannerText: 'Заказов до ориентировочной сдачи (≤ 2 дн.):',
    viewOrders: 'Посмотреть',
  },
  cloud: {
    title: 'Облачная синхронизация между устройствами',
    signInGoogle: 'Войти через Google',
    signingIn: 'Вход...',
    signOut: 'Выйти',
    syncActive: 'Облако подключено — заказы синхронизируются',
    syncing: 'Синхронизация...',
    syncOfflinePrompt: 'Синхронизация между устройствами',
    syncDesc: 'Войдите через Google, чтобы созданные заказы и прайсы сразу были видны после обновления и на других устройствах.',
    syncError: 'Ошибка синхронизации с облаком',
    signedInAs: 'Аккаунт',
    ordersStoredInCloud: 'Заказы хранятся в облаке',
    localOnlyWarning: 'Сейчас заказы сохраняются только на этом устройстве. Войдите через Google, чтобы хранить их в облаке.',
    localOnlySaveHint: 'Сохранится локально на устройстве. Войдите через Google для сохранения в облаке.',
    savedToCloudToast: 'Заказ сохранён в облаке.',
    saveToCloudHint: 'Сохранение напрямую в облачную базу',
    refreshCloud: 'Обновить из облака',
    popupBlockedHint: 'Браузер заблокировал окно входа Google. Разрешите всплывающие окна и попробуйте ещё раз.',
    unauthorizedDomainHint: 'Домен ({host}) не добавлен в Firebase Console → Authentication → Settings → Authorized domains.',
  },
  partGroups: {
    all: 'Все',
    front: 'Передняя часть',
    top: 'Крыша и верх',
    side_left: 'Левая сторона',
    side_right: 'Правая сторона',
    rear: 'Задняя часть',
    openings: 'Проёмы, стойки и арки',
    full: 'Полный окрас',
    selectedSummary: 'Выбранные детали',
  },
  vehicleTypes: {
    car: 'Легковая',
    van: 'Бус',
    truck: 'Фура',
  },
  stages: {
    disassembly: 'Разборка',
    bodywork: 'Рихтовка / кузовные работы',
    prep: 'Подготовка и грунтование',
    painting: 'Покраска и лакирование',
    polishing: 'Полировка',
    assembly: 'Сборка и выдача авто',
  },
  views: {
    top: 'Сверху',
    front: 'Спереди',
    rear: 'Сзади',
    left: 'Слева',
    right: 'Справа',
  },
  parts: {
    full_respray: 'Полный окрас кузова',
    front_bumper: 'Передний бампер',
    front_grille: 'Решётка радиатора',
    hood: 'Капот (снаружи)',
    hood_inner: 'Капот (внутренняя сторона)',
    roof: 'Крыша',
    trunk_lid: 'Крышка багажника',
    trunk_jamb: 'Проём багажника',
    rear_spoiler: 'Задний спойлер',
    rear_bumper: 'Задний бампер',
    left_a_pillar: 'Левая стойка лобового стекла',
    right_a_pillar: 'Правая стойка лобового стекла',
    left_c_pillar: 'Задняя левая стойка',
    right_c_pillar: 'Задняя правая стойка',
    front_left_fender: 'Переднее левое крыло',
    front_right_fender: 'Переднее правое крыло',
    front_left_door: 'Передняя левая дверь',
    front_right_door: 'Передняя правая дверь',
    rear_left_door: 'Задняя левая дверь',
    rear_right_door: 'Задняя правая дверь',
    front_left_jamb: 'Проём передней левой двери',
    front_right_jamb: 'Проём передней правой двери',
    rear_left_jamb: 'Проём задней левой двери',
    rear_right_jamb: 'Проём задней правой двери',
    rear_left_quarter: 'Заднее левое крыло',
    rear_right_quarter: 'Заднее правое крыло',
    front_left_arch: 'Передняя левая колёсная арка',
    front_right_arch: 'Передняя правая колёсная арка',
    rear_left_arch: 'Задняя левая колёсная арка',
    rear_right_arch: 'Задняя правая колёсная арка',
    left_mirror: 'Левое зеркало',
    right_mirror: 'Правое зеркало',
    left_sill: 'Левый порог',
    right_sill: 'Правый порог',
    fuel_door: 'Лючок бензобака',
    // Van parts
    van_high_roof: 'Высокая крыша (бус)',
    van_sliding_door_left: 'Сдвижная боковая дверь (левая)',
    van_sliding_door_right: 'Сдвижная боковая дверь (правая)',
    van_left_upper_panel: 'Боковина кузова левая (длинная панель)',
    van_right_upper_panel: 'Боковина кузова правая (длинная панель)',
    van_rear_left_door: 'Задняя распашная дверь (левая)',
    van_rear_right_door: 'Задняя распашная дверь (правая)',
    // Truck parts
    truck_cab_roof: 'Крыша кабины / обтекатель',
    truck_visor: 'Солнцезащитный козырёк кабины',
    truck_front_panel: 'Передний щиток / облицовка кабины',
    truck_sleeper_left: 'Спальник / боковина кабины (левая)',
    truck_sleeper_right: 'Спальник / боковина кабины (правая)',
    truck_side_fairing_left: 'Боковой обтекатель / юбка шасси (левый)',
    truck_side_fairing_right: 'Боковой обтекатель / юбка шасси (правый)',
    truck_fender_left: 'Крыло колеса / арка фуры (левое)',
    truck_fender_right: 'Крыло колеса / арка фуры (правое)',
    truck_step_left: 'Подножка кабины (левая)',
    truck_step_right: 'Подножка кабины (правая)',
    truck_rear_wall: 'Задняя стенка кабины',
  },
  operations: {
    removal: 'Снятие',
    installation: 'Установка',
    disassembly: 'Разборка',
    assembly: 'Сборка',
    surface_prep: 'Подготовка поверхности',
    painting: 'Покраска',
    dent_repair: 'Рихтовка / ремонт вмятин',
    plastic_repair: 'Ремонт пластика / пайка',
    polishing: 'Полировка',
    custom: 'Дополнительная операция',
  },
  categories: {
    basecoat: 'Базовая эмаль',
    clearcoat: 'Лак',
    primer: 'Грунт',
    filler: 'Шпаклёвка',
    hardener: 'Отвердитель',
    thinner: 'Растворитель',
    sandpaper: 'Абразив / наждачка',
    masking: 'Маскировка',
    other: 'Прочие расходники',
  },
  units: {
    g: 'г',
    kg: 'кг',
    ml: 'мл',
    l: 'л',
    pcs: 'шт',
  },
};

export function getTranslations(locale: LocaleCode): TranslationDictionary {
  return locale === 'ru' ? ru : uk;
}
