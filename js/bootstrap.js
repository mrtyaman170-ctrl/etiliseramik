(function () {
  function escapeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  window.__etiliStarted = false;
  window.addEventListener("error", function (event) {
    var app = document.getElementById("app");
    if (!app || window.__etiliStarted) return;
    app.innerHTML =
      '<div style="max-width:680px;margin:40px auto;padding:22px;font-family:Arial,sans-serif;background:#fff;border:1px solid #ddd;border-radius:16px">' +
      '<h2 style="margin-top:0">ETİLİSMART başlatılamadı</h2>' +
      '<p>Hata: ' + escapeText(event.message || "Bilinmeyen hata") + '</p>' +
      '<button onclick="localStorage.clear();sessionStorage.clear();location.reload()" style="border:0;border-radius:10px;padding:12px 16px;background:#f2b21a;font-weight:700">Kayıtları Temizle ve Yenile</button>' +
      '</div>';
  });
  setTimeout(function () {
    if (window.__etiliStarted) return;
    var app = document.getElementById("app");
    if (app && app.textContent.indexOf("yükleniyor") !== -1) {
      app.innerHTML =
        '<div style="max-width:680px;margin:40px auto;padding:22px;font-family:Arial,sans-serif;background:#fff;border:1px solid #ddd;border-radius:16px">' +
        '<h2 style="margin-top:0">ETİLİSMART yükleme süresi aşıldı</h2>' +
        '<p>Tarayıcı eski dosyayı veya eski kayıtları kullanıyor olabilir.</p>' +
        '<button onclick="localStorage.clear();sessionStorage.clear();location.reload()" style="border:0;border-radius:10px;padding:12px 16px;background:#f2b21a;font-weight:700">Temizle ve Yeniden Başlat</button>' +
        '</div>';
    }
  }, 2500);
})();
