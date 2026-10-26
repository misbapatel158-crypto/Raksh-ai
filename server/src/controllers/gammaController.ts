import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  EMERGENCY_TEMPLATES,
  synthesizeSlides,
  generateViaGammaApi,
  getPresentationHistory,
  savePresentationRecord,
  deletePresentationRecord,
  PresentationRecord,
  GammaGenerateParams,
} from "../services/gammaService";

/**
 * GET /api/gamma/status
 * Returns Gamma configuration, supported languages, styles, and templates
 */
export async function getGammaStatus(req: Request, res: Response): Promise<void> {
  const isApiConfigured = Boolean(process.env.GAMMA_API_KEY && process.env.GAMMA_API_KEY.trim().length > 0);

  res.status(200).json({
    success: true,
    data: {
      isApiConfigured,
      serviceName: "Gamma AI Presentation Studio",
      supportedLanguages: [
        { code: "en", name: "English", label: "English" },
        { code: "hi", name: "Hindi", label: "हिंदी (Hindi)" },
        { code: "mr", name: "Marathi", label: "मराठी (Marathi)" },
      ],
      supportedStyles: [
        { id: "professional", label: "Professional", description: "Structured, formal, institutional emergency layout" },
        { id: "modern", label: "Modern", description: "High-contrast, sleek visual presentation" },
        { id: "minimal", label: "Minimal", description: "Clean, high-legibility typographic cards" },
        { id: "cinematic", label: "Cinematic", description: "Dramatic, high-impact storytelling and visual cues" },
      ],
      templates: EMERGENCY_TEMPLATES,
      manualFallbackUrl: "https://gamma.app/new",
    },
  });
}

/**
 * POST /api/gamma/generate
 * Generates presentation via Gamma API if key exists, or prepares structured prompt for manual Gamma generation
 */
