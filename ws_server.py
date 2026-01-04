import socket, threading, base64, hashlib, json, hmac, time

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
SECRET = b"mini-royale-secret"

clients = {}
rooms = {}

def sha1_b64(key):
    return base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()

def recv_line(conn):
    data = b""
    while b"\r\n\r\n" not in data:
        chunk = conn.recv(1024)
        if not chunk:
            break
        data += chunk
    return data

def parse_headers(data):
    lines = data.decode(errors="ignore").split("\r\n")
    headers = {}
    for ln in lines[1:]:
        if ":" in ln:
            k,v = ln.split(":",1)
            headers[k.strip().lower()] = v.strip()
    return lines[0], headers

def send_handshake(conn, accept):
    resp = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept}\r\n"
        "\r\n"
    )
    conn.send(resp.encode())

def read_frame(conn):
    h = conn.recv(2)
    if not h:
        return None
    b1, b2 = h[0], h[1]
    opcode = b1 & 0x0F
    masked = (b2 & 0x80) != 0
    length = b2 & 0x7F
    if length == 126:
        l = conn.recv(2)
        length = int.from_bytes(l, "big")
    elif length == 127:
        l = conn.recv(8)
        length = int.from_bytes(l, "big")
    mask = conn.recv(4) if masked else None
    payload = b""
    while len(payload) < length:
        chunk = conn.recv(length - len(payload))
        if not chunk:
            break
        payload += chunk
    if masked and mask:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return opcode, payload

def send_text(conn, text):
    data = text.encode()
    header = bytearray()
    header.append(0x81)
    l = len(data)
    if l <= 125:
        header.append(l)
    elif l <= 65535:
        header.append(126)
        header += l.to_bytes(2, "big")
    else:
        header.append(127)
        header += l.to_bytes(8, "big")
    conn.send(header + data)

def sign(payload):
    return hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()

def verify(token, payload):
    try:
        obj = json.loads(payload)
    except:
        return False
    exp = obj.get("exp", 0)
    if int(time.time()) > int(exp):
        return False
    expected = sign(payload)
    return hmac.compare_digest(expected, token)

def client_thread(conn, addr):
    cid = f"{addr[0]}:{addr[1]}"
    try:
        data = recv_line(conn)
        line, headers = parse_headers(data)
        key = headers.get("sec-websocket-key")
        if not key:
            conn.close()
            return
        accept = sha1_b64(key)
        send_handshake(conn, accept)
        
        clients[cid] = {"conn": conn, "room": "default", "joined": time.time()}
        room = "default"
        
        while True:
            fr = read_frame(conn)
            if not fr: break
            opcode, payload = fr
            if opcode == 0x8: break
            if opcode == 0x1:
                try:
                    msg = json.loads(payload.decode())
                except: continue
                
                t = msg.get("t")
                if t == "join":
                    r = msg.get("room", "default")
                    token = msg.get("token", "")
                    exp = msg.get("exp", int(time.time()) + 300)
                    pl = json.dumps({"cid": msg.get("cid", ""), "room": r, "exp": exp})
                    
                    if not verify(token, pl):
                        send_text(conn, json.dumps({"t": "error", "m": "Invalid or expired token"}))
                        continue
                    
                    # Leave old room
                    if room in rooms and cid in rooms[room]:
                        rooms[room].remove(cid)
                    
                    room = r
                    if room not in rooms:
                        rooms[room] = set()
                    rooms[room].add(cid)
                    clients[cid]["room"] = room
                    clients[cid]["exp"] = exp
                    
                    send_text(conn, json.dumps({
                        "t": "joined", 
                        "room": room, 
                        "cid": cid,
                        "exp": exp
                    }))
                    print(f"[ROOM] {cid} joined {room} (Exp: {time.ctime(exp)})")
                    
                elif t == "list":
                    room_list = []
                    for rname, rmembers in rooms.items():
                        if rmembers:
                            room_list.append({"name": rname, "count": len(rmembers)})
                    send_text(conn, json.dumps({"t": "rooms", "list": room_list}))
                
                else:
                    if room in rooms:
                        for ocid in list(rooms[room]):
                            if ocid == cid: continue
                            c_info = clients.get(ocid)
                            if c_info:
                                try:
                                    send_text(c_info["conn"], payload.decode())
                                except: pass
    except Exception as e:
        print(f"[ERR] {cid}: {e}")
    finally:
        if cid in clients:
            r = clients[cid]["room"]
            if r in rooms and cid in rooms[r]:
                rooms[r].remove(cid)
            del clients[cid]
        try: conn.close()
        except: pass
        print(f"[DISC] {cid}")

def run():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", 8080))
    s.listen(16)
    while True:
        conn, addr = s.accept()
        threading.Thread(target=client_thread, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    run()
