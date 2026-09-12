"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { AdminTable } from "./AdminTable";
import { useAppDispatch, useAppState } from "@/context/AppContext";
import { type EmailTemplate, type SupportCall, type SupportChat, type SupportEmail, type SupportSms, type SupportTeamMessage, type SupportTicket, type WhatsAppMessage } from "@/lib/dashboard";

const communicationModes = ["chat", "email", "sms", "call", "whatsapp"] as const;
const supportTabs = [["tickets", "Tickets"], ["chat", "Live chat"], ["team", "Team chat"], ["kb", "Knowledge base"]] as const;
const ticketPriorities = ["Low", "Normal", "High", "Urgent"];
const ticketStatuses = ["Open", "Resolved"];
const emailTabs = ["inbox", "compose", "sent", "drafts", "templates"] as const;
const smsTabs = ["compose", "sent"] as const;
const callTabs = ["dialer", "log"] as const;
const whatsappTabs = ["compose", "log"] as const;
const supportStorageKey = "jaad_erp_state_v3";

function readPersistedSupport<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(supportStorageKey) || "null");
    return saved?.data?.[key] ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function nowStamp() {
  const date = new Date();
  return `${date.toISOString().slice(0, 10)} ${date.toTimeString().slice(0, 5)}`;
}

function statusBadge(status: string) {
  return <span className={`badge st-${status.toLowerCase().replace(/[^a-z0-9]/g, "")}`}><span className="dot" />{status}</span>;
}

function attachmentToDataUrl(file: File | undefined, done: (value: string) => void) {
  if (!file) { done(""); return; }
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result));
  reader.readAsDataURL(file);
}

