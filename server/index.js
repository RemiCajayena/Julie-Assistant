import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "fs";
import multer from "multer";
import { OpenAI } from "openai";


const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1", // o "gpt-4o-transcribe" si lo tienes
      // language: "es",
    });
    fs.unlink(filePath, () => {});
    res.json({ text: resp.text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    // MVP: responde amable y breve (en español)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres Julie, una asistente breve y amable. Responde en español." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? "No tengo respuesta.";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("API listening on :3000"));
