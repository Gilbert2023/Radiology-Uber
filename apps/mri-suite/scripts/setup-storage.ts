// One-time: create (or verify) the private Supabase Storage bucket for patient documents.
import "./loadenv";
import { ensureBucket } from "../src/server/storage";
ensureBucket().then((m) => console.log(m)).catch((e) => { console.error(e.message); process.exit(1); });
