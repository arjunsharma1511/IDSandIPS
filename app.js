"use strict";

const STORAGE_KEY = "sentinelJunctionIdsIpsV1";
const TOTAL_ACTIVITIES = 32;
const defaultState = { completed: [] };
let state = loadState();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.completed) ? saved : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isComplete(id) {
  return state.completed.includes(id);
}

function completeActivity(id, quiet = false) {
  if (!isComplete(id)) {
    state.completed.push(id);
    saveState();
    updateProgress();
    if (!quiet) showToast("Activity complete. Progress saved in this browser.");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function setFeedback(element, message, good) {
  element.textContent = message;
  element.className = `feedback ${good ? "good" : "bad"}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function updateProgress() {
  const count = Math.min(state.completed.length, TOTAL_ACTIVITIES);
  $("#progressLabel").textContent = `${count} / ${TOTAL_ACTIVITIES} activities`;
  $("#progressBar").value = count;
  $("#progressBar").textContent = `${count} of ${TOTAL_ACTIVITIES}`;
  $("#lockProgress").textContent = `${count} / ${TOTAL_ACTIVITIES}`;

  for (let index = 1; index <= 6; index += 1) {
    const card = $(`[data-activity-card="foundation-${index}"]`);
    if (card) card.classList.toggle("completed", isComplete(`foundation-${index}`));
  }

  const resolvedAlerts = Array.from({ length: 16 }, (_, index) => `alert-${index + 1}`).filter(isComplete).length;
  $("#queueProgress").textContent = `${resolvedAlerts} / 16 resolved`;

  const unlocked = count === TOTAL_ACTIVITIES;
  $("#certificateLock").classList.toggle("unlocked", unlocked);
  $("#certificateMaker").classList.toggle("show", unlocked);
  $(".lock-icon").textContent = unlocked ? "UNLOCKED" : "LOCKED";
  if (unlocked) {
    $("#certificateLock h2").textContent = "Certificate unlocked - excellent analyst work";
    $("#certificateLock p").textContent = "You completed every briefing, alert, tuning review and final-shift decision.";
  }
}

// Reveal sections gently as the learner moves through the page.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.08 });
$$('.reveal').forEach(element => revealObserver.observe(element));

// Shared quiz helpers.
function renderQuiz(target, questions) {
  $(target).innerHTML = questions.map((question, index) => `
    <div class="question-row">
      <label for="${target.slice(1)}-${index}">${index + 1}. ${escapeHTML(question.question)}</label>
      <select id="${target.slice(1)}-${index}" data-question="${index}">
        <option value="">Choose an answer</option>
        ${question.options.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}
      </select>
    </div>`).join("");
}

function checkQuiz(target, questions, feedbackTarget, activityId, successMessage) {
  const selects = $$(`${target} select`);
  if (selects.some(select => select.value === "")) {
    setFeedback($(feedbackTarget), "Please answer every row before checking.", false);
    return;
  }
  const score = questions.filter((question, index) => Number(selects[index].value) === question.answer).length;
  if (score === questions.length) {
    setFeedback($(feedbackTarget), `${score}/${questions.length} correct. ${successMessage}`, true);
    completeActivity(activityId);
  } else {
    setFeedback($(feedbackTarget), `${score}/${questions.length} correct. Re-read the nearby explanation and try again; there is no penalty.`, false);
  }
}

const foundationQuestions = [
  { question: "Which control normally receives a copy of network traffic?", options: ["IPS", "IDS", "Router"], answer: 1 },
  { question: "Which control normally sits inline and may drop a packet?", options: ["IDS", "Log archive", "IPS"], answer: 2 },
  { question: "What does an alert prove by itself?", options: ["Only that detection logic matched", "That an attacker succeeded", "That the device must be erased"], answer: 0 },
  { question: "Why does an IPS rule need careful testing?", options: ["It cannot record evidence", "A wrong block can interrupt legitimate traffic", "It changes every IP address"], answer: 1 }
];

const placementQuestions = [
  { question: "A switch mirror sends a sensor a copy. Which control is described?", options: ["IDS", "IPS"], answer: 0 },
  { question: "Every packet must pass through the control. Which control is described?", options: ["IDS", "IPS"], answer: 1 },
  { question: "The console says ALERTED but not BLOCKED. Which role best fits?", options: ["IDS", "IPS"], answer: 0 },
  { question: "The event action is DROP. Which control performed prevention?", options: ["IDS", "IPS"], answer: 1 }
];

const methodQuestions = [
  { question: "A byte pattern matches a known test file.", options: ["Behaviour", "Signature", "Policy"], answer: 1 },
  { question: "One workstation contacts 80 ports in 20 seconds.", options: ["Policy", "Signature", "Behaviour"], answer: 2 },
  { question: "Inbound RDP from the internet is forbidden by company rules.", options: ["Policy", "Behaviour", "Signature"], answer: 0 }
];

const fieldQuestions = [
  { question: "Did the system alert or block?", options: ["Action", "Source", "Time"], answer: 0 },
  { question: "Where did the connection begin?", options: ["Destination", "Rule", "Source"], answer: 2 },
  { question: "What detection logic matched?", options: ["Protocol", "Rule", "Time"], answer: 1 },
  { question: "Which service path was targeted?", options: ["Protocol and port", "Severity colour", "Analyst name"], answer: 0 }
];

const outcomeQuestions = [
  { question: "Real threat and an alert fires.", options: ["False positive", "True positive", "False negative"], answer: 1 },
  { question: "Harmless approved activity and an alert fires.", options: ["False positive", "True negative", "True positive"], answer: 0 },
  { question: "Real threat but no alert fires.", options: ["True positive", "True negative", "False negative"], answer: 2 },
  { question: "Normal activity and no alert fires.", options: ["True negative", "False negative", "False positive"], answer: 0 }
];

renderQuiz("#foundationQuiz", foundationQuestions);
renderQuiz("#placementQuiz", placementQuestions);
renderQuiz("#methodQuiz", methodQuestions);
renderQuiz("#fieldQuiz", fieldQuestions);
renderQuiz("#outcomeQuiz", outcomeQuestions);

$("#checkFoundation").addEventListener("click", () => checkQuiz("#foundationQuiz", foundationQuestions, "#foundationFeedback", "foundation-1", "You understand the core IDS and IPS difference."));
$("#checkPlacement").addEventListener("click", () => checkQuiz("#placementQuiz", placementQuestions, "#placementFeedback", "foundation-2", "You can recognise passive and inline placement."));
$("#checkMethods").addEventListener("click", () => checkQuiz("#methodQuiz", methodQuestions, "#methodFeedback", "foundation-3", "You can distinguish three basic detection approaches."));
$("#checkFields").addEventListener("click", () => checkQuiz("#fieldQuiz", fieldQuestions, "#fieldFeedback", "foundation-4", "You can read the essential alert fields."));
$("#checkOutcomes").addEventListener("click", () => checkQuiz("#outcomeQuiz", outcomeQuestions, "#outcomeFeedback", "foundation-5", "You can describe detection quality accurately."));

$$('[data-hint]').forEach(button => {
  button.addEventListener("click", () => {
    const hint = document.getElementById(button.dataset.hint);
    hint.classList.toggle("show");
    button.textContent = hint.classList.contains("show") ? "Hide hint" : "Show a hint";
  });
});

// Guided workflow sequencing.
const workflow = [
  "Confirm alert source and rule",
  "Gather relevant context",
  "Compare with expected activity",
  "Assess impact and confidence",
  "Record the decision and escalate if needed"
];
const shuffledWorkflow = [workflow[2], workflow[0], workflow[4], workflow[1], workflow[3]];
let workflowPosition = 0;

function renderWorkflow() {
  $("#workflowSteps").innerHTML = shuffledWorkflow.map(step => `<button type="button" data-step="${escapeHTML(step)}">${escapeHTML(step)}</button>`).join("");
  workflowPosition = 0;
  setFeedback($("#workflowFeedback"), "Begin with the step that confirms what created the alert.", true);
  $$("#workflowSteps button").forEach(button => button.addEventListener("click", () => {
    if (button.classList.contains("selected")) return;
    if (button.dataset.step === workflow[workflowPosition]) {
      button.classList.add("selected");
      button.textContent = `${workflowPosition + 1}. ${button.dataset.step}`;
      workflowPosition += 1;
      setFeedback($("#workflowFeedback"), `${workflowPosition}/5 steps placed correctly.`, true);
      if (workflowPosition === workflow.length) {
        setFeedback($("#workflowFeedback"), "Correct. This repeatable order keeps the investigation evidence-led.", true);
        completeActivity("foundation-6");
      }
    } else {
      button.classList.add("wrong");
      setTimeout(() => button.classList.remove("wrong"), 350);
      setFeedback($("#workflowFeedback"), `Not yet. The next step is number ${workflowPosition + 1}; think about what the analyst needs before judging impact.`, false);
    }
  }));
}
renderWorkflow();
$("#resetWorkflow").addEventListener("click", renderWorkflow);

// Interactive traffic placement animation.
function replayPath() {
  const primary = $(".primary-packet");
  const copy = $(".copy-packet");
  primary.classList.remove("animate");
  copy.classList.remove("animate");
  void primary.offsetWidth;
  primary.classList.add("animate");
  copy.classList.add("animate");
}

function setPathMode(mode) {
  $("#pathStage").dataset.mode = mode;
  $$('[data-path-mode]').forEach(button => button.classList.toggle("active", button.dataset.pathMode === mode));
  const isIds = mode === "ids";
  $("#pathControlLabel").textContent = isIds ? "IDS" : "IPS";
  $("#pathControlTitle").textContent = isIds ? "Passive sensor" : "Inline control";
  $("#pathControlDetail").textContent = isIds ? "Receives a traffic copy" : "Every packet passes through";
  $("#pathDecision").innerHTML = isIds
    ? "<b>IDS result</b><span>Traffic continues; an alert may be created.</span>"
    : "<b>IPS result</b><span>Traffic is allowed or dropped according to policy.</span>";
  $("#pathExplanation").innerHTML = isIds
    ? "<b>IDS placement:</b> the sensor is normally outside the direct packet path. It observes a copy, so an IDS alert does not mean the original connection was blocked."
    : "<b>IPS placement:</b> the control is directly in the packet path. It may permit or prevent the connection, so rule quality and availability both matter.";
  replayPath();
}
$$('[data-path-mode]').forEach(button => button.addEventListener("click", () => setPathMode(button.dataset.pathMode)));
$("#replayPath").addEventListener("click", replayPath);
replayPath();

// Animated dashboard and harmless synthetic traffic stream.
const chartHeights = [54, 68, 44, 81, 63, 73, 48, 88, 71, 58, 77, 66];
$("#trafficBars").innerHTML = chartHeights.map((height, index) => `<i class="bar" style="--height:${height}%;--alert:${index % 4 === 0 ? 15 : 6}%"></i>`).join("");

const trafficEvents = [
  { source: "10.20.5.41", destination: "198.51.100.18", service: "TCP/443", ids: "no match", ips: "ALLOWED", className: "allowed", headline: "Normal HTTPS traffic observed", explanation: "The IPS allows the connection. The IDS can still inspect a mirrored copy for detection patterns.", reason: "No rule matched" },
  { source: "10.20.5.53", destination: "10.20.5.10", service: "UDP/53", ids: "observed", ips: "ALLOWED", className: "allowed", headline: "Internal DNS query observed", explanation: "A workstation asks the approved DNS server for a name. The traffic is expected and remains visible to monitoring.", reason: "Approved DNS path" },
  { source: "203.0.113.44", destination: "10.20.5.20", service: "TCP/3389", ids: "policy alert", ips: "BLOCKED", className: "blocked", headline: "Inbound RDP attempt blocked", explanation: "The IDS records the policy match while the inline IPS drops the forbidden inbound connection.", reason: "Inbound RDP policy" },
  { source: "10.20.5.15", destination: "10.20.5.24", service: "TCP/445", ids: "rate alert", ips: "ALLOWED", className: "alerted", headline: "High connection rate alerted", explanation: "The IDS reports a rate pattern. Context is still needed because the source may be an approved scanner or backup server.", reason: "Connection threshold" },
  { source: "10.20.5.88", destination: "203.0.113.90", service: "TCP/443", ids: "IOC match", ips: "BLOCKED", className: "blocked", headline: "High-confidence destination blocked", explanation: "The destination matches the training block list. The analyst must still correlate endpoint and user evidence.", reason: "Threat-intel rule" },
  { source: "10.20.5.70", destination: "10.20.5.10", service: "UDP/53", ids: "volume alert", ips: "ALLOWED", className: "alerted", headline: "DNS volume alert generated", explanation: "The query rate is unusual for a user workstation. The IDS alerts, while the analyst checks processes and query names.", reason: "DNS rate baseline" }
];
let streamIndex = 0;
let streamPaused = false;
let syntheticEventCount = 12480;
let syntheticBlockCount = 7;

function formatCurrentTime() {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
}

function pushTrafficEvent(forcedIndex) {
  if (streamPaused && forcedIndex === undefined) return;
  const event = trafficEvents[forcedIndex === undefined ? streamIndex % trafficEvents.length : forcedIndex];
  streamIndex += 1;
  syntheticEventCount += 137;
  if (event.className === "blocked") syntheticBlockCount += 1;
  $("#eventCount").textContent = syntheticEventCount.toLocaleString();
  $("#blockCount").textContent = syntheticBlockCount;
  $("#streamHeadline").textContent = event.headline;
  $("#streamExplanation").textContent = event.explanation;
  $("#streamIds").textContent = event.ids;
  $("#streamIps").textContent = event.ips;
  $("#streamReason").textContent = event.reason;
  const row = document.createElement("tr");
  row.innerHTML = `<td>${formatCurrentTime()}</td><td>${event.source}</td><td>${event.destination}</td><td>${event.service}</td><td>${event.ids}</td><td><span class="event-action ${event.className}">${event.ips}</span></td>`;
  $("#eventRows").prepend(row);
  while ($$("#eventRows tr").length > 7) $("#eventRows tr:last-child").remove();
  const headline = event.ips === "BLOCKED" ? "IPS dropped a training connection" : event.ids.includes("alert") ? "IDS created an alert for review" : "Expected traffic allowed";
  $("#heroEvent").textContent = headline;
}

for (let index = 0; index < 6; index += 1) pushTrafficEvent(index);
const streamTimer = setInterval(() => pushTrafficEvent(), 3200);
$("#toggleStream").addEventListener("click", () => {
  streamPaused = !streamPaused;
  $("#toggleStream").textContent = streamPaused ? "Resume stream" : "Pause stream";
});
$("#injectDemo").addEventListener("click", () => {
  pushTrafficEvent(2);
  showToast("Training event injected. No real traffic was generated.");
});
window.addEventListener("beforeunload", () => clearInterval(streamTimer));

// Sixteen realistic but beginner-friendly alert investigations.
const verdictOptions = [
  "Likely expected or authorised",
  "Suspicious - investigate further",
  "High-confidence malicious"
];
const actionOptions = [
  "Allow or close with clear notes",
  "Collect evidence and monitor",
  "Block or contain and escalate"
];

const alertCases = [
  {
    title: "Internal port sweep", subtitle: "Many destination ports in 40 seconds", severity: "medium", source: "10.20.5.15 -> server subnet",
    log: "time=09:00:12\nsensor=IDS-CORE\nsrc=10.20.5.15\ndst_count=18\nport_count=64\naction=ALERTED\nrule=PORT-SWEEP-RATE",
    facts: ["Asset inventory identifies 10.20.5.15 as SCAN-SRV-01.", "Change ticket CHG-204 approves a vulnerability scan from 09:00 to 10:00.", "The alert occurred inside the approved window."],
    evidence: ["The medium severity label", "Approved scanner role plus CHG-204 and matching time", "The number of open ports"], answers: [0, 0, 1],
    hint: "Compare the source role and alert time with the change ticket.", success: "This is an authorised scan. Close with the ticket, source, time and rule recorded."
  },
  {
    title: "External connection sweep", subtitle: "One internet source touched many services", severity: "medium", source: "203.0.113.44 -> 10.20.5.20",
    log: "time=09:18:31\nsensor=IDS-EDGE\nsrc=203.0.113.44\ndst=10.20.5.20\nports=21,22,80,443,445,3389\naction=ALERTED\nrule=EXT-PORT-SWEEP",
    facts: ["The source is external and not on an allow list.", "No maintenance or assessment ticket exists.", "The IDS saw attempts to six unrelated services."],
    evidence: ["No approval plus rapid attempts to unrelated services", "The destination ends in .20", "The event used TCP"], answers: [1, 1, 0],
    hint: "An IDS alert did not block the source. Look for approval and breadth of activity.", success: "The pattern is suspicious. Preserve the alert and search for related attempts before deciding on containment."
  },
  {
    title: "Web signature phrase match", subtitle: "Training page included a security term", severity: "low", source: "10.20.5.42 -> 10.20.5.20:443",
    log: "time=09:31:05\nsensor=IDS-WEB\nmethod=GET\npath=/training/sql-injection-basics\nuser=teacher.lee\naction=ALERTED\nrule=WEB-SQLI-KEYWORD",
    facts: ["The full request is a GET for an internal training page.", "The matched words are part of the page name, not a submitted input.", "teacher.lee is scheduled to teach this module."],
    evidence: ["The rule name contains SQLI", "The request path, method and scheduled user context", "HTTPS uses port 443"], answers: [0, 0, 1],
    hint: "A keyword alone can match harmless educational content. Read the method and complete path.", success: "This is a false positive. Document it and consider narrowing the signature to actual input fields."
  },
  {
    title: "Repeated SSH authentication", subtitle: "Failures followed by a successful login", severity: "medium", source: "10.20.5.31 -> 10.20.5.12:22",
    log: "time=09:47:22\nsensor=IDS-CORE\nsrc=10.20.5.31\ndst=10.20.5.12\nservice=SSH\nfailures=4\nsuccess=1\naction=ALERTED",
    facts: ["10.20.5.31 is the approved administrator jump host.", "Ticket CHG-219 covers maintenance on 10.20.5.12.", "The successful login used the assigned administrator account with MFA."],
    evidence: ["Four failures always prove an attack", "Port 22 is present", "Approved jump host, maintenance ticket and MFA"], answers: [0, 0, 2],
    hint: "Check the source asset, maintenance approval and authentication context together.", success: "The evidence supports authorised maintenance. Record the failed attempts and the approving ticket."
  },
  {
    title: "High-volume DNS requests", subtitle: "A DNS server generated thousands of queries", severity: "low", source: "10.20.5.10 -> internet DNS",
    log: "time=10:02:00\nsensor=IDS-EGRESS\nsrc=10.20.5.10\nservice=UDP/53\nqueries=4200/5m\naction=ALERTED\nrule=DNS-HIGH-VOLUME",
    facts: ["10.20.5.10 is the organisation's recursive DNS server.", "Its seven-day baseline is 3,800 to 4,600 queries per five minutes.", "Query names show normal business domains."],
    evidence: ["Asset role, normal baseline and ordinary query names", "The alert count is greater than 4,000", "DNS uses UDP"], answers: [0, 0, 0],
    hint: "High volume is meaningful only when compared with the asset's normal role and baseline.", success: "The activity fits the DNS server's role and baseline. The rule threshold may need role-aware tuning."
  },
  {
    title: "Workstation DNS burst", subtitle: "A reception PC exceeded its normal rate", severity: "medium", source: "10.20.5.70 -> 10.20.5.10:53",
    log: "time=10:14:44\nsensor=IDS-CORE\nsrc=10.20.5.70\nservice=UDP/53\nqueries=960/2m\nunique_domains=310\naction=ALERTED",
    facts: ["10.20.5.70 is a reception workstation, not a DNS server.", "Its baseline is 20 to 60 queries in two minutes.", "There is no software deployment or approved test."],
    evidence: ["UDP is less reliable than TCP", "The workstation role, 16x baseline and many unique domains", "The time is 10:14"], answers: [1, 1, 1],
    hint: "Compare the observed rate to this specific device's role and baseline.", success: "The deviation is suspicious. Collect process, DNS and endpoint evidence before declaring the cause."
  },
  {
    title: "Test-file signature", subtitle: "Approved security validation triggered malware logic", severity: "high", source: "10.20.5.60 -> test repository",
    log: "time=10:30:10\nsensor=IDS-LAB\nsrc=10.20.5.60\nfile=harmless-av-test.txt\nmatch=AV-TEST-SIGNATURE\naction=ALERTED\nrule=MALWARE-FILE-PATTERN",
    facts: ["LAB-PC-02 is in the isolated validation network.", "Exercise EX-18 authorises the harmless antivirus test file.", "The recorded file hash matches the instructor's expected test hash."],
    evidence: ["High severity means malicious", "Isolated lab, exercise approval and expected test hash", "The filename contains test"], answers: [0, 0, 1],
    hint: "Severity describes rule priority, not final truth. Verify approval and exact file identity.", success: "This is expected validation activity. Record EX-18 and the matching hash."
  },
  {
    title: "Known command channel match", subtitle: "Endpoint and network evidence agree", severity: "high", source: "10.20.5.88 -> 203.0.113.90:443",
    log: "time=10:46:03\nsensor=IPS-EDGE\nsrc=10.20.5.88\ndst=203.0.113.90\nservice=TCP/443\naction=BLOCKED\nrule=HIGH-CONFIDENCE-C2",
    facts: ["The destination is on the current training block list.", "EDR shows an unsigned temporary-folder process made the request.", "The user reports opening an unexpected archive five minutes earlier."],
    evidence: ["Port 443 by itself", "The source is internal", "Current IOC plus unusual process and user report"], answers: [2, 2, 2],
    hint: "Look for agreement between current intelligence, endpoint process evidence and user context.", success: "Multiple independent facts support high confidence. Preserve evidence, contain and escalate under the incident playbook."
  },
  {
    title: "Inbound RDP policy block", subtitle: "Internet traffic attempted remote desktop", severity: "high", source: "198.51.100.77 -> 10.20.5.44:3389",
    log: "time=11:03:18\nsensor=IPS-EDGE\nsrc=198.51.100.77\ndst=10.20.5.44\nservice=TCP/3389\naction=BLOCKED\nrule=NO-INBOUND-RDP",
    facts: ["Inbound RDP is forbidden by policy.", "The IPS dropped the attempt before a session formed.", "No other related event is currently shown."],
    evidence: ["The destination workstation is definitely compromised", "Forbidden service, external source and recorded BLOCKED action", "All internet traffic is malicious"], answers: [1, 1, 1],
    hint: "The attempt is suspicious, but the evidence also says the IPS blocked it. Do not invent a successful login.", success: "Investigate for repeats and verify endpoint logs, while accurately recording that this attempt was blocked."
  },
  {
    title: "Scheduled SMB fan-out", subtitle: "A backup server contacted many file servers", severity: "medium", source: "10.20.5.8 -> server subnet:445",
    log: "time=23:02:14\nsensor=IDS-CORE\nsrc=10.20.5.8\nservice=TCP/445\ndestinations=22\naction=ALERTED\nrule=SMB-LATERAL-RATE",
    facts: ["10.20.5.8 is BACKUP-01.", "The backup schedule begins daily at 23:00.", "Destinations exactly match the approved backup inventory."],
    evidence: ["SMB always indicates lateral movement", "Approved backup role, exact schedule and expected destinations", "Twenty-two is a large number"], answers: [0, 0, 1],
    hint: "Compare source role, time and destination list with the approved business process.", success: "This is expected backup traffic. A source-and-schedule-aware rule can reduce repeat noise."
  },
  {
    title: "Guest device SMB fan-out", subtitle: "A visitor network device contacted internal hosts", severity: "high", source: "10.30.8.91 -> office subnet:445",
    log: "time=11:26:51\nsensor=IPS-SEGMENT\nsrc=10.30.8.91\nzone=GUEST\nservice=TCP/445\ndestinations=17\naction=BLOCKED\nrule=GUEST-TO-LAN-SMB",
    facts: ["Guest devices are not allowed to reach the office subnet.", "The source tried 17 destinations in one minute.", "The IPS blocked the connections at the segment boundary."],
    evidence: ["The network zone violation plus many targets and block records", "The source address begins with 10", "SMB uses TCP"], answers: [1, 2, 0],
    hint: "A guest device has no business reason for this path. The IPS already blocked; think about containment and ownership.", success: "Keep the segment block, identify the guest device, preserve logs and escalate for investigation."
  },
  {
    title: "Large approved upload", subtitle: "Design files moved to sanctioned cloud storage", severity: "medium", source: "10.20.5.55 -> 198.51.100.30:443",
    log: "time=11:40:00\nsensor=IDS-EGRESS\nsrc=10.20.5.55\nbytes_out=4.2GB\ndst=198.51.100.30\naction=ALERTED\nrule=LARGE-OUTBOUND-TRANSFER",
    facts: ["The destination is the approved company storage tenant.", "The design project ticket expects a 4 to 6 GB upload today.", "The authenticated user owns the project and used the managed sync client."],
    evidence: ["Approved tenant, project ticket, expected size and managed client", "Any 4 GB transfer is malicious", "HTTPS encrypts traffic"], answers: [0, 0, 0],
    hint: "Check destination ownership, expected business activity, user and software together.", success: "The transfer matches the approved workflow. Document why the large-volume rule fired legitimately."
  },
  {
    title: "Service-account login failures", subtitle: "An application used an old password", severity: "medium", source: "10.20.5.22 -> identity service",
    log: "time=12:01:17\nsensor=IDS-AUTH\naccount=svc_reports\nsource=10.20.5.22\nfailures=36/5m\naction=ALERTED\nrule=AUTH-FAILURE-BURST",
    facts: ["The service-account password changed at 11:55 under CHG-230.", "APP-REPORTS-01 still has the previous credential.", "There are no failures from other source devices."],
    evidence: ["Credential change timing and failures from only the known application", "Thirty-six always means brute force", "The account begins with svc"], answers: [0, 0, 0],
    hint: "Build a timeline around the password change and check whether the failures are distributed or isolated.", success: "This is an operational configuration issue. Record the evidence and route it to the service owner without calling it an attack."
  },
  {
    title: "New vendor-update domain", subtitle: "A signed updater contacted a domain not seen before", severity: "low", source: "10.20.5.36 -> updates.example:443",
    log: "time=12:18:49\nsensor=IDS-EGRESS\nsrc=10.20.5.36\ndomain=updates.example\nfirst_seen=true\naction=ALERTED\nrule=RARE-DOMAIN",
    facts: ["The binary is signed by the approved software vendor.", "The vendor bulletin announced a new update domain today.", "TLS certificate ownership and the application hash match the bulletin."],
    evidence: ["First seen means malicious", "Port 443", "Vendor bulletin, signature, certificate and matching hash"], answers: [0, 0, 2],
    hint: "Rare is not the same as harmful. Validate identity through several independent attributes.", success: "The connection is expected vendor-update activity. Record the validation sources."
  },
  {
    title: "ICMP monitoring noise", subtitle: "Health checks exceeded a generic rate", severity: "low", source: "10.20.5.5 -> network devices",
    log: "time=12:33:02\nsensor=IPS-CORE\nsrc=10.20.5.5\nprotocol=ICMP\nrate=120/min\naction=ALERTED\nrule=ICMP-HIGH-RATE",
    facts: ["10.20.5.5 is the approved monitoring server.", "Its documented health checks run every 30 seconds across 60 devices.", "Packet size and destinations match the monitoring profile."],
    evidence: ["ICMP should be disabled everywhere", "Monitoring role, documented rate, packet size and destination set", "The rule is low severity"], answers: [0, 0, 1],
    hint: "Calculate what 60 devices checked twice per minute would look like, then compare the profile.", success: "This is expected monitoring. Tune with a narrow source-and-profile exception, not a global disable."
  },
  {
    title: "Correlated endpoint spread", subtitle: "Scanning, SMB attempts and rare DNS from one host", severity: "high", source: "10.20.5.99 -> multiple",
    log: "time=12:48-12:53\nsensor=IDS-CORRELATION\nsrc=10.20.5.99\nports_scanned=42\nsmb_destinations=14\nrare_dns=6\naction=ALERTED\nrule=MULTI-STAGE-SPREAD",
    facts: ["The endpoint is a standard sales laptop, not an admin or scanner.", "No ticket or deployment is active.", "EDR reports a newly created unsigned process making the connections."],
    evidence: ["A correlated pattern, wrong asset role, no approval and unusual process", "The alert is high severity", "The device is a laptop"], answers: [2, 2, 0],
    hint: "Multiple independent behaviours from the wrong kind of asset create stronger confidence than one alert alone.", success: "The correlation supports high confidence. Contain according to authority, preserve evidence and escalate immediately."
  }
];

function renderAlertCases() {
  $("#alertQueue").innerHTML = alertCases.map((item, index) => {
    const activityId = `alert-${index + 1}`;
    return `<article class="alert-case ${isComplete(activityId) ? "complete" : ""}" data-alert="${index}">
      <button class="alert-summary" type="button" aria-expanded="false">
        <span class="alert-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="alert-title"><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.subtitle)}</small></span>
        <span class="severity ${item.severity}">${item.severity.toUpperCase()}</span><span class="complete-mark">RESOLVED</span>
        <span class="expand-symbol">+</span>
      </button>
      <div class="alert-detail">
        <div class="alert-context">
          <div class="log-panel"><span class="panel-label">RAW ALERT RECORD</span><pre>${escapeHTML(item.log)}</pre></div>
          <div class="context-panel"><span class="panel-label">CONTEXT DRAWER</span><ul>${item.facts.map(fact => `<li>${escapeHTML(fact)}</li>`).join("")}</ul></div>
        </div>
        <div class="case-decisions">
          <label>1. CLASSIFICATION<select data-decision="verdict"><option value="">Choose classification</option>${verdictOptions.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}</select></label>
          <label>2. RESPONSE<select data-decision="action"><option value="">Choose response</option>${actionOptions.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}</select></label>
          <label>3. STRONGEST EVIDENCE<select data-decision="evidence"><option value="">Choose evidence</option>${item.evidence.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}</select></label>
        </div>
        <div class="case-actions"><button class="button primary check-case" type="button">Check all three decisions</button><button class="hint-button show-case-hint" type="button">Open guided hint</button></div>
        <p class="case-hint">${escapeHTML(item.hint)}</p><p class="case-feedback" aria-live="polite"></p>
      </div>
    </article>`;
  }).join("");

  $$(".alert-case").forEach(card => {
    const index = Number(card.dataset.alert);
    const activityId = `alert-${index + 1}`;
    const summary = $(".alert-summary", card);
    summary.addEventListener("click", () => {
      card.classList.toggle("open");
      summary.setAttribute("aria-expanded", String(card.classList.contains("open")));
    });
    $(".show-case-hint", card).addEventListener("click", event => {
      const hint = $(".case-hint", card);
      hint.classList.toggle("show");
      event.currentTarget.textContent = hint.classList.contains("show") ? "Close guided hint" : "Open guided hint";
    });
    $(".check-case", card).addEventListener("click", () => checkAlertCase(card, index));
    if (isComplete(activityId)) restoreAlertCase(card, index);
  });
}

function restoreAlertCase(card, index) {
  const item = alertCases[index];
  const selects = $$("select", card);
  item.answers.forEach((answer, selectIndex) => { selects[selectIndex].value = answer; });
  card.classList.add("complete");
  $(".case-feedback", card).textContent = `Resolved: ${item.success}`;
  $(".case-feedback", card).className = "case-feedback good";
}

function checkAlertCase(card, index) {
  const item = alertCases[index];
  const selects = $$("select", card);
  const feedback = $(".case-feedback", card);
  if (selects.some(select => select.value === "")) {
    feedback.textContent = "Complete classification, response and evidence before checking.";
    feedback.className = "case-feedback bad";
    return;
  }
  const results = item.answers.map((answer, answerIndex) => Number(selects[answerIndex].value) === answer);
  if (results.every(Boolean)) {
    feedback.textContent = `Resolved: ${item.success}`;
    feedback.className = "case-feedback good";
    card.classList.add("complete");
    completeActivity(`alert-${index + 1}`);
  } else {
    const labels = ["classification", "response", "evidence"];
    const correct = labels.filter((label, resultIndex) => results[resultIndex]).join(", ");
    const review = labels.filter((label, resultIndex) => !results[resultIndex]).join(", ");
    feedback.textContent = `${correct ? `Correct: ${correct}. ` : ""}Review: ${review}. Open the hint and use only the supplied facts.`;
    feedback.className = "case-feedback bad";
  }
}
renderAlertCases();

// Five safe tuning reviews.
const tuningCases = [
  { title: "Approved scanner creates daily noise", detail: "The scan rule is useful for every source except SCAN-SRV-01 during its approved 09:00-10:00 window.", options: ["Disable the port-scan rule", "Add a narrow source-and-schedule exception, then review it", "Ignore every medium alert"], answer: 1, success: "Specific exception chosen. Detection remains active outside the approved source and window." },
  { title: "Generic DNS threshold is too low", detail: "DNS servers normally exceed it, while workstations do not. Seven days of baselines are available.", options: ["Delete all DNS monitoring", "Block every DNS query over the current threshold", "Use role-based thresholds derived from the measured baselines"], answer: 2, success: "Role-aware baselines reduce noise while preserving abnormal workstation detection." },
  { title: "Threat-intelligence indicator is stale", detail: "The domain changed ownership six months ago and current sources no longer rate it malicious.", options: ["Review source date and evidence, then expire the one stale indicator", "Keep blocking forever because it was once listed", "Turn off all threat-intelligence rules"], answer: 0, success: "A dated, evidence-based IOC review is safer than blind permanent blocking." },
  { title: "New IPS rule is not yet proven", detail: "The signature looks useful, but its effect on business traffic is unknown.", options: ["Deploy in blocking mode to every site immediately", "Pilot in detect-only mode, measure matches, test impact, then approve enforcement", "Never use IPS prevention"], answer: 1, success: "A detect-only pilot creates evidence before the rule can interrupt production traffic." },
  { title: "Business form is being blocked", detail: "A broad web signature matches one harmless field name on an approved application.", options: ["Allow all traffic to the application", "Disable every web rule", "Narrow the rule to the harmful request context and regression-test both safe and unsafe samples"], answer: 2, success: "The rule becomes more precise while protection and business access are both tested." }
];

function renderTuningCases() {
  $("#tuningCases").innerHTML = tuningCases.map((item, index) => `
    <article class="tuning-case ${isComplete(`tuning-${index + 1}`) ? "complete" : ""}" data-tuning="${index}">
      <span class="tuning-number">${String(index + 1).padStart(2, "0")}</span>
      <div class="tuning-scenario"><h4>${escapeHTML(item.title)}</h4><p>${escapeHTML(item.detail)}</p></div>
      <div class="tuning-work"><select aria-label="Choose tuning decision for case ${index + 1}"><option value="">Choose the safest change</option>${item.options.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}</select><button class="button primary" type="button">Review change</button><p class="feedback"></p></div>
    </article>`).join("");

  $$(".tuning-case").forEach(card => {
    const index = Number(card.dataset.tuning);
    const select = $("select", card);
    const feedback = $(".feedback", card);
    if (isComplete(`tuning-${index + 1}`)) {
      select.value = tuningCases[index].answer;
      setFeedback(feedback, tuningCases[index].success, true);
    }
    $("button", card).addEventListener("click", () => {
      if (select.value === "") return setFeedback(feedback, "Choose one proposed change first.", false);
      if (Number(select.value) === tuningCases[index].answer) {
        setFeedback(feedback, tuningCases[index].success, true);
        card.classList.add("complete");
        completeActivity(`tuning-${index + 1}`);
      } else {
        setFeedback(feedback, "That change is too broad or too risky. Preserve detection, narrow the condition and test the result.", false);
      }
    });
  });
}
renderTuningCases();

// Final correlated investigation: five individually tracked decisions.
const finalQuestions = [
  { question: "What is the best overall assessment?", options: ["Nothing happened because one connection was blocked", "The correlated activity is suspicious enough for incident escalation", "The evidence proves every file was stolen"], answer: 1 },
  { question: "What did the IDS do at 14:02?", options: ["Alerted on the DNS query; it did not block it", "Deleted the domain", "Blocked the endpoint from the network"], answer: 0 },
  { question: "What did the IPS do at 14:08?", options: ["Only displayed a dashboard message", "Guaranteed the endpoint was clean", "Dropped the outbound TCP/443 connection"], answer: 2 },
  { question: "What is the safest next analyst step?", options: ["Erase the laptop immediately", "Preserve evidence, collect endpoint and user context, and escalate under the playbook", "Publish the user's name and IP address"], answer: 1 },
  { question: "Which hand-off note is best?", options: ["Definitely hacked. Fix ASAP.", "14:02 IDS DNS alert, 14:05 unusual process, 14:08 IPS block; prior success and process impact remain unknown; evidence preserved and case escalated.", "The IPS solved everything."], answer: 1 }
];

function renderFinalQuestions() {
  $("#finalQuestions").innerHTML = finalQuestions.map((item, index) => `
    <article class="final-question ${isComplete(`final-${index + 1}`) ? "completed" : ""}" data-final="${index}">
      <label><div><span>FINAL DECISION ${index + 1}</span>${escapeHTML(item.question)}</div><select><option value="">Choose the evidence-led answer</option>${item.options.map((option, optionIndex) => `<option value="${optionIndex}">${escapeHTML(option)}</option>`).join("")}</select></label>
    </article>`).join("");
  $$(".final-question").forEach(card => {
    const index = Number(card.dataset.final);
    if (isComplete(`final-${index + 1}`)) $("select", card).value = finalQuestions[index].answer;
  });
}
renderFinalQuestions();

$("#submitFinal").addEventListener("click", () => {
  const cards = $$(".final-question");
  const selects = cards.map(card => $("select", card));
  if (selects.some(select => select.value === "")) {
    setFeedback($("#finalFeedback"), "Answer all five final decisions before submitting the briefing.", false);
    return;
  }
  let correct = 0;
  finalQuestions.forEach((item, index) => {
    const isCorrect = Number(selects[index].value) === item.answer;
    cards[index].classList.toggle("completed", isCorrect);
    if (isCorrect) {
      correct += 1;
      completeActivity(`final-${index + 1}`, true);
    }
  });
  updateProgress();
  if (correct === finalQuestions.length) {
    setFeedback($("#finalFeedback"), "5/5 correct. Your briefing separates facts, actions and unknowns. All final decisions are saved.", true);
    showToast("Final shift passed. Check the certificate section.");
  } else {
    setFeedback($("#finalFeedback"), `${correct}/5 correct. Correct rows are saved and highlighted. Re-read the action words ALERTED and DROPPED, then retry the remaining rows.`, false);
  }
});

// Certificate renderer and download.
function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  words.forEach(word => {
    const test = `${line}${word} `;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = `${word} `;
    } else {
      line = test;
    }
  });
  lines.push(line.trim());
  lines.forEach((lineText, index) => context.fillText(lineText, x, y + index * lineHeight));
}

function drawCertificate() {
  const name = $("#learnerName").value.trim();
  if (!name) {
    setFeedback($("#certificateFeedback"), "Enter the learner's name first.", false);
    return false;
  }
  if (state.completed.length < TOTAL_ACTIVITIES) {
    setFeedback($("#certificateFeedback"), "Complete all 32 activities before creating a certificate.", false);
    return false;
  }
  const canvas = $("#certificateCanvas");
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1600, 1000);
  gradient.addColorStop(0, "#061727");
  gradient.addColorStop(.55, "#0b2943");
  gradient.addColorStop(1, "#071725");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1600, 1000);

  context.strokeStyle = "#1ccce9";
  context.lineWidth = 5;
  context.strokeRect(45, 45, 1510, 910);
  context.strokeStyle = "rgba(90, 168, 255, .45)";
  context.lineWidth = 2;
  context.strokeRect(66, 66, 1468, 868);

  for (let index = 0; index < 14; index += 1) {
    context.fillStyle = index % 2 ? "rgba(23,105,255,.09)" : "rgba(21,201,232,.08)";
    context.beginPath();
    context.arc(85 + index * 120, 80 + (index % 3) * 20, 90, 0, Math.PI * 2);
    context.fill();
  }

  context.textAlign = "center";
  context.fillStyle = "#55e5ff";
  context.font = "800 28px Segoe UI, sans-serif";
  context.letterSpacing = "6px";
  context.fillText("SENTINEL JUNCTION", 800, 155);
  context.fillStyle = "#ffffff";
  context.font = "900 70px Segoe UI, sans-serif";
  context.fillText("CERTIFICATE OF COMPLETION", 800, 250);
  context.fillStyle = "#91aac1";
  context.font = "400 25px Segoe UI, sans-serif";
  context.fillText("This certificate recognises that", 800, 318);
  context.fillStyle = "#ffffff";
  context.font = "700 64px Georgia, serif";
  wrapCanvasText(context, name, 800, 420, 1220, 72);

  context.strokeStyle = "#2f6688";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(330, 515);
  context.lineTo(1270, 515);
  context.stroke();

  context.fillStyle = "#aac0d2";
  context.font = "400 26px Segoe UI, sans-serif";
  wrapCanvasText(context, "successfully completed the 32-activity IDS and IPS Analyst Lab, including alert triage, evidence review, prevention decisions, false-positive analysis and safe rule tuning.", 800, 590, 1120, 39);

  const date = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date());
  context.fillStyle = "#ffffff";
  context.font = "700 24px Segoe UI, sans-serif";
  context.fillText(date, 440, 790);
  context.fillText("32 / 32 ACTIVITIES", 1160, 790);
  context.fillStyle = "#6887a1";
  context.font = "600 17px Segoe UI, sans-serif";
  context.fillText("DATE COMPLETED", 440, 825);
  context.fillText("VERIFIED IN THIS BROWSER", 1160, 825);

  context.fillStyle = "#15c9e8";
  context.beginPath();
  context.arc(800, 803, 68, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#071725";
  context.font = "900 27px Segoe UI, sans-serif";
  context.fillText("IDS", 800, 796);
  context.font = "900 24px Segoe UI, sans-serif";
  context.fillText("+ IPS", 800, 826);

  setFeedback($("#certificateFeedback"), "Certificate preview created. You can now download it.", true);
  return true;
}

$("#previewCertificate").addEventListener("click", drawCertificate);
$("#downloadCertificate").addEventListener("click", () => {
  if (!drawCertificate()) return;
  const cleanName = $("#learnerName").value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "learner";
  const link = document.createElement("a");
  link.download = `${cleanName}-IDS-IPS-certificate.png`;
  link.href = $("#certificateCanvas").toDataURL("image/png");
  link.click();
});

// Navigation utilities.
$("#resetLab").addEventListener("click", () => {
  if (window.confirm("Reset all 32 activities and remove saved progress from this browser?")) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
});

$("#resumeLab").addEventListener("click", () => {
  const firstIncomplete = [
    ...Array.from({ length: 6 }, (_, index) => `foundation-${index + 1}`),
    ...Array.from({ length: 16 }, (_, index) => `alert-${index + 1}`),
    ...Array.from({ length: 5 }, (_, index) => `tuning-${index + 1}`),
    ...Array.from({ length: 5 }, (_, index) => `final-${index + 1}`)
  ].find(id => !isComplete(id));
  if (!firstIncomplete) {
    $("#certificate").scrollIntoView({ behavior: "smooth" });
  } else if (firstIncomplete.startsWith("foundation")) {
    const card = $(`[data-activity-card="${firstIncomplete}"]`);
    (card || $("#briefing")).scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (firstIncomplete.startsWith("alert")) {
    const index = Number(firstIncomplete.split("-")[1]) - 1;
    const card = $(`[data-alert="${index}"]`);
    card.classList.add("open");
    $(".alert-summary", card).setAttribute("aria-expanded", "true");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (firstIncomplete.startsWith("tuning")) {
    const index = Number(firstIncomplete.split("-")[1]) - 1;
    $(`[data-tuning="${index}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    $("#final-shift").scrollIntoView({ behavior: "smooth" });
  }
});

updateProgress();
