import sys, json, time
sys.path.insert(0, ".")
import sbq
def q(s, _t=8):
    for i in range(_t):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
# find the new-DB section root nodes (siblings of תורה/נביאים/כתובים) by title
NAMES = ['איך לומדים','נושאים כלליים','מועדים','הפטרות','ימי עיון','כלי עזר','מוקלט',
         'ליווי','ניווט','פרשת השבוע','פרשת שבוע']
ors = " OR ".join(f"s.title LIKE '%{n}%'" for n in NAMES)
rows = q(f"""SELECT s.id, s.title, s.parent_id, s.status, s.audience_tags,
  (SELECT COUNT(*) FROM series c WHERE c.parent_id=s.id) kids,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub
  FROM series s WHERE ({ors}) AND s.parent_id IS NULL ORDER BY s.title""")
print("section ROOT nodes (parent_id NULL):")
print(json.dumps(rows, ensure_ascii=False, indent=1))
# also: what are the actual top-level series nodes (parent_id NULL)?
print("\nALL top-level (parent_id NULL) series — the sidebar roots:")
print(json.dumps(q("""SELECT id,title,(SELECT COUNT(*) FROM series c WHERE c.parent_id=series.id) kids
  FROM series WHERE parent_id IS NULL ORDER BY title"""), ensure_ascii=False, indent=1))
