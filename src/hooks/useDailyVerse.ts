import { useQuery } from "@tanstack/react-query";

interface CalendarItem {
  title: { en: string; he: string };
  displayValue: { en: string; he: string };
  url: string;
  ref: string;
  category: string;
  order: number;
}

interface DailyLearning {
  tanakhYomi: { ref: string; heRef: string; text: string[] } | null;
  parashat: { ref: string; heRef: string } | null;
  haftarah: { ref: string; heRef: string } | null;
  perek929: { ref: string; heRef: string; text: string[] } | null;
}

async function fetchCalendars(): Promise<DailyLearning> {
  const res = await fetch("https://www.sefaria.org/api/calendars");
  const data = await res.json();
  const items: CalendarItem[] = data.calendar_items || [];

  const tanakh = items.find((i) => i.title.en === "Tanakh Yomi");
  const parashat = items.find((i) => i.title.en === "Parashat Hashavua");
  const haftarah = items.find((i) => i.title.en === "Haftarah");
  const p929 = items.find((i) => i.title.en === "929");

  // Fetch actual text for Tanakh Yomi
  let tanakhText: string[] = [];
  if (tanakh?.ref) {
    try {
      const textRes = await fetch(
        `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(tanakh.ref)}?version=hebrew`
      );
      const textData = await textRes.json();
      const versions = textData.versions || [];
      if (versions.length > 0) {
        const raw = versions[0].text;
        tanakhText = Array.isArray(raw) ? raw.flat() : [String(raw)];
      }
    } catch {
      // Fallback: no text
    }
  }

  // Fetch text for 929
  let p929Text: string[] = [];
  if (p929?.ref) {
    try {
      const textRes = await fetch(
        `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(p929.ref)}?version=hebrew`
      );
      const textData = await textRes.json();
      const versions = textData.versions || [];
      if (versions.length > 0) {
        const raw = versions[0].text;
        p929Text = Array.isArray(raw) ? raw.flat() : [String(raw)];
      }
    } catch {
      // Fallback: no text
    }
  }

  return {
    tanakhYomi: tanakh ? { ref: tanakh.ref, heRef: tanakh.displayValue?.he || tanakh.ref, text: tanakhText } : null,
    parashat: parashat ? { ref: parashat.ref, heRef: parashat.displayValue?.he || parashat.ref } : null,
    haftarah: haftarah ? { ref: haftarah.ref, heRef: haftarah.displayValue?.he || haftarah.ref } : null,
    perek929: p929 ? { ref: p929.ref, heRef: p929.displayValue?.he || p929.ref, text: p929Text } : null,
  };
}

export function useDailyLearning() {
  return useQuery({
    queryKey: ["daily-learning"],
    queryFn: fetchCalendars,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 4, // 4 hours
  });
}
