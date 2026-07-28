/*
  ETİLİSMART genel yapılandırması

  Güvenlik:
  - Telegram bot tokenını bu dosyaya yazmayın.
  - Bot tokenı yalnızca telegram-worker tarafında secret olarak tutulmalıdır.
  - Worker kurulduktan sonra HTTPS adresini workerUrl alanına yazabilirsiniz.
*/
window.ETILISMART_CONFIG = Object.freeze({
  version: "1.5.0",
  releaseName: "Telegram Bildirimleri",
  telegram: Object.freeze({
    enabled: true,
    botUsername: "EtiliSmartBakimBot",
    workerUrl: "",
    appUrl: "https://mrtyaman170-ctrl.github.io/etiliseramik/",
  }),
});
