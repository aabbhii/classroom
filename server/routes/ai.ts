import { Router, Request, Response } from 'express';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

export const aiRouter = Router();

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/* =========================================================================
   1. TRANSCRIBE AUDIO (gemini-3.5-transcribe)
========================================================================= */
aiRouter.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType, prompt } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key to use real-time audio transcription.',
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioData,
      },
    };

    const textPrompt = prompt || 'Please transcribe this classroom recording accurately into clean formatted text.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: textPrompt }],
      },
    });

    return res.json({
      transcription: response.text || '',
    });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to transcribe audio',
    });
  }
});

/* =========================================================================
   2. GENERATE VIDEO FROM TEXT (veo-3.1-fast-generate-preview)
========================================================================= */

// Step 1: Start Video Generation
aiRouter.post('/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, resolution } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for video generation' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key to use Veo video generation.',
      });
    }

    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution || '720p',
        aspectRatio: validAspectRatio,
      },
    });

    return res.json({
      operationName: operation.name,
      prompt,
      aspectRatio: validAspectRatio,
    });
  } catch (error: any) {
    console.error('Video generation initiation error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to start video generation',
    });
  }
});

// Step 2: Poll Video Status
aiRouter.post('/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    return res.json({
      done: updated.done,
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error('Video status check error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to poll video status',
    });
  }
});

// Step 3: Stream Completed Video Back
aiRouter.post('/video-download', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: 'Generated video URI not ready or not found' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    const videoRes = await fetch(uri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: 'Failed to retrieve video stream from Google' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="generated_classroom_video.mp4"');

    if (videoRes.body) {
      videoRes.body.pipeTo(
        new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          },
          abort(err) {
            console.error('Stream aborted', err);
            res.end();
          },
        })
      );
    } else {
      const buffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error('Video download proxy error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to stream video',
    });
  }
});
