const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  
  if (!urlMatch || !keyMatch) {
    console.log("Could not find Supabase vars");
    return;
  }
  
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  const { data, error } = await supabase.from('posts').select('id, title, status').order('created_at', { ascending: false }).limit(1);
  
  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  
  console.log("Latest Post:", data[0]);
  
  // Try to hit the local route to see if Next.js throws an error
  const fetchHtml = await fetch(`http://localhost:3000/p/${data[0].id}`);
  const html = await fetchHtml.text();
  
  console.log(`\nHTTP Status: ${fetchHtml.status}`);
  const ogTags = html.match(/<meta\s+property="og:[^>]+>/g);
  if (ogTags) {
    console.log("Open Graph Tags found:");
    ogTags.forEach(tag => console.log(tag));
  } else {
    console.log("NO Open Graph Tags found!");
    // Check if title exists
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    console.log("Title found:", titleMatch ? titleMatch[1] : "None");
  }
}

check();
