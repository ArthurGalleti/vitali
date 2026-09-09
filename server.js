const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = 3000;

// ======================================================
// GEMINI
// ======================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("ERRO: GEMINI_API_KEY não encontrada no arquivo .env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

// ======================================================
// UPLOAD
// ======================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("O arquivo precisa ser uma imagem."));
        }

        cb(null, true);
    }
});

// ======================================================
// FRONTEND
// ======================================================

app.use(express.static(__dirname));

// ======================================================
// ESPERAR
// ======================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// ANALISAR IMAGEM
// ======================================================

async function analyzeWithGemini(base64Image, mimeType) {

    const prompt = `
Analise esta foto de uma refeição.

Identifique somente os alimentos que realmente aparecem na imagem.

Estime as porções e os valores nutricionais.

Retorne SOMENTE um JSON válido neste formato:

{
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "confidence": 0,
    "foods": [
        ["Nome do alimento", "porção estimada", "calorias kcal"]
    ]
}

Regras:

- calories deve ser um número inteiro.
- protein deve ser um número.
- carbs deve ser um número.
- fat deve ser um número.
- confidence deve ser um número entre 0 e 100.
- foods deve ser uma lista.
- Cada alimento deve estar no formato:
  ["nome", "porção", "calorias"]
- Não invente alimentos que não estejam visíveis.
- As porções são estimativas.
- Não escreva explicações.
- Não use Markdown.
- Retorne somente o JSON.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json"
        }
    });

    return response.text;
}

// ======================================================
// LIMPAR JSON
// ======================================================

function cleanJson(text) {

    if (!text) {
        throw new Error("O Gemini não retornou nenhum resultado.");
    }

    let cleaned = text.trim();

    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
    }

    if (cleaned.startsWith("```")) {
        cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    return cleaned.trim();
}

// ======================================================
// NORMALIZAR RESULTADO
// ======================================================

function normalizeResult(data) {

    const foods = Array.isArray(data.foods)
        ? data.foods
        : [];

    return {
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        confidence: Number(data.confidence) || 0,

        foods: foods.map(food => {

            if (Array.isArray(food)) {
                return [
                    String(food[0] || ""),
                    String(food[1] || ""),
                    String(food[2] || "")
                ];
            }

            if (typeof food === "object" && food !== null) {

                const calories = Number(food.calorias) || 0;

                return [
                    String(food.nome || ""),
                    String(food.porcao || ""),
                    calories + " kcal"
                ];
            }

            return [
                String(food),
                "",
                ""
            ];
        })
    };
}

// ======================================================
// API DE ANÁLISE
// ======================================================

app.post(
    "/api/analyze",
    upload.single("image"),
    async (req, res) => {

        console.log("");
        console.log("====================================");
        console.log("Nova análise");
        console.log("====================================");

        try {

            // Verificar imagem

            if (!req.file) {

                console.log("Nenhuma imagem recebida.");

                return res.status(400).json({
                    error: "Nenhuma imagem foi enviada."
                });
            }

            console.log(
                "Imagem recebida:",
                req.file.originalname
            );

            console.log(
                "Tipo:",
                req.file.mimetype
            );

            console.log(
                "Tamanho:",
                (req.file.size / 1024 / 1024).toFixed(2) + " MB"
            );

            // Converter imagem para Base64

            const base64Image =
                req.file.buffer.toString("base64");

            const mimeType =
                req.file.mimetype;

            // ==================================================
            // TENTATIVAS
            // ==================================================

            const maxAttempts = 3;

            let lastError = null;

            for (
                let attempt = 1;
                attempt <= maxAttempts;
                attempt++
            ) {

                try {

                    console.log(
                        "Tentativa " +
                        attempt +
                        "/" +
                        maxAttempts
                    );

                    const text =
                        await analyzeWithGemini(
                            base64Image,
                            mimeType
                        );

                    console.log(
                        "Resposta recebida do Gemini."
                    );

                    const cleaned =
                        cleanJson(text);

                    let parsed;

                    try {

                        parsed =
                            JSON.parse(cleaned);

                    } catch (error) {

                        console.error(
                            "Resposta inválida:"
                        );

                        console.error(cleaned);

                        return res.status(500).json({
                            error:
                                "O Gemini retornou um JSON inválido."
                        });
                    }

                    const result =
                        normalizeResult(parsed);

                    console.log(
                        "Resultado:",
                        result
                    );

                    console.log(
                        "Análise concluída!"
                    );

                    return res.json(result);

                } catch (error) {

                    lastError = error;

                    const message =
                        error &&
                        error.message
                            ? error.message
                            : String(error);

                    console.error(
                        "Erro:",
                        message
                    );

                    const temporaryError =
                        message.includes("503") ||
                        message.includes("UNAVAILABLE") ||
                        message.includes("429") ||
                        message.includes("RESOURCE_EXHAUSTED") ||
                        message.includes("high demand");

                    if (!temporaryError) {
                        break;
                    }

                    if (attempt < maxAttempts) {

                        const wait =
                            attempt * 3000;

                        console.log(
                            "Gemini temporariamente indisponível."
                        );

                        console.log(
                            "Tentando novamente em " +
                            (wait / 1000) +
                            " segundos..."
                        );

                        await sleep(wait);
                    }
                }
            }

            // ==================================================
            // ERRO 503
            // ==================================================

            const finalMessage =
                lastError &&
                lastError.message
                    ? lastError.message
                    : String(lastError);

            if (
                finalMessage.includes("503") ||
                finalMessage.includes("UNAVAILABLE") ||
                finalMessage.includes("high demand")
            ) {

                return res.status(503).json({
                    error:
                        "O Gemini está temporariamente sobrecarregado. Tente novamente em alguns segundos."
                });
            }

            // ==================================================
            // ERRO 429
            // ==================================================

            if (
                finalMessage.includes("429") ||
                finalMessage.includes("RESOURCE_EXHAUSTED")
            ) {

                return res.status(429).json({
                    error:
                        "O limite da API do Gemini foi atingido."
                });
            }

            // ==================================================
            // OUTRO ERRO
            // ==================================================

            return res.status(500).json({
                error:
                    "Erro ao analisar a imagem: " +
                    finalMessage
            });

        } catch (error) {

            console.error(
                "Erro interno:",
                error
            );

            return res.status(500).json({
                error:
                    "Erro interno ao analisar a imagem."
            });
        }
    }
);

// ======================================================
// ERROS DO MULTER
// ======================================================

app.use((error, req, res, next) => {

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                error:
                    "A imagem deve ter no máximo 10 MB."
            });
        }

        return res.status(400).json({
            error:
                "Erro no upload da imagem."
        });
    }

    if (error) {

        console.error(
            "Erro de upload:",
            error.message
        );

        return res.status(400).json({
            error:
                error.message
        });
    }

    next();
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(port, () => {

    console.log("");
    console.log("====================================");
    console.log("          VITALI.IA");
    console.log("====================================");
    console.log(
        "Servidor: http://localhost:" + port
    );
    console.log(
        "Gemini: conectado"
    );
    console.log(
        "Modelo: gemini-3.6-flash"
    );
    console.log("====================================");
    console.log("");
});