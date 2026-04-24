/**
 * CARD-MC-19: 深層知能パネル拡張（五十音ヒートマップ · KHS 10軸 · 24h 発火ゲージ）
 * index.html の loadIntelligencePanel 成功後に __renderMcIntelligenceAugment(d) を呼ぶ。
 */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmtPct(x) {
    if (x == null || !isFinite(x)) return "—";
    return (x * 100).toFixed(0) + "%";
  }

  window.__renderMcIntelligenceAugment = function (d) {
    var root = document.getElementById("intel-augment-root");
    if (!root || !d) return;
    var sum = d.summary || {};
    var fifty = d.fifty_sounds || {};
    var khs = d.khs_10_axes || {};
    var fire = d.fire_24h || {};
    var axes = Array.isArray(khs.khs_10_axes) ? khs.khs_10_axes : [];
    var per = Array.isArray(fifty.per_sound) ? fifty.per_sound : [];
    var denom =
      fire.slots_denominator != null && Number(fire.slots_denominator) > 0 ? Number(fire.slots_denominator) : 11;
    var slotRatio =
      fire.slots_ever_fired != null && typeof fire.slots_ever_fired === "number"
        ? fire.slots_ever_fired / denom
        : 0;
    var avgFill = fire.avg_fire_ratio != null ? Number(fire.avg_fire_ratio) : 0;

    var hm = per
      .map(function (r) {
        var ok = r.has_entry ? "hm-on" : "hm-off";
        var t = r.sound + (r.has_meaning ? "·義" : "") + (r.has_water_fire ? "·水火力" : "");
        return '<span class="' + ok + '" title="' + esc(t) + '">' + esc(r.sound) + "</span>";
      })
      .join("");

    var axHtml =
      axes.length === 0
        ? '<div class="c-sub">khs_10_axes なし</div>'
        : axes
            .map(function (a) {
              var w = a.wired_chat_declared ? "khs-w" : "khs-n";
              return (
                '<div class="khs-row ' +
                w +
                '"><span>' +
                esc(a.label_ja || a.id) +
                '</span><span class="c-mute">' +
                esc(String(a.via || "—")).slice(0, 48) +
                "</span></div>"
              );
            })
            .join("");

    root.innerHTML =
      '<div class="card" style="margin-bottom:14px">' +
      '<header><span class="title">五十音 INDEX（実測）</span><span class="tag">coverage ' +
      fmtPct(Number(fifty.coverage_ratio)) +
      "</span></header>" +
      '<div class="hm-grid">' +
      hm +
      "</div>" +
      '<div class="note" style="margin-top:8px">緑=entry あり · 灰=欠番 · wired_to_chat: ' +
      esc(String(fifty.wired_to_chat)) +
      "</div></div>" +
      '<div class="card" style="margin-bottom:14px">' +
      '<header><span class="title">KHS 10 軸（宣言）</span><span class="tag">wired 率 ' +
      fmtPct(Number(khs.khs_10_axes_wired_ratio)) +
      "</span></header>" +
      axHtml +
      "</div>" +
      '<div class="card">' +
      '<header><span class="title">24h soul-root 発火</span><span class="tag">jsonl</span></header>' +
      '<div class="body">slots 一度でも発火: <strong>' +
      esc(String(fire.slots_ever_fired)) +
      "</strong>/" +
      denom +
      " · 平均スロット充填: <strong>" +
      fmtPct(avgFill) +
      "</strong></div>" +
      '<div class="bar-row" style="margin-top:10px"><span class="c-mute" style="min-width:120px">slot coverage</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' +
      Math.min(100, Math.round(slotRatio * 100)) +
      '%"></div></div>' +
      '<span style="min-width:48px;text-align:right">' +
      fmtPct(slotRatio) +
      "</span></div>" +
      '<div class="note" style="margin-top:8px">' +
      esc(String(fire.note || "")) +
      "</div></div>";
  };
})();