export function Support() {
  const { currentView, currentTab, DB } = useAppState();
  const dispatch = useAppDispatch();
  const [communicationTab, setCommunicationTab] = useState("inbox");
  const [tickets, setTickets] = useState<SupportTicket[]>(() => readPersistedSupport("tickets", DB.tickets));
  const [chats, setChats] = useState<SupportChat[]>(() => readPersistedSupport("chats", DB.chats));
  const [teamChat, setTeamChat] = useState<SupportTeamMessage[]>(() => readPersistedSupport("teamChat", DB.teamChat));
  const [knowledgeBase] = useState<{ q: string; a: string }[]>(() => readPersistedSupport("kb", DB.kb));
  const [emails, setEmails] = useState<SupportEmail[]>(() => readPersistedSupport("emails", DB.emails));
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(() => readPersistedSupport("emailTemplates", DB.emailTemplates));
  const [smsMessages, setSmsMessages] = useState<SupportSms[]>(() => readPersistedSupport("smsMessages", DB.smsMessages));
  const [calls, setCalls] = useState<SupportCall[]>(() => readPersistedSupport("calls", DB.calls));
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>(() => readPersistedSupport("whatsappMessages", DB.whatsappMessages));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatFilter, setChatFilter] = useState("Open");
  const [activeWhatsappId, setActiveWhatsappId] = useState("");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStarted, setCallStarted] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState("00:00");
  const [modal, setModal] = useState<"email" | "template" | "call" | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<SupportEmail | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCall, setSelectedCall] = useState<SupportCall | null>(null);
  const [emailForm, setEmailForm] = useState({ to: "", cc: "", bcc: "", subject: "", body: "", invoiceNo: "", attachment: "", attachmentName: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "" });
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentView || ["support", ...communicationModes.filter((mode) => mode !== "chat")].includes(currentView)) return;
    dispatch({ type: "SET_CURRENT_VIEW", view: "support" });
  }, [currentView, dispatch]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(supportStorageKey) || "null") || {};
      localStorage.setItem(supportStorageKey, JSON.stringify({ ...saved, savedAt: Date.now(), data: { ...(saved.data || {}), tickets, chats, teamChat, kb: knowledgeBase, emails, emailTemplates, smsMessages, calls, whatsappMessages } }));
    } catch {
      // The legacy implementation also ignores storage failures.
    }
  }, [calls, chats, emailTemplates, emails, knowledgeBase, smsMessages, teamChat, tickets, whatsappMessages]);

  useEffect(() => {
    if (activeCallId && callStarted) {
      const timer = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - callStarted) / 1000);
        setCallDuration(`${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`);
      }, 1000);
      return () => window.clearInterval(timer);
    }
  }, [activeCallId, callStarted]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const selectSupportTab = (tab: string) => {
    dispatch({ type: "SET_CURRENT_TAB", view: "support", tab });
  };

  const closeModal = () => {
    setModal(null);
    setSelectedEmail(null);
    setSelectedTemplate(null);
    setSelectedCall(null);
  };

  const updateTicket = (ticket: SupportTicket, field: "priority" | "status", value: string) => {
    const nextTickets = tickets.map((currentTicket) => currentTicket === ticket ? { ...currentTicket, [field]: value, ...(field === "status" && value === "Resolved" ? { closed: nowStamp() } : {}) } : currentTicket);
    setTickets(nextTickets);
    showToast(`${ticket.id} ${field} set to ${value}`);
  };

  const filteredChats = chats.filter((chat) => chat.status === chatFilter);
  const selectedChat = chats.find((chat) => chat.id === activeChatId) || filteredChats[0] || null;

  const chooseChatFilter = (filter: string) => {
    setChatFilter(filter);
    setActiveChatId(null);
  };

  const updateChat = (chat: SupportChat, changes: Partial<SupportChat>, message: string) => {
    setChats((currentChats) => currentChats.map((currentChat) => currentChat === chat ? { ...currentChat, ...changes } : currentChat));
    showToast(message);
  };

  const setChatStatus = (chat: SupportChat, status: string) => {
    const nextTicketNumber = Math.max(0, ...tickets.map((ticketRecord) => Number(ticketRecord.id.replace(/\D/g, "")) || 0)) + 1;
    const ticket = status === "Pending" && !chat.ticketId ? { id: `TCK-${String(nextTicketNumber).padStart(4, "0")}`, customer: chat.visitor, subject: `Live chat: ${(chat.messages.filter((message) => message.from === "visitor").slice(-1)[0]?.text || "Escalated conversation").slice(0, 60)}`, priority: "Medium", status: "Open", channel: "Live chat", opened: nowStamp(), closed: "" } : null;
    if (ticket) setTickets((currentTickets) => [ticket, ...currentTickets]);
    updateChat(chat, { status, ...(ticket ? { ticketId: ticket.id } : {}), ...(status === "Resolved" ? { clearedIndex: chat.messages.length } : {}) }, ticket ? `Moved to pending, ticket ${ticket.id} created` : status === "Resolved" ? `${chat.visitor} marked Resolved, cleared from their view` : `${chat.visitor} marked ${status}`);
    setChatFilter(status);
  };

  const sendChatReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("message") || "").trim();
    if (!text || !selectedChat) return;
    updateChat(selectedChat, { messages: [...selectedChat.messages, { from: "agent", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }], humanTookOver: true, waitingForAgent: false }, "Reply sent");
    event.currentTarget.reset();
  };

  const sendChatFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat) return;
    if (file.size > 5 * 1024 * 1024) { showToast("That file is too large, max 5MB"); return; }
    attachmentToDataUrl(file, (attachment) => updateChat(selectedChat, { messages: [...selectedChat.messages, { from: "agent", text: "", img: attachment, fileName: file.name, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }], humanTookOver: true, waitingForAgent: false }, "Attachment sent"));
  };

  const renderTickets = () => {
    const openTickets = tickets.filter((ticket) => ticket.status === "Open");
    const resolvedTickets = tickets.filter((ticket) => ticket.status === "Resolved");
    return <><div className="grid g-3" style={{ marginBottom: 14 }}><div className="kpi-card"><div className="kpi-label">Open tickets</div><div className="kpi-value">{openTickets.length}</div><div className="kpi-cap">awaiting a reply</div></div><div className="kpi-card"><div className="kpi-label">Resolved tickets</div><div className="kpi-value">{resolvedTickets.length}</div><div className="kpi-cap">closed out</div></div><div className="kpi-card"><div className="kpi-label">Opened today</div><div className="kpi-value">{tickets.filter((ticket) => ticket.opened.startsWith("2026-08-02")).length}</div><div className="kpi-cap">2 Aug 2026</div></div></div><div className="card-title" style={{ marginBottom: 10 }}>Open</div><AdminTable<SupportTicket> columns={[{ key: "id", label: "Ticket", render: (ticket) => <span className="mono">{ticket.id}</span> }, { key: "customer", label: "Customer" }, { key: "subject", label: "Subject" }, { key: "channel", label: "Channel", render: (ticket) => <span className="badge b-gray">{ticket.channel}</span> }, { key: "priority", label: "Priority", render: (ticket) => <select className="switch-select" value={ticket.priority} onChange={(event) => updateTicket(ticket, "priority", event.target.value)}>{ticketPriorities.map((priority) => <option key={priority}>{priority}</option>)}</select> }, { key: "status", label: "Status", render: (ticket) => <select className="switch-select" value={ticket.status} onChange={(event) => updateTicket(ticket, "status", event.target.value)}>{ticketStatuses.map((status) => <option key={status}>{status}</option>)}</select> }]} data={openTickets} /><div className="card-title" style={{ margin: "20px 0 10px" }}>Resolved<small style={{ fontWeight: 400, color: "var(--text-faint)" }}>Moves here automatically once marked Resolved</small></div><AdminTable<SupportTicket> columns={[{ key: "id", label: "Ticket", render: (ticket) => <span className="mono">{ticket.id}</span> }, { key: "customer", label: "Customer" }, { key: "subject", label: "Subject" }, { key: "channel", label: "Channel", render: (ticket) => <span className="badge b-gray">{ticket.channel}</span> }, { key: "closed", label: "Closed", render: (ticket) => formatDate(ticket.closed.slice(0, 10)) }, { key: "status", label: "Status", render: (ticket) => <select className="switch-select" value={ticket.status} onChange={(event) => updateTicket(ticket, "status", event.target.value)}>{ticketStatuses.map((status) => <option key={status}>{status}</option>)}</select> }]} data={resolvedTickets} /></>;
  };

  const renderChat = () => <div className="chat-shell"><div className="chat-list"><div style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid var(--border)" }}>{["Open", "Pending", "Resolved"].map((filter) => <button className={`btn btn-sm${chatFilter === filter ? " btn-primary" : ""}`} style={{ flex: 1, padding: "7px 4px", fontSize: 11.5 }} key={filter} onClick={() => chooseChatFilter(filter)}>{filter} ({chats.filter((chat) => chat.status === filter).length})</button>)}</div>{filteredChats.length ? filteredChats.map((chat) => { const lastMessage = chat.messages[chat.messages.length - 1]; return <div className={`chat-list-item${chat.id === selectedChat?.id ? " active" : ""}${chat.status === "Resolved" ? " resolved-item" : ""}`} key={chat.id} onClick={() => setActiveChatId(chat.id)}><div className="nm">{chat.status === "Resolved" ? "✓ " : ""}{chat.visitor}</div><div className="pv">{lastMessage?.text || ""}</div></div>; }) : <div className="empty" style={{ padding: 16 }}>No {chatFilter.toLowerCase()} chats</div>}</div>{selectedChat ? <div className="chat-pane"><div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div style={{ fontWeight: 700, fontSize: 12.8 }}>{selectedChat.visitor} {statusBadge(selectedChat.status)}</div><div className="row-actions">{selectedChat.status !== "Pending" && <button className="btn btn-sm" onClick={() => setChatStatus(selectedChat, "Pending")}>Move to pending</button>}{selectedChat.status !== "Resolved" ? <button className="btn btn-sm btn-primary" onClick={() => setChatStatus(selectedChat, "Resolved")}>Mark resolved</button> : <button className="btn btn-sm btn-primary" onClick={() => setChatStatus(selectedChat, "Open")}>Reopen</button>}</div></div>{selectedChat.status === "Resolved" && <div style={{ background: "var(--green-dim)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "9px 14px", textAlign: "center" }}>✓ This conversation is resolved</div>}<div className="chat-msgs">{selectedChat.messages.map((message, index) => <div className={`msg ${message.from}`} key={`${message.time}-${index}`}>{message.img && <img src={message.img} alt={message.fileName || "Attachment"} style={{ cursor: "pointer", maxWidth: 220, borderRadius: 8, display: "block", marginBottom: message.text ? 6 : 0 }} />}{message.text}<span className="tm">{message.time}</span></div>)}</div><form className="chat-input" onSubmit={sendChatReply}><label className="chat-file-btn" style={{ cursor: "pointer" }} title="Attach a file">📎<input type="file" style={{ display: "none" }} onChange={sendChatFile} /></label><input name="message" placeholder="Type a reply" /><button className="btn btn-primary btn-sm" type="submit">Send</button></form></div> : <div className="chat-pane" style={{ alignItems: "center", justifyContent: "center" }}><div className="empty">Select a chat</div></div>}</div>;

  const sendTeamMessage = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const text = String(form.get("message") || "").trim(); if (!text) return; setTeamChat((currentMessages) => [...currentMessages, { who: "You", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]); event.currentTarget.reset(); };
  const renderTeamChat = () => <div className="chat-pane" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", height: "calc(100vh - 230px)", minHeight: 560 }}><div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 12.8 }}>Team channel<span style={{ fontWeight: 400, color: "var(--text-faint)", marginLeft: 8 }}>Everyone with Support access can post here</span></div><div className="chat-msgs">{teamChat.length ? teamChat.map((message, index) => <div className={`msg ${message.who === "You" ? "agent" : "visitor"}`} key={`${message.time}-${index}`}><div style={{ fontSize: 10.5, fontWeight: 700, opacity: .75, marginBottom: 2 }}>{message.who}</div>{message.text}<span className="tm">{message.time}</span></div>) : <div className="empty">No messages yet, say hello to the team</div>}</div><form className="chat-input" onSubmit={sendTeamMessage}><input name="message" placeholder="Message the team" /><button className="btn btn-primary btn-sm" type="submit">Send</button></form></div>;

  const renderKnowledgeBase = () => <>{knowledgeBase.map((article, index) => <div className="card" style={{ marginBottom: 12 }} key={`${article.q}-${index}`}><div className="card-title" style={{ marginBottom: 6 }}>{article.q}</div><p style={{ color: "var(--text-dim)", fontSize: 12.6, margin: 0 }}>{article.a}</p></div>)}</>;

  const customerOptions = DB.customers.map((customer) => <option value={customer.name} key={customer.name}>{customer.name}</option>);
  const invoiceOptions = DB.invoices.map((invoice) => <option value={invoice.no} key={invoice.no}>{invoice.no} — {invoice.customer} — {invoice.amount}</option>);
  const replaceTemplateVariables = (value: string, invoiceNo: string) => { const invoice = DB.invoices.find((item) => item.no === invoiceNo); return value.replace(/{{invoice}}/g, invoice?.no || "").replace(/{{customer}}/g, invoice?.customer || "").replace(/{{tracking}}/g, invoice?.linkedShipment || ""); };
  const saveEmail = (status: "Draft" | "Sent") => {
    if (status === "Sent" && (!emailForm.to.trim() || !emailForm.subject.trim() || !emailForm.body.trim())) { showToast("Recipient, subject and message are required"); return; }
    const email: SupportEmail = { id: `EM-${Date.now()}`, to: emailForm.to.trim(), cc: emailForm.cc.trim(), bcc: emailForm.bcc.trim(), subject: emailForm.subject.trim(), body: emailForm.body, invoiceNo: emailForm.invoiceNo, attachment: emailForm.attachment, attachmentName: emailForm.attachmentName, status, folder: status === "Sent" ? "sent" : "drafts", date: new Date().toISOString() };
    setEmails((currentEmails) => [email, ...currentEmails]);
    setEmailForm({ to: "", cc: "", bcc: "", subject: "", body: "", invoiceNo: "", attachment: "", attachmentName: "" });
    setCommunicationTab(status === "Sent" ? "sent" : "drafts");
    showToast(status === "Sent" ? "Email recorded as sent" : "Email saved as draft");
  };
  const renderEmailCompose = () => <div className="card"><div className="card-title" style={{ marginBottom: 14 }}>Compose email<small>Send from inside JAAD ERP</small></div><div className="grid g-2"><div className="field"><label>To</label><input list="support-contact-list" placeholder="customer@gmail.com" value={emailForm.to} onChange={(event) => setEmailForm({ ...emailForm, to: event.target.value })} /></div><div className="field"><label>Invoice</label><select value={emailForm.invoiceNo} onChange={(event) => { const invoiceNo = event.target.value; const invoice = DB.invoices.find((item) => item.no === invoiceNo); setEmailForm({ ...emailForm, invoiceNo, to: DB.customers.find((customer) => customer.name === invoice?.customer)?.name || emailForm.to, subject: invoice ? `Invoice ${invoice.no} from JAAD Logistics` : emailForm.subject }); }}>{invoiceOptions}<option value="">No invoice link</option></select></div></div><datalist id="support-contact-list">{customerOptions}</datalist><div className="field"><label>CC</label><input placeholder="Optional" value={emailForm.cc} onChange={(event) => setEmailForm({ ...emailForm, cc: event.target.value })} /></div><div className="field"><label>BCC</label><input placeholder="Optional" value={emailForm.bcc} onChange={(event) => setEmailForm({ ...emailForm, bcc: event.target.value })} /></div><div className="field"><label>Template</label><select defaultValue="" onChange={(event) => { const template = emailTemplates.find((item) => item.id === event.target.value); if (template) setEmailForm({ ...emailForm, subject: replaceTemplateVariables(template.subject, emailForm.invoiceNo), body: replaceTemplateVariables(template.body, emailForm.invoiceNo) }); }}><option value="">Choose a template</option>{emailTemplates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></div><div className="field"><label>Subject</label><input placeholder="Subject" value={emailForm.subject} onChange={(event) => setEmailForm({ ...emailForm, subject: event.target.value })} /></div><div className="field"><label>Message</label><textarea style={{ minHeight: 260, width: "100%", resize: "vertical" }} placeholder="Write your email..." value={emailForm.body} onChange={(event) => setEmailForm({ ...emailForm, body: event.target.value })} /></div><div className="note">{emailForm.attachmentName ? `Attached: ${emailForm.attachmentName}` : ""}</div><div className="row-actions"><label className="btn" style={{ cursor: "pointer" }}>📎 Attach file<input type="file" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) attachmentToDataUrl(file, (attachment) => setEmailForm({ ...emailForm, attachment, attachmentName: file.name })); }} /></label><button className="btn" type="button" onClick={() => saveEmail("Draft")}>Save Draft</button><button className="btn btn-primary" type="button" onClick={() => saveEmail("Sent")}>Send Email</button></div><div className="note" style={{ marginTop: 12 }}>The ERP stores the complete email record and linked invoice. Connect your email API/provider for live delivery.</div></div>;
  const renderEmailMessages = (folder: string) => { const list = emails.filter((email) => folder === "inbox" ? email.folder === "inbox" || email.status === "Received" : folder === "sent" ? email.folder === "sent" || email.status === "Sent" : email.folder === "drafts" || email.status === "Draft"); return <div className="card"><div className="card-title" style={{ marginBottom: 10 }}>{folder === "inbox" ? "Inbox" : folder === "sent" ? "Sent emails" : "Draft emails"}</div>{list.length ? list.map((email) => <button className="email-row" style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer" }} key={email.id} onClick={() => { setSelectedEmail(email); setModal("email"); }}><div><strong>{email.to}</strong><span>{email.subject}</span></div><span className={`email-status ${email.status === "Draft" ? "draft" : "sent"}`}>{email.status}</span><small>{formatDate(email.date.slice(0, 10))}</small></button>) : <div className="empty">No {folder} emails yet.</div>}</div>; };
  const renderTemplates = () => <><div className="row-actions" style={{ marginBottom: 14 }}><button className="btn btn-primary" onClick={() => { setSelectedTemplate(null); setTemplateForm({ name: "New template", subject: "", body: "" }); setModal("template"); }}>＋ New template</button></div><div className="grid g-2">{emailTemplates.map((template) => <div className="card" key={template.id}><div className="card-title">{template.name}</div><p style={{ fontWeight: 700 }}>{template.subject}</p><p style={{ whiteSpace: "pre-wrap", color: "var(--text-dim)", fontSize: 12 }}>{template.body}</p><div className="row-actions"><button className="btn btn-sm btn-primary" onClick={() => { setCommunicationTab("compose"); setEmailForm({ ...emailForm, subject: template.subject, body: template.body }); }}>Use template</button><button className="btn btn-sm" onClick={() => { setSelectedTemplate(template); setTemplateForm({ name: template.name, subject: template.subject, body: template.body }); setModal("template"); }}>Edit</button></div></div>)}</div></>;
  const renderEmail = () => <>{communicationTab === "compose" ? renderEmailCompose() : communicationTab === "templates" ? renderTemplates() : renderEmailMessages(communicationTab)}</>;

  const sendSms = () => { const number = (document.getElementById("support-sms-number") as HTMLInputElement)?.value.trim(); const body = (document.getElementById("support-sms-body") as HTMLTextAreaElement)?.value.trim(); if (!number || !body) { showToast("Phone number and message are required"); return; } setSmsMessages((currentMessages) => [{ to: number, body, status: "Sent", date: new Date().toISOString() }, ...currentMessages]); setCommunicationTab("sent"); showToast("SMS recorded as sent"); };
  const renderSms = () => communicationTab === "sent" ? <div className="card"><div className="card-title">Sent SMS</div>{smsMessages.length ? smsMessages.map((message, index) => <div className="email-row" key={`${message.date}-${index}`}><div><strong>{message.to}</strong><span>{message.body}</span></div><span className="email-status sent">{message.status}</span><small>{formatDate(message.date.slice(0, 10))}</small></div>) : <div className="empty">No SMS sent yet.</div>}</div> : <div className="card"><div className="card-title">Send SMS<small>Connect an SMS provider such as Twilio or Termii for live delivery.</small></div><div className="field"><label>To</label><input id="support-sms-number" placeholder="08061234567" /></div><div className="field"><label>Message</label><textarea id="support-sms-body" maxLength={320} style={{ minHeight: 160, width: "100%" }} placeholder="Type SMS" /></div><div className="row-actions"><span className="note">0 / 320</span><button className="btn btn-primary" onClick={sendSms}>Send SMS</button></div></div>;

  const startCall = () => { const number = (document.getElementById("support-call-number") as HTMLInputElement)?.value.trim(); if (!number) { showToast("Enter a phone number"); return; } const call: SupportCall = { id: `CALL-${Date.now()}`, number, status: "In progress", result: "Active", date: new Date().toISOString(), started: Date.now(), duration: "00:00" }; setCalls((currentCalls) => [call, ...currentCalls]); setActiveCallId(call.id); setCallStarted(call.started || Date.now()); setModal("call"); showToast("In-app call started"); };
  const endCall = () => { if (!activeCallId) return; setCalls((currentCalls) => currentCalls.map((call) => call.id === activeCallId ? { ...call, status: "Completed", result: "Completed", ended: Date.now(), duration: callDuration } : call)); setActiveCallId(null); setCallStarted(null); setCommunicationTab("log"); showToast("Call ended and saved to call log"); };
  const renderCall = () => communicationTab === "log" ? <div className="card"><div className="card-title">Call log</div>{calls.length ? calls.map((call) => <button className="email-row" style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer" }} key={call.id} onClick={() => { setSelectedCall(call); setModal("call"); }}><div><strong>{call.number}</strong><span>{call.status} · {call.duration}</span></div><span className="email-status sent">{call.result}</span><small>{formatDate(call.date.slice(0, 10))}</small></button>) : <div className="empty">No calls logged yet.</div>}</div> : <div className="card"><div className="card-title">Internet call<small>Call stays inside the ERP interface. Live internet calling requires a voice/WebRTC provider and signalling service.</small></div><div className="field"><label>Number</label><input id="support-call-number" placeholder="08061234567" /></div><div className="row-actions"><button className="btn btn-primary" onClick={startCall}>☎ Call</button></div></div>;

  const sendWhatsapp = () => { const number = (document.getElementById("support-wa-number") as HTMLInputElement)?.value.trim(); const body = (document.getElementById("support-wa-body") as HTMLTextAreaElement)?.value.trim(); const file = (document.getElementById("support-wa-file") as HTMLInputElement)?.files?.[0]; if (!number || (!body && !file)) { showToast("Number and message or attachment are required"); return; } const save = (attachment: string) => { const message: WhatsAppMessage = { id: `WA-${Date.now()}`, chatId: number, to: number, body, attachment, attachmentName: file?.name || "", from: "agent", status: "Sent", date: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; setWhatsappMessages((currentMessages) => [message, ...currentMessages]); setActiveWhatsappId(number); showToast("WhatsApp message saved in chat"); }; attachmentToDataUrl(file, save); };
  const renderWhatsapp = () => { const groups = whatsappMessages.reduce<Record<string, WhatsAppMessage[]>>((grouped, message) => { const key = message.chatId || message.to || message.from; grouped[key] = [...(grouped[key] || []), message]; return grouped; }, {}); if (communicationTab === "log") return <div className="card"><div className="card-title">WhatsApp chat log</div>{Object.keys(groups).length ? Object.keys(groups).map((key) => <button className="email-row" style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer" }} key={key} onClick={() => { setActiveWhatsappId(key); setCommunicationTab("compose"); }}><div><strong>{key}</strong><span>{groups[key][groups[key].length - 1].body || "Attachment"}</span></div><span className="email-status sent">{groups[key].length} msg</span><small>{formatDate(groups[key][groups[key].length - 1].date.slice(0, 10))}</small></button>) : <div className="empty">No WhatsApp messages yet.</div>}</div>; const activeMessages = activeWhatsappId ? whatsappMessages.filter((message) => message.chatId === activeWhatsappId) : []; return <div className="card"><div className="card-title">WhatsApp<small>Messages stay inside the ERP. Connect WhatsApp Business Cloud API/webhooks for real inbound and outbound WhatsApp traffic.</small></div><div className="field"><label>To</label><input id="support-wa-number" defaultValue={activeWhatsappId} placeholder="2348061472153" /></div><div style={{ minHeight: 180, maxHeight: 320, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 12, margin: "10px 0" }}>{activeMessages.length ? activeMessages.map((message) => <div key={message.id} style={{ margin: "7px 0", textAlign: message.from === "customer" ? "left" : "right" }}><span style={{ display: "inline-block", maxWidth: "80%", padding: "8px 11px", borderRadius: 10, background: message.from === "customer" ? "var(--surface2)" : "var(--blue-dim)" }}>{message.attachment && <div>📎 {message.attachmentName}</div>}{message.body}</span><div className="note">{message.time}</div></div>) : <div className="empty">No messages in this chat yet.</div>}</div><div className="field"><label>Message</label><textarea id="support-wa-body" style={{ minHeight: 100, width: "100%" }} placeholder="Type WhatsApp message" /></div><div className="row-actions"><label className="btn" style={{ cursor: "pointer" }}>📎 Attach file<input id="support-wa-file" type="file" style={{ display: "none" }} /></label><button className="btn btn-primary" onClick={sendWhatsapp}>Send WhatsApp</button></div></div>; };

  const saveTemplate = () => { if (!templateForm.name.trim()) return; const nextTemplates = selectedTemplate ? emailTemplates.map((template) => template === selectedTemplate ? { ...templateForm, id: template.id } : template) : [{ ...templateForm, id: `tpl-${Date.now()}` }, ...emailTemplates]; setEmailTemplates(nextTemplates); closeModal(); showToast(selectedTemplate ? "Template saved" : "Template added"); };
  const selectedSupportTab = currentTab.support || "tickets";
  const body = currentView === "email" ? renderEmail() : currentView === "sms" ? renderSms() : currentView === "call" ? renderCall() : currentView === "whatsapp" ? renderWhatsapp() : selectedSupportTab === "tickets" ? renderTickets() : selectedSupportTab === "chat" ? renderChat() : selectedSupportTab === "team" ? renderTeamChat() : renderKnowledgeBase();
  const modeTitle = currentView === "email" ? "Email" : currentView === "sms" ? "SMS" : currentView === "call" ? "Call" : currentView === "whatsapp" ? "WhatsApp" : "Support";
  const modeDescription = currentView === "email" ? "Send, receive, organize and manage email without leaving the ERP." : currentView === "sms" ? "Send and track SMS from the same ERP." : currentView === "call" ? "Make and log customer calls without leaving the ERP." : currentView === "whatsapp" ? "Manage WhatsApp conversations from the ERP." : "Tickets, live chat and knowledge base.";
  const modeTabs = currentView === "email" ? emailTabs : currentView === "sms" ? smsTabs : currentView === "call" ? callTabs : currentView === "whatsapp" ? whatsappTabs : [];

  return <>
    <div className="view-head"><div><h1>{modeTitle}</h1><p>{modeDescription}</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{currentView === "email" && <button className="btn btn-primary" onClick={() => setCommunicationTab("compose")}>＋ Compose Email</button>}{currentView === "support" && selectedSupportTab === "tickets" && <button className="btn btn-primary" onClick={() => showToast("New ticket form is a stub in this prototype")}>＋ New ticket</button>}{currentView === "support" && selectedSupportTab === "kb" && <button className="btn btn-primary" onClick={() => showToast("Add article form is a stub in this prototype")}>＋ Add article</button>}</div></div>
    {currentView === "support" ? <div className="tabs">{supportTabs.map(([key, label]) => <div className={`tab${selectedSupportTab === key ? " active" : ""}`} key={key} onClick={() => selectSupportTab(key)}>{label}</div>)}</div> : <div className="tabs">{modeTabs.map((tab) => <div className={`tab${communicationTab === tab ? " active" : ""}`} key={tab} onClick={() => setCommunicationTab(tab)}>{tab === "inbox" ? "Inbox" : tab === "sent" ? "Sent" : tab === "drafts" ? "Drafts" : tab === "templates" ? "Templates" : tab === "dialer" ? "Call" : tab === "log" ? currentView === "call" ? "Call log" : "Chat log" : "Compose"}</div>)}</div>}
    {body}
    {modal === "email" && selectedEmail && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal"><div className="modal-head"><h3>{selectedEmail.subject}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="doc-grid"><div><div className="lbl">To</div>{selectedEmail.to}</div><div style={{ textAlign: "right" }}><div className="lbl">Status</div>{selectedEmail.status}</div></div><div className="lbl" style={{ marginTop: 14 }}>Message</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginTop: 6 }}>{selectedEmail.body}</div></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button>{selectedEmail.status === "Draft" && <button className="btn btn-primary" onClick={() => { setEmailForm({ to: selectedEmail.to, cc: selectedEmail.cc, bcc: selectedEmail.bcc, subject: selectedEmail.subject, body: selectedEmail.body, invoiceNo: selectedEmail.invoiceNo, attachment: selectedEmail.attachment, attachmentName: selectedEmail.attachmentName }); closeModal(); setCommunicationTab("compose"); }}>Edit draft</button>}</div></div></div>}
    {modal === "template" && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal"><div className="modal-head"><h3>{selectedTemplate ? "Edit template" : "New template"}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="field"><label>Name</label><input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></div><div className="field"><label>Subject</label><input value={templateForm.subject} onChange={(event) => setTemplateForm({ ...templateForm, subject: event.target.value })} /></div><div className="field"><label>Body</label><textarea style={{ minHeight: 220, width: "100%" }} value={templateForm.body} onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })} /></div><div className="note">Available variables: {"{{customer}}, {{invoice}}, {{tracking}}"}</div></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveTemplate}>Save template</button></div></div></div>}
    {modal === "call" && selectedCall && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal"><div className="modal-head"><h3>Call details</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="doc-grid"><div><div className="lbl">Number</div>{selectedCall.number}</div><div style={{ textAlign: "right" }}><div className="lbl">Status</div>{selectedCall.status}</div></div><p><b>Result:</b> {selectedCall.result}</p><p><b>Duration:</b> {selectedCall.duration}</p><p><b>Date:</b> {selectedCall.date}</p></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button></div></div></div>}
    {activeCallId && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>Internet call</h3></div><div className="modal-body" style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 800 }}>{calls.find((call) => call.id === activeCallId)?.number}</div><div className="note">Call in progress · {callDuration}</div></div><div className="modal-foot"><button className="btn btn-danger" onClick={endCall}>☎ End call</button></div></div></div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
