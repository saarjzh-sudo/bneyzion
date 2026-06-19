import sys, json, time
sys.path.insert(0, ".")
import sbq
def q(s):
    for i in range(10):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"):
                time.sleep(1.5*(i+1)); continue
            return d
        except Exception:
            time.sleep(1.5*(i+1))
    return []
print("defaults for NOT NULL cols:")
print(json.dumps(q("""SELECT column_name, column_default, data_type FROM information_schema.columns
  WHERE table_name='lessons' AND column_name IN
  ('id','source_type','status','views_count','created_at','updated_at','audience_tags','sort_order','content_type')
  ORDER BY column_name"""), ensure_ascii=False, indent=1))
print("\nsample published attachment lessons (source_type / content_type):")
print(json.dumps(q("""SELECT source_type, content_type, COUNT(*) n FROM lessons
  WHERE attachment_url IS NOT NULL AND status='published'
  GROUP BY source_type, content_type ORDER BY n DESC LIMIT 8"""), ensure_ascii=False, indent=1))
