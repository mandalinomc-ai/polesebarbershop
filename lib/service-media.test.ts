import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SERVICES } from "./catalog";
import { SERVICE_MEDIA, getServiceMedia, serviceMediaExists } from "./service-media";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");
const IMAGE_DIR = join(process.cwd(), "public", "images");

describe("service-media", () => {
  it("maps all 10 bookable services to official media paths", () => {
    expect(Object.keys(SERVICE_MEDIA).sort()).toEqual(SERVICES.map((s) => s.id).sort());
    expect(SERVICE_MEDIA["taglio-pro"]?.src).toBe("/video/taglio-01.mp4");
    expect(SERVICE_MEDIA["taglio-standard"]?.src).toBe("/video/taglio-02.mp4");
    expect(SERVICE_MEDIA["barba-pro"]?.src).toBe("/images/barba-pro.jpg");
    expect(SERVICE_MEDIA["barba-standard"]?.src).toBe("/images/barba-standard.jpg");
    expect(SERVICE_MEDIA["decolorazione-cutanea"]?.src).toBe("/video/decolorazione-cute.mp4");
    expect(SERVICE_MEDIA["tintura-barba"]?.src).toBe("/images/tintura-barba.jpg");
  });

  it("returns null when optional photo or decolorazione-cute clip is missing", () => {
    if (!existsSync(join(IMAGE_DIR, "barba-pro.jpg"))) {
      expect(getServiceMedia("barba-pro")).toBeNull();
    }
    if (!existsSync(join(VIDEO_DIR, "decolorazione-cute.mp4"))) {
      expect(getServiceMedia("decolorazione-cutanea")).toBeNull();
    }
    expect(getServiceMedia("taglio-pro")).not.toBeNull();
    expect(serviceMediaExists(SERVICE_MEDIA["taglio-pro"]!)).toBe(true);
  });
});
