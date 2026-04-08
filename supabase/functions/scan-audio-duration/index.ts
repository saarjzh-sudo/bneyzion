import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MP3 bitrate lookup tables (MPEG1 Layer3)
const MPEG1_L3_BITRATES = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0];
const MPEG2_L3_BITRATES = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0];

function parseMp3FrameHeader(bytes: Uint8Array): { bitrate: number; sampleRate: number } | null {
  // Find sync word (0xFF 0xE0+)
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      
      const mpegVersion = (b1 >> 3) & 0x03; // 00=2.5, 01=reserved, 10=2, 11=1
      const layer = (b1 >> 1) & 0x03;        // 01=Layer3
      const bitrateIdx = (b2 >> 4) & 0x0F;
      const sampleRateIdx = (b2 >> 2) & 0x03;
      
      if (bitrateIdx === 0 || bitrateIdx === 15 || sampleRateIdx === 3) continue;
      
      let bitrate: number;
      if (mpegVersion === 3) { // MPEG1
        bitrate = MPEG1_L3_BITRATES[bitrateIdx];
      } else { // MPEG2/2.5
        bitrate = MPEG2_L3_BITRATES[bitrateIdx];
      }
      
      const sampleRates: Record<number, number[]> = {
        3: [44100, 48000, 32000],  // MPEG1
        2: [22050, 24000, 16000],  // MPEG2
        0: [11025, 12000, 8000],   // MPEG2.5
      };
      const sampleRate = sampleRates[mpegVersion]?.[sampleRateIdx] || 44100;
      
      if (bitrate > 0) return { bitrate: bitrate * 1000, sampleRate };
    }
  }
  return null;
}

async function getAudioDuration(url: string): Promise<number | null> {
  try {
    // Clean URL (some have tab characters from migration)
    const cleanUrl = url.replace(/\t/g, '').trim();
    
    // HEAD request for file size
    const headResp = await fetch(cleanUrl, { method: "HEAD", redirect: "follow" });
    if (!headResp.ok) return null;
    
    const contentLength = parseInt(headResp.headers.get("content-length") || "0");
    if (contentLength === 0) return null;
    
    // Fetch first 16KB to find MP3 frame header (skip ID3 tags)
    const rangeResp = await fetch(cleanUrl, {
      headers: { Range: "bytes=0-16383" },
      redirect: "follow",
    });
    if (!rangeResp.ok && rangeResp.status !== 206) {
      // Fallback: assume 128kbps
      return Math.round(contentLength * 8 / 128000);
    }
    
    const buffer = new Uint8Array(await rangeResp.arrayBuffer());
    const frame = parseMp3FrameHeader(buffer);
    
    const bitrate = frame?.bitrate || 128000; // fallback 128kbps
    const durationSec = Math.round(contentLength * 8 / bitrate);
    
    return durationSec > 0 ? durationSec : null;
  } catch (e) {
    console.error(`Error scanning ${url}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse batch size from request (default 50)
    const { batch_size = 50, series_id } = await req.json().catch(() => ({}));
    const limit = Math.min(batch_size, 100);

    // Query lessons with audio but no duration
    let query = supabase
      .from("lessons")
      .select("id, audio_url, video_url")
      .is("duration", null)
      .not("audio_url", "is", null)
      .limit(limit);
    
    if (series_id) {
      query = query.eq("series_id", series_id);
    }

    const { data: lessons, error } = await query;
    if (error) throw error;

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({ message: "No lessons to scan", updated: 0, total_remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let failed = 0;
    const results: { id: string; title?: string; duration: number | null; error?: string }[] = [];

    // Process in parallel with concurrency limit
    const CONCURRENCY = 10;
    for (let i = 0; i < lessons.length; i += CONCURRENCY) {
      const batch = lessons.slice(i, i + CONCURRENCY);
      const promises = batch.map(async (lesson) => {
        const url = lesson.audio_url || lesson.video_url;
        if (!url) return;
        
        const duration = await getAudioDuration(url);
        if (duration && duration > 0) {
          const { error: updateErr } = await supabase
            .from("lessons")
            .update({ duration })
            .eq("id", lesson.id);
          
          if (!updateErr) {
            updated++;
            results.push({ id: lesson.id, duration });
          } else {
            failed++;
            results.push({ id: lesson.id, duration: null, error: updateErr.message });
          }
        } else {
          failed++;
          results.push({ id: lesson.id, duration: null, error: "Could not determine duration" });
        }
      });
      await Promise.all(promises);
    }

    // Count remaining
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .is("duration", null)
      .not("audio_url", "is", null);

    return new Response(
      JSON.stringify({
        message: `Scanned ${lessons.length} lessons`,
        updated,
        failed,
        total_remaining: count,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scan-audio-duration error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
