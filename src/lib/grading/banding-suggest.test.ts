import { describe, it, expect } from "vitest";
import { suggestBand } from "./banding-suggest";

describe("suggestBand", () => {
  it("anchors the top job to the CEO band", () => {
    expect(
      suggestBand({ careerPath: "M", managesPeople: true, managementLayers: 3, contribution: "leading", isTopJob: true }).band,
    ).toBe("ceo");
  });

  it("first-level people management → supervisory", () => {
    expect(
      suggestBand({ careerPath: "M", managesPeople: true, managementLayers: 1, contribution: "leading" }).band,
    ).toBe("supervisory");
  });

  it("managing managers → senior management", () => {
    expect(
      suggestBand({ careerPath: "M", managesPeople: true, managementLayers: 3, contribution: "leading" }).band,
    ).toBe("senior_manager");
  });

  it("IC performing tasks → clerical", () => {
    expect(
      suggestBand({ careerPath: "IC", managesPeople: false, managementLayers: 0, contribution: "tasks" }).band,
    ).toBe("clerical");
  });

  it("IC applying expertise → professional", () => {
    expect(
      suggestBand({ careerPath: "IC", managesPeople: false, managementLayers: 0, contribution: "expertise" }).band,
    ).toBe("professional");
  });

  it("IC deep authority → expert", () => {
    expect(
      suggestBand({ careerPath: "IC", managesPeople: false, managementLayers: 0, contribution: "leading" }).band,
    ).toBe("expert");
  });

  it("always returns reasoning text", () => {
    const s = suggestBand({ careerPath: "IC", managesPeople: false, managementLayers: 0, contribution: "expertise" });
    expect(s.reasoning.length).toBeGreaterThan(0);
  });
});
