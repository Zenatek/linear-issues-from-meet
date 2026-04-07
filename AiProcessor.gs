function extractActionItems(transcript, memberMap) {
  const memberList = Object.keys(memberMap).length
    ? "Participants with their Linear IDs:\n" + Object.entries(memberMap).map(function(e) { return "- " + e[0] + " → " + e[1]; }).join("\n") + "\n\n"
    : "";

  const prompt = "Analizza questa trascrizione e restituisci un array JSON.\n" +
    "Per ogni action item includi:\n" +
    "- title: titolo breve (max 60 char)\n" +
    "- description: descrizione dettagliata\n" +
    "- assignee: nome responsabile (se menzionato)\n" +
    "- assigneeId: Linear user ID del responsabile (usa la lista sotto, null se non trovato)\n" +
    "- priority: urgent | high | medium | low\n" +
    "- dueDate: data ISO (se menzionata)\n\n" +
    memberList +
    "Rispondi SOLO con il JSON.\n\nTrascrizione:\n" + transcript;

  const response = UrlFetchApp.fetch(
    "https://router.requesty.ai/v1/chat/completions",
    {
      method: "POST",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + REQUESTY_API_KEY },
      payload: JSON.stringify({
        model: REQUESTY_MODEL,
        messages: [{ role: "user", content: prompt }]
      })
    }
  );

  const json = JSON.parse(response.getContentText());
  const raw = json.choices[0].message.content;
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function processTranscript(transcript, meetTitle) {
  const items = extractActionItems(transcript);
  sendApprovalEmail(items, MANAGER_EMAIL, meetTitle);
}
