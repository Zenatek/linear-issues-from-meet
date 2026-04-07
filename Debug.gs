function testFullFlow() {
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar().getEvents(eightHoursAgo, now);

  let memberMap = {};
  for (const event of events) {
    const guests = event.getGuestList().map(g => g.getEmail().toLowerCase());
    if (!guests.includes(TRIGGER_EMAIL.toLowerCase())) continue;
    memberMap = buildMemberMap(event.getGuestList());
    console.log("👥 Member map:", JSON.stringify(memberMap, null, 2));
    break;
  }

  const today = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy/MM/dd");
  const files = DriveApp.searchFiles('title contains "Gemini"');

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    if (name.includes(today)) {
      const url = "https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=text/plain";
      const transcript = UrlFetchApp.fetch(url, {
        headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() }
      }).getContentText();

      console.log("✅ Trascription found:", name);

      const items = extractActionItems(transcript, memberMap);
      console.log("📋 Exctract items :", JSON.stringify(items, null, 2));

      sendApprovalEmail(items, MANAGER_EMAIL, name);
      console.log("📧 Sent email to:", MANAGER_EMAIL);
      return;
    }
  }

  console.log("❌ No notes found today");
}

function testBuildMemberMap() {
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar().getEvents(eightHoursAgo, now);

  for (const event of events) {
    const guests = event.getGuestList().map(g => g.getEmail().toLowerCase());
    if (!guests.includes(TRIGGER_EMAIL.toLowerCase())) continue;

    console.log("✅ Event found:", event.getTitle());
    const map = buildMemberMap(event.getGuestList());
    console.log("👥 Member map:", JSON.stringify(map, null, 2));
  }
}
