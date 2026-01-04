export class NetClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.onAction = null;
    this.room = "default";
    this.cid = Math.random().toString(36).slice(2);
    this.token = "";
  }
  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => { this.connected = true; };
      this.ws.onclose = () => { this.connected = false; };
      this.ws.onerror = () => { this.connected = false; };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && this.onAction) this.onAction(msg);
        } catch { }
      };
    } catch { }
  }
  send(action) {
    if (!this.connected || !this.ws) return;
    try {
      this.ws.send(JSON.stringify(action));
    } catch { }
  }
  join(room, token) {
    this.room = room;
    this.token = token;
    if (!this.connected) return;
    const payload = { t: "join", room, cid: this.cid, token };
    this.send(payload);
  }
}
