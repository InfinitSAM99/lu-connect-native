import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const apiKey = process.env.AI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "AI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // 1. Fetch Help Articles from Supabase to give the AI context
    let dynamicDocs = "";
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: articles } = await supabase.from('help_articles').select('category, title, content');
      
      if (articles && articles.length > 0) {
        dynamicDocs = "Here are the official LU Connect Help Articles:\n\n";
        articles.forEach(article => {
          dynamicDocs += `[Category: ${article.category}]\nTitle: ${article.title}\nContent: ${article.content}\n\n`;
        });
      }
    }

    dynamicDocs += `ABOUT THE CREATOR: LU CONNECT was created by Samuel Mugasia, known on the app as "JuiceWRLD sam". Contact: 0725303245.`;

    // 2. Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", 
        messages: [
          { 
            role: "system", 
            content: `You are the LU Assistant for LU Connect, a campus social network for Kenyan university students. You are helpful, friendly, and concise. Use the following official documentation to answer the user's questions:\n\n${dynamicDocs}` 
          },
          ...messages
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
