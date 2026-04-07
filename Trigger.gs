function setupTrigger() {
  ScriptApp.newTrigger("onCalendarEventEnd")
    .timeBased().everyMinutes(5).create();
}

function onCalendarEventEnd() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar().getEvents(fiveMinAgo, now);

  for (const event of events) {
    // Filtra solo per presenza di TRIGGER_EMAIL tra i partecipanti

    const guests = event.getGuestList().map(g => g.getEmail().toLowerCase());
    if (!guests.includes(TRIGGER_EMAIL.toLowerCase())) continue;

    const endTime = event.getEndTime();
    if (endTime < fiveMinAgo || endTime > now) continue;

    const props = PropertiesService.getScriptProperties();
    if (props.getProperty("processed_" + event.getId())) continue;
    props.setProperty("processed_" + event.getId(), "true");

      // Costruisce mappa nome → Linear user ID dai partecipanti
      const memberMap = buildMemberMap(event.getGuestList());
      scheduleTranscriptSearch(event.getTitle(), event.getId(), 0, memberMap);
  }
}

function buildMemberMap(guestList) {
  const map = {};
  const query = "{ users { nodes { id name email } } }";
  const res = UrlFetchApp.fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Authorization": PropertiesService.getScriptProperties().getProperty("LINEAR_API_KEY"),
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({ query: query })
  });
  const linearUsers = JSON.parse(res.getContentText()).data.users.nodes;
  const guestEmails = guestList.map(g => g.getEmail().toLowerCase());

  linearUsers.forEach(function(u) {
    if (guestEmails.includes(u.email.toLowerCase())) {
      // Indicizza per nome completo, per nome di battesimo e per email
      map[u.name.toLowerCase()] = u.id;
      map[u.name.split(" ")[0].toLowerCase()] = u.id;
      map[u.email.toLowerCase()] = u.id;
    }
  });
  return map;
}

function scheduleTranscriptSearch(meetTitle, eventId, attempt, memberMap) {
  if (attempt >= 3) return;
  const delayMs = attempt === 0 ? 10 * 60 * 1000 : 5 * 60 * 1000;
  const props = PropertiesService.getScriptProperties();
  props.setProperty("pending_title", meetTitle);
  props.setProperty("pending_eventId", eventId);
  props.setProperty("pending_attempt", String(attempt));
  props.setProperty("pending_memberMap", JSON.stringify(memberMap || {}));
  ScriptApp.newTrigger("retryTranscriptSearch").timeBased().after(delayMs).create();
}

function retryTranscriptSearch() {
  const props = PropertiesService.getScriptProperties();
  const meetTitle  = props.getProperty("pending_title");
  const eventId    = props.getProperty("pending_eventId");
  const attempt    = parseInt(props.getProperty("pending_attempt") || "0");
  const memberMap  = JSON.parse(props.getProperty("pending_memberMap") || "{}");

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "retryTranscriptSearch")
    .forEach(t => ScriptApp.deleteTrigger(t));

  const transcript = findTranscript(meetTitle);
  if (transcript) {
    processTranscript(transcript, meetTitle, memberMap);
  } else {
    scheduleTranscriptSearch(meetTitle, eventId, attempt + 1, memberMap);
  }
}

function findTranscript(meetTitle) {
  const today = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy/MM/dd");
  const files = DriveApp.searchFiles('title contains "Gemini"');
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.includes(today) && name.toLowerCase().includes(meetTitle.toLowerCase())) {
      const url = "https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=text/plain";
      const res = UrlFetchApp.fetch(url, {
        headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() }
      });
      return res.getContentText();
    }
  }
  return null;
}