export async function generatePresentation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { topic, description, slideCount, language, style } = req.body;

    // Server-side input validation
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: "A valid presentation topic with at least 3 characters is required.",
      });
      return;
    }

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      res.status(400).json({
        success: false,
        message: "A presentation description with at least 5 characters is required.",
      });
      return;
    }

    const validSlideCount = Number(slideCount);
    if (isNaN(validSlideCount) || validSlideCount < 3 || validSlideCount > 25) {
      res.status(400).json({
        success: false,
        message: "Slide count must be a number between 3 and 25.",
      });
      return;
    }

    const validLanguages = ["en", "hi", "mr"];
    const selectedLang = (language || "en").toLowerCase();
    if (!validLanguages.includes(selectedLang)) {
      res.status(400).json({
        success: false,
        message: "Supported languages are English ('en'), Hindi ('hi'), and Marathi ('mr').",
      });
      return;
    }

    const validStyles = ["professional", "modern", "minimal", "cinematic"];
    const selectedStyle = (style || "professional").toLowerCase();
    if (!validStyles.includes(selectedStyle)) {
      res.status(400).json({
        success: false,
        message: "Supported styles are 'professional', 'modern', 'minimal', or 'cinematic'.",
      });
      return;
    }

    const params: GammaGenerateParams = {
      topic: topic.trim(),
      description: description.trim(),
      slideCount: validSlideCount,
      language: selectedLang as "en" | "hi" | "mr",
      style: selectedStyle as "professional" | "modern" | "minimal" | "cinematic",
      userId: (req as any).user?.id || null,
    };

    // 1. Synthesize structured slide breakdown and rich prompt
    const { slides, promptText } = synthesizeSlides(params);

    const hasApiKey = Boolean(process.env.GAMMA_API_KEY && process.env.GAMMA_API_KEY.trim().length > 0);

    // 2. If API Key is present, attempt genuine Gamma API call
    if (hasApiKey) {
      const apiResult = await generateViaGammaApi(params, promptText);

      if (apiResult.success) {
        const record: PresentationRecord = {
          id: `gamma-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          userId: params.userId,
          topic: params.topic,
          description: params.description,
          slideCount: params.slideCount,
          language: params.language,
          style: params.style,
          mode: "api",
          gammaUrl: apiResult.gammaUrl || null,
          exportUrl: apiResult.exportUrl || null,
          generationId: apiResult.generationId || null,
          prompt: promptText,
          slides,
          status: apiResult.status === "completed" ? "completed" : "pending",
          createdAt: new Date().toISOString(),
        };

        savePresentationRecord(record);

        res.status(200).json({
          success: true,
          mode: "api",
          message:
            apiResult.status === "completed"
              ? "Presentation created successfully on Gamma AI!"
              : "Presentation creation initiated on Gamma AI. Processing...",
          data: {
            id: record.id,
            status: record.status,
            gammaUrl: apiResult.gammaUrl,
            exportUrl: apiResult.exportUrl,
            generationId: apiResult.generationId,
            prompt: promptText,
            slides,
            topic: params.topic,
            slideCount: params.slideCount,
            language: params.language,
            style: params.style,
          },
        });
        return;
      } else {
        // If API key failed or threw an error (e.g. rate limit, invalid key, tier restricted),
        // cleanly fall back to manual copy workflow with full diagnostic explanation
        console.warn("Gamma API generation failed, falling back to manual prompt workflow:", apiResult.error);
        const record: PresentationRecord = {
          id: `gamma-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          userId: params.userId,
          topic: params.topic,
          description: params.description,
          slideCount: params.slideCount,
          language: params.language,
          style: params.style,
          mode: "manual_prompt",
          gammaUrl: null,
          prompt: promptText,
          slides,
          status: "manual_ready",
          createdAt: new Date().toISOString(),
        };

        savePresentationRecord(record);

        res.status(200).json({
          success: true,
          mode: "manual_prompt",
          apiNotice: `Live Gamma API responded: ${apiResult.error || "Unable to complete automatic generation"}. Switched to manual copy workflow.`,
          message: "Presentation prompt prepared! You can copy the prompt and open Gamma to generate your slides.",
          data: {
            id: record.id,
            status: "manual_ready",
            gammaWebUrl: "https://gamma.app/new",
            prompt: promptText,
            slides,
            topic: params.topic,
            slideCount: params.slideCount,
            language: params.language,
            style: params.style,
          },
        });
        return;
      }
    }

    // 3. If API Key is NOT configured in backend environment:
    // Follow explicit prompt instructions: Provide copyable prompt + Open Gamma button without pretending automatic external generation
    const record: PresentationRecord = {
      id: `gamma-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      userId: params.userId,
      topic: params.topic,
      description: params.description,
      slideCount: params.slideCount,
      language: params.language,
      style: params.style,
      mode: "manual_prompt",
      gammaUrl: null,
      prompt: promptText,
      slides,
      status: "manual_ready",
      createdAt: new Date().toISOString(),
    };

    savePresentationRecord(record);

    res.status(200).json({
      success: true,
      mode: "manual_prompt",
      isApiConfigured: false,
      message:
        "Presentation outline and prompt ready! Copy the structured prompt and click 'Open Gamma' to create your presentation.",
      data: {
        id: record.id,
        status: "manual_ready",
        gammaWebUrl: "https://gamma.app/new",
        prompt: promptText,
        slides,
        topic: params.topic,
        description: params.description,
        slideCount: params.slideCount,
        language: params.language,
        style: params.style,
        instructions: [
          "1. Click 'Copy Presentation Prompt' below.",
          "2. Click 'Open Gamma' to navigate to gamma.app/new.",
          "3. Select 'Paste in text' or 'Generate' in Gamma.",
          "4. Paste your prompt to generate your presentation immediately.",
        ],
      },
    });
  } catch (error: any) {
    next(error);
  }
}

/**
 * GET /api/gamma/history
 * Returns saved presentation records
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  const history = getPresentationHistory();
  res.status(200).json({
    success: true,
    data: {
      presentations: history,
      total: history.length,
    },
  });
}

/**
 * DELETE /api/gamma/history/:id
 * Deletes a presentation record by ID
 */
export async function deleteHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ success: false, message: "Presentation ID is required." });
    return;
  }

  const deleted = deletePresentationRecord(id);
  if (deleted) {
    res.status(200).json({ success: true, message: "Presentation record deleted." });
  } else {
    res.status(404).json({ success: false, message: "Presentation record not found." });
  }
}
