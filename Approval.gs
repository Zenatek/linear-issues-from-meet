function sendApprovalEmail(items, managerEmail, meetTitle) {
  const baseUrl = ScriptApp.getService().getUrl();

  const itemTokens = items.map((item) => {
    const token = Utilities.getUuid();
    CacheService.getScriptCache().put(token, JSON.stringify(item), 3600);
    return { token, item };
  });

  const allToken = Utilities.getUuid();
  CacheService.getScriptCache().put(allToken, JSON.stringify(items), 3600);

  const rows = itemTokens.map(function(t) {
    const approveUrl = baseUrl + "?action=approve_one&token=" + t.token;
    return "<tr style='border-bottom:1px solid #e5e7eb'>" +
      "<td style='padding:12px 8px'><strong>" + t.item.title + "</strong><br>" +
      "<span style='color:#6b7280;font-size:12px'>" + (t.item.description || "") + "</span></td>" +
      "<td style='padding:12px 8px'>" + (t.item.assignee || "—") + "</td>" +
      "<td style='padding:12px 8px'>" + t.item.priority + "</td>" +
      "<td style='padding:12px 8px'>" +
      "<a href='" + approveUrl + "' style='background:#22c55e;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px'>Approva</a>" +
      "</td></tr>";
  }).join("");

  const approveAllUrl = baseUrl + "?action=approve_all&token=" + allToken;
  const rejectAllUrl  = baseUrl + "?action=reject&token=" + allToken;

  const html = "<div style='font-family:sans-serif;max-width:700px'>" +
    "<h2>Review task da: " + meetTitle + "</h2>" +
    "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>" +
    "<thead><tr style='background:#f9fafb'>" +
    "<th style='padding:10px 8px;text-align:left'>Issue</th>" +
    "<th style='padding:10px 8px;text-align:left'>Responsabile</th>" +
    "<th style='padding:10px 8px;text-align:left'>Priorita</th>" +
    "<th style='padding:10px 8px;text-align:left'>Azione</th>" +
    "</tr></thead><tbody>" + rows + "</tbody></table>" +
    "<a href='" + approveAllUrl + "' style='background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:12px'>Approva tutte</a>" +
    "<a href='" + rejectAllUrl + "' style='background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none'>Annulla tutto</a>" +
    "</div>";

  GmailApp.sendEmail(managerEmail, "[Review] Task da " + meetTitle, "", { htmlBody: html });
}
