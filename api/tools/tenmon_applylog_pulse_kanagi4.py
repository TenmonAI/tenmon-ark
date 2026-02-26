import json, sqlite3, uuid, urllib.request, fcntl, os

BASE_URL="http://127.0.0.1:3000"
DB="/opt/tenmon-ark-data/kokuzo.sqlite"
QUEUE="/var/tmp/tenmon_applylog_queue_kanagi4.txt"

def take_and_rotate():
  # lock the queue file (avoid timer overlap)
  fd=os.open(QUEUE, os.O_RDWR)
  fcntl.flock(fd, fcntl.LOCK_EX)
  try:
    data=os.read(fd, 1_000_000).decode("utf-8", errors="replace").splitlines()
    items=[x.strip() for x in data if x.strip() and "|" in x]
    if not items:
      raise SystemExit("FATAL: empty queue")
    head=items[0]
    rest=items[1:]+[head]   # rotate
    os.lseek(fd, 0, os.SEEK_SET)
    os.ftruncate(fd, 0)
    os.write(fd, ("\n".join(rest)+"\n").encode("utf-8"))
    return head
  finally:
    fcntl.flock(fd, fcntl.LOCK_UN)
    os.close(fd)

phase_line = take_and_rotate()
phase, msg = phase_line.split("|", 1)
msg = msg.strip()

payload={"message": msg, "modeHint":"NATURAL", "threadId":"auto-applylog-kanagi4"}
req=urllib.request.Request(
  BASE_URL + "/api/chat",
  data=json.dumps(payload).encode("utf-8"),
  headers={"Content-Type":"application/json"},
  method="POST"
)
resp=urllib.request.urlopen(req, timeout=20).read()
obj=json.loads(resp.decode("utf-8", errors="replace"))

df=obj.get("decisionFrame") or {}
ku=(df.get("ku") or {})
routeReason=str(ku.get("routeReason") or "KHS_DEF_VERIFIED_HIT")
lawsUsed=ku.get("lawsUsed") or []
lawKey=str(lawsUsed[0]) if lawsUsed else ""

unitId=""
if lawKey.startswith("KHSL:LAW:"):
  parts=lawKey.split(":")
  if len(parts)>=4:
    unitId=":".join(parts[2:])

# write apply_log only when KHS route and has a lawKey
con=sqlite3.connect(DB)
cur=con.cursor()

if routeReason.startswith("KHS_") and lawKey:
  applyId="APPLY:"+uuid.uuid4().hex[:16]
  decision_json=json.dumps({"decisionFrame": df}, ensure_ascii=False)
  delta_json=json.dumps({"phase": phase, "input": msg, "modeHint": payload["modeHint"]}, ensure_ascii=False)
  cur.execute(
    "INSERT INTO khs_apply_log (applyId, threadId, turnId, mode, deltaSJson, lawKey, unitId, applyOp, decisionJson, routeReason) VALUES (?,?,?,?,?,?,?,?,?,?)",
    (applyId, payload["threadId"], phase, payload["modeHint"], delta_json, lawKey, unitId, "OP_DEFINE", decision_json, routeReason)
  )
  con.commit()

cnt=cur.execute("SELECT COUNT(*) FROM khs_apply_log").fetchone()[0]
con.close()

print("phase=", phase)
print("routeReason=", routeReason)
print("lawKey=", lawKey)
print("COUNT=", cnt)
