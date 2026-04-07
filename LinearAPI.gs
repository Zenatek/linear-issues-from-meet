const LINEAR_API = "https://api.linear.app/graphql";

function createLinearIssue(item, teamId) {
  const resolvedTeamId = teamId || PropertiesService.getScriptProperties().getProperty("TEAM_ID");
  const priorityMap = { urgent: 1, high: 2, medium: 3, low: 4 };
  const mutation = "mutation CreateIssue($input: IssueCreateInput!) {" +
    "issueCreate(input: $input) { success issue { id title url } } }";

  const variables = {
    input: {
      teamId: resolvedTeamId,
      title: item.title,
      description: item.description,
      priority: priorityMap[item.priority] || 3,
      ...(item.assigneeId && { assigneeId: item.assigneeId }),
      ...(item.dueDate && { dueDate: item.dueDate })
    }
  };

  const response = UrlFetchApp.fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Authorization": LINEAR_API_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({ query: mutation, variables: variables })
  });

  const data = JSON.parse(response.getContentText());
  return data.data.issueCreate.issue;
}

function doGet(e) {
  const action = e.parameter.action;
  const token  = e.parameter.token;
  const cache  = CacheService.getScriptCache();
  const raw    = cache.get(token);

  if (!raw) return HtmlService.createHtmlOutput("Token scaduto o non valido.");

  if (action === "approve_one") {
    const item  = JSON.parse(raw);
    const issue = createLinearIssue(item, TEAM_ID);
    cache.remove(token);
    return HtmlService.createHtmlOutput(
      "Issue creata: <a href='" + issue.url + "'>" + issue.title + "</a>"
    );
  }

  if (action === "approve_all") {
    const items = JSON.parse(raw);
    items.forEach(function(item) { createLinearIssue(item, TEAM_ID); });
    cache.remove(token);
    return HtmlService.createHtmlOutput("Tutte le issue sono state create in Linear.");
  }

  if (action === "reject") {
    cache.remove(token);
    return HtmlService.createHtmlOutput("Operazione annullata. Nessuna issue creata.");
  }
}
