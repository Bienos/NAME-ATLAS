import { describe, expect, it } from "vitest";
import { landingMetadata, SITE_COPY } from "./site-metadata.js";

describe("landing link metadata", () => {
  it("shares the Polish landing at its configured public origin", () => {
    const metadata = landingMetadata("pl", "https://name-atlas.pl");
    expect(metadata.title).toBe(SITE_COPY.pl.title);
    expect(metadata.alternates?.canonical).toBe("https://name-atlas.pl/");
    expect(metadata.openGraph).toMatchObject({
      url: "https://name-atlas.pl/",
      locale: "pl_PL",
      siteName: "Name Atlas",
      type: "website",
      description: SITE_COPY.pl.description,
      images: [
        {
          url: "https://name-atlas.pl/share/name-atlas-v4.jpg",
          width: 1200,
          height: 630,
          type: "image/jpeg",
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["https://name-atlas.pl/share/name-atlas-v4.jpg"],
      title: SITE_COPY.pl.title,
      description: SITE_COPY.pl.description,
    });
  });

  it("keeps the English landing and its language alternatives on the same domain", () => {
    const metadata = landingMetadata("en", "https://name-atlas.pl");
    expect(metadata.alternates).toEqual({
      canonical: "https://name-atlas.pl/?lang=en",
      languages: {
        "pl-PL": "https://name-atlas.pl/",
        "en-GB": "https://name-atlas.pl/?lang=en",
        "x-default": "https://name-atlas.pl/",
      },
    });
    expect(metadata.openGraph).toMatchObject({
      title: SITE_COPY.en.title,
      locale: "en_GB",
      url: "https://name-atlas.pl/?lang=en",
    });
  });

  it("leaves canonical paths relative until SITE_ORIGIN is configured", () => {
    expect(landingMetadata("pl", null).alternates?.canonical).toBe("/");
    expect(landingMetadata("en", null).alternates?.canonical).toBe("/?lang=en");
  });
});
