import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface LoraParameter {
    model: string;
    weight: number;
}

interface ImageGenPayload {
    baseModelName: string;
    imageSeed: string;
    aspectRatiosSelection: string;
    performanceSelection: "Speed" | "Quality" | "Extreme Speed";
    prompt: string;
    imageNumber?: number;
    guidanceScale?: number;
    sharpness?: number;
    enablePreviewImages?: boolean;
    loraParameters?: LoraParameter[];
    styleSelections?: string[];
    negativePrompt?: string;
    refinerSwitch?: number;
    refinerModelName?: string;
}

export const generateImage = async (
    payload: ImageGenPayload,
    outputfilename: string
) => {
    try {
        const res = await fetch("http://localhost:5000/image/gen", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.body) throw new Error("Response is not a stream.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const imageLocations = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value);

            try {
                const json = JSON.parse(buffer);
                const locations = handleImageGenResponseJson(
                    json,
                    outputfilename
                );
                if (Array.isArray(locations)) {
                    imageLocations.push(...locations);
                }

                buffer = "";
            } catch {
                if (buffer.includes("\n\n")) {
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop() || "";
                    for (const part of parts) {
                        try {
                            const json = JSON.parse(part);
                            const locations = handleImageGenResponseJson(
                                json,
                                outputfilename
                            );
                            if (Array.isArray(locations)) {
                                imageLocations.push(...locations);
                            }
                        } catch (e) {
                            console.warn("Could not parse JSON chunk:", e);
                        }
                    }
                }
            }
        }

        return imageLocations;

        // if (!res.ok) {
        //     const errorData = await res.json();
        //     console.error("Server Error:", errorData);
        //     return;
        // }

        // const data = await res.json();
        // console.log("Response:", data);
    } catch (err) {
        console.error("Request failed:", err);
    }
};

const saveImageData = (imageData: any, outputfilename: string) => {
    const match = imageData.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid base64 image format");
    }

    const mimeType = match[1]; // e.g. image/png
    const base64Data = match[2];
    const extension = mimeType.split("/")[1]; // e.g. png
    // const filename = `${uuidv4()}.${extension}`;
    const filename = `${outputfilename}-${uuidv4()}.${extension}`;
    const outputPath = path.join(__dirname, "generated_images", filename);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write file
    fs.writeFileSync(outputPath, Buffer.from(base64Data, "base64"));

    return outputPath;
};

const handleImageGenResponseJson = (json: any, outputfilename: string) => {
    switch (json.updateType) {
        case "results":
            if (json.imageData) {
                return [saveImageData(json.imageData, outputfilename)];
            }

            break;
        case "finished":
            if (json.imagesData?.length) {
                const images = [];
                for (const img of json.imagesData) {
                    images.push(saveImageData(img, outputfilename));
                }
                return images;
            }
            break;
        case "preview":
        case "init":
        default:
            break;
    }
};

// Example usage
// generateImage({
//     baseModelName: "example-model",
//     imageSeed: "abc123",
//     aspectRatiosSelection: "16:9",
//     performanceSelection: "Quality",
//     prompt: "A futuristic city at sunset",
//     imageNumber: 1,
//     guidanceScale: 5,
//     sharpness: 2,
//     enablePreviewImages: true,
//     loraParameters: [{ model: "myLoraModel", weight: 0.75 }],
//     styleSelections: ["cyberpunk"],
//     negativePrompt: "low quality",
//     refinerSwitch: 0.5,
//     refinerModelName: "refiner-v1",
// });
